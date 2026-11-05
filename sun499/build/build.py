#!/usr/bin/env python3
"""Build pipeline for "499 — What If the Sun Vanished".

    python3 build/build.py prep     # trim/measure VO -> build/work/vo/*.wav + vo.json
    python3 build/build.py base     # clips -> out/sun_499_noCaptions.mp4 (video only first)
    python3 build/build.py audio    # VO + SFX mix -> build/work/mix.wav
    python3 build/build.py final    # base + overlay + mix -> out/sun_499_final.mp4
    python3 build/build.py srt      # out/captions.srt
    python3 build/build.py check    # print timing report / loudness
    python3 build/build.py all

Run from the sun499/ directory. Needs ffmpeg, numpy, scipy, pillow.
"""
import json
import math
import os
import subprocess
import sys
from functools import lru_cache

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy.io import wavfile
from scipy.signal import resample_poly

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
os.chdir(ROOT)

import timeline as TL  # noqa: E402
import sfx  # noqa: E402

SR = 48000
WORK = "build/work"
OUT = "out"
FONT = "fonts/Anton-Regular.ttf"
EMOJI_FONT = "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"
NFRAMES = int(round(TL.DURATION * TL.FPS))


def sh(cmd, **kw):
    print("+", " ".join(cmd) if isinstance(cmd, list) else cmd, flush=True)
    subprocess.run(cmd, check=True, **kw)


# ======================================================================
# VO preparation
# ======================================================================
def load_mono(path):
    sr, x = wavfile.read(path)
    x = x.astype(np.float32)
    if x.dtype.kind in "iu" or np.abs(x).max() > 2:
        x /= 32768.0
    if x.ndim > 1:
        x = x.mean(axis=1)
    if sr != SR:
        g = math.gcd(sr, SR)
        x = resample_poly(x, SR // g, sr // g).astype(np.float32)
    return x


def frame_db(x, hop=0.005, win=0.02):
    h, w = int(hop * SR), int(win * SR)
    n = max(1, (len(x) - w) // h + 1)
    idx = np.arange(w)[None, :] + h * np.arange(n)[:, None]
    rms = np.sqrt((x[idx] ** 2).mean(axis=1) + 1e-12)
    return 20 * np.log10(rms), hop


def segments(x, thr_db=-38.0, min_gap=0.06, min_len=0.05, min_peak=-20.0):
    """Speech segments [(start, end)] in seconds, relative to peak level.
    Segments that never get louder than `min_peak` dB (breaths, mouth noise
    before the first word) are dropped."""
    db, hop = frame_db(x)
    db -= db.max()
    on = db > thr_db
    segs, start = [], None
    for i, v in enumerate(on):
        t = i * hop
        if v and start is None:
            start = t
        if not v and start is not None:
            segs.append([start, t])
            start = None
    if start is not None:
        segs.append([start, len(on) * hop])
    merged = []
    for s in segs:
        if merged and s[0] - merged[-1][1] < min_gap:
            merged[-1][1] = s[1]
        else:
            merged.append(s)
    keep = []
    for a, b in merged:
        if b - a < min_len:
            continue
        if db[int(a / hop):max(int(a / hop) + 1, int(b / hop))].max() < min_peak:
            continue
        keep.append([a, b])
    return keep


def prep():
    """Trim each VO line so sample 0 = first syllable, cap long internal
    pauses, split the countdown into words, and record word-level segment
    timings in vo.json (relative to the processed file)."""
    os.makedirs(f"{WORK}/vo", exist_ok=True)
    meta = {}
    files = sorted({v[0].split("#")[0] for v in TL.VO.values()})
    for path in files:
        if not os.path.exists(path):
            print(f"WARNING: missing {path}")
            continue
        x = load_mono(path)
        name = os.path.splitext(os.path.basename(path))[0]
        pauses = segments(x, thr_db=-42, min_gap=0.15)  # phrase level
        pre = int(0.012 * SR)  # keep 12 ms before the onset (consonant attack)
        if name.startswith("l07_countdown"):
            words = pauses
            for k, (s, e) in enumerate(words):
                a = max(0, int(s * SR) - pre)
                b = min(len(x), int((e + 0.12) * SR))
                y = fade(x[a:b])
                out = f"{WORK}/vo/{name}#{k}.wav"
                wavfile.write(out, SR, y.astype(np.float32))
                meta[f"{path}#{k}"] = dict(file=out, dur=len(y) / SR, onset=pre / SR,
                                           speech_end=(e - s) + pre / SR,
                                           words=[[pre / SR, (e - s) + pre / SR]])
            continue
        # rebuild with capped pauses
        max_pause = TL_MAX_PAUSE.get(name, 0.45)
        # first *loud* onset: skips breaths / mouth noise glued to word 1
        first = segments(x, thr_db=-30, min_gap=0.035, min_len=0.03)[0][0]
        pieces, cursor = [], max(0, int(max(pauses[0][0], first) * SR) - pre)
        for i, (s, e) in enumerate(pauses):
            a = max(cursor, int(s * SR) - pre) if i else cursor
            b = int(e * SR)
            pieces.append(x[a:b])
            if i + 1 < len(pauses):
                gap = pauses[i + 1][0] - e
                g = min(gap, max_pause)
                # keep the natural room tone of the gap, just shorter
                gs = int(e * SR)
                pieces.append(x[gs:gs + int(g * SR) - pre])
                cursor = int(pauses[i + 1][0] * SR) - pre
        tail = int(0.18 * SR)
        last_end = int(pauses[-1][1] * SR)
        pieces.append(x[last_end:last_end + tail])
        y = fade(np.concatenate(pieces))
        out = f"{WORK}/vo/{name}.wav"
        wavfile.write(out, SR, y.astype(np.float32))
        words = segments(y, thr_db=-30, min_gap=0.035, min_len=0.03)
        meta[path] = dict(file=out, dur=len(y) / SR, onset=words[0][0],
                          speech_end=segments(y, thr_db=-42, min_gap=0.15)[-1][1],
                          words=[[round(a, 3), round(b, 3)] for a, b in words])
    json.dump(meta, open(f"{WORK}/vo.json", "w"), indent=1)
    for vid, (path, at) in TL.VO.items():
        if path not in meta:
            continue
        m = meta[path]
        print(f"{vid:8s} at {at:6.2f}  dur {m['dur']:5.2f}  ends {at + m['speech_end']:6.2f}  "
              f"words {' '.join(f'{a:.2f}' for a, _ in m['words'])}")


TL_MAX_PAUSE = getattr(TL, "MAX_PAUSE", {})


def fade(y, ms=6):
    n = int(ms / 1000 * SR)
    y = y.copy()
    if len(y) > 2 * n:
        y[:n] *= np.linspace(0, 1, n)
        y[-n:] *= np.linspace(1, 0, n)
    return y


# ======================================================================
# Time resolution helpers
# ======================================================================
_VO_META = None


def vo_meta():
    global _VO_META
    if _VO_META is None:
        _VO_META = json.load(open(f"{WORK}/vo.json"))
    return _VO_META


def T(ref):
    """Resolve a timeline reference to seconds.
    number | ("vo", seconds after first syllable) | ("vo", "end")
    | ("vo", "wN") = onset of measured speech chunk N."""
    if ref is None:
        return None
    if isinstance(ref, (int, float)):
        return float(ref)
    vid, off = ref
    path, at = TL.VO[vid]
    m = vo_meta()[path]
    # `at` is the first-syllable time; the processed file has `onset` lead-in
    base = at - m["onset"]
    if off == "end":
        return base + m["speech_end"]
    if isinstance(off, str):
        return base + m["words"][int(off[1:])][0]
    return at + off


def frame_of(t):
    return int(round(t * TL.FPS))


# ======================================================================
# Base video (clips only)
# ======================================================================
def base():
    os.makedirs(OUT, exist_ok=True)
    inputs, chains, labels = [], [], []
    for i, c in enumerate(TL.CLIPS):
        inputs += ["-i", c["src"]]
        f = [f"[{i}:v]trim=start={c['t_in']}", "setpts=PTS-STARTPTS"]
        if c["speed"] != 1.0:
            # slow-mo with motion-blended frames instead of plain duplicates
            f.append(f"setpts=PTS/{c['speed']}")
            f.append(f"minterpolate=fps={TL.FPS}:mi_mode=blend")
        f.append(f"fps={TL.FPS}")
        f.append(f"scale={TL.W}:{TL.H}:flags=lanczos:force_original_aspect_ratio=increase")
        f.append(f"crop={TL.W}:{TL.H}")
        if c.get("grade"):
            # clip3 was rendered on a flat grey backdrop with a dark bar on the
            # left; crush the low-mids so it reads as black space again.
            f.append("curves=all='0/0 0.45/0.12 1/1'")
        f.append(f"trim=end_frame={c['frames']}")
        f.append("setpts=PTS-STARTPTS,setsar=1,format=yuv420p")
        chains.append(",".join(f) + f"[v{i}]")
        labels.append(f"[v{i}]")
    w0, w1 = TL.WHIP_AT - 2 / TL.FPS, TL.WHIP_AT + 2 / TL.FPS - 1e-3
    chains.append("".join(labels) + f"concat=n={len(labels)}:v=1:a=0,"
                  f"gblur=sigma=55:sigmaV=0.01:steps=3:enable='between(t,{w0:.4f},{w1:.4f})'[v]")
    sh(["ffmpeg", "-v", "error", "-y", *inputs,
        "-filter_complex", ";".join(chains), "-map", "[v]",
        "-frames:v", str(NFRAMES), "-r", str(TL.FPS),
        "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p",
        f"{WORK}/base_video.mp4"])


# ======================================================================
# Audio mix
# ======================================================================
def audio():
    n = int(TL.DURATION * SR)
    vo = np.zeros(n, np.float32)
    meta = vo_meta()
    for vid, (path, at) in TL.VO.items():
        m = meta[path]
        _, y = wavfile.read(m["file"])
        sfx.place(vo, y.astype(np.float32), at - m["onset"])
    # normalise the VO bus so its peaks sit at -3 dBFS before mixing
    vo *= 10 ** (-3 / 20) / (np.abs(vo).max() + 1e-9)

    bed = np.zeros(n, np.float32)
    zero = T(TL.SFX["hit_at"])
    d0, d1 = TL.SFX["drone"]
    dr = sfx.drone(d1 - d0)
    # drone dips to near-silence at zero
    sfx.place(bed, dr * 0.16, d0)
    hb = sfx.heartbeat()
    t = TL.SFX["heart_from"]
    while t < zero - 0.25:
        prog = (t - TL.SFX["heart_from"]) / (zero - TL.SFX["heart_from"])
        sfx.place(bed, hb, t, gain=0.10 + 0.15 * prog)
        t += 2.0 - 1.2 * prog          # ~2 s apart, speeding toward 0
    # duck the bed to near-silence right before zero, then the impact
    tt = np.arange(n) / SR
    pre = np.clip((zero - tt) / 0.15, 0, 1)   # 150 ms cut into silence
    bed *= np.where(tt < zero, np.sqrt(pre), 0.0).astype(np.float32)
    sfx.place(bed, sfx.bass_hit(), zero, 0.28)
    sfx.place(bed, sfx.glass_crack(), zero + 0.02, 0.14)
    sfx.place(bed, sfx.whoosh(1.6), zero + 0.05, 0.30)
    w0 = TL.SFX["wind_from"]
    sfx.place(bed, sfx.wind(TL.DURATION - w0) * 0.10, w0)
    # loop-friendly end: fade the bed in the last 0.4 s
    bed[-int(0.4 * SR):] *= np.linspace(1, 0, int(0.4 * SR))

    # sidechain: duck the bed by >= 6 dB wherever the voice is active
    env = np.abs(vo)
    env = sfx.lowpass(env, 6.0) * 3.0
    env = np.clip(env / (env.max() + 1e-9) * 4, 0, 1)
    duck = 1 - (1 - 10 ** (-8 / 20)) * env      # up to -8 dB
    bed *= duck.astype(np.float32)

    mix = vo + bed
    peak = np.abs(mix).max()
    mix *= 10 ** (-1.0 / 20) / peak             # peak at -1 dBFS
    stereo = np.stack([mix, mix], axis=1)
    wavfile.write(f"{WORK}/mix.wav", SR, stereo.astype(np.float32))
    print(f"peaks: VO {20*np.log10(np.abs(vo).max()):.1f} dBFS, "
          f"SFX bed {20*np.log10(np.abs(bed).max()):.1f} dBFS (pre-normalisation)")
    print(f"mix peak -> -1.0 dBFS (pre-norm peak {20*np.log10(peak):.2f} dBFS)")
    vo_rms = rms_db(vo[np.abs(vo) > 0.01])
    bed_rms = rms_db(bed[np.abs(vo) > 0.01])
    print(f"VO rms {vo_rms:.1f} dB vs bed rms under VO {bed_rms:.1f} dB "
          f"(VO louder by {vo_rms - bed_rms:.1f} dB)")


def rms_db(x):
    return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)


# ======================================================================
# Overlay graphics
# ======================================================================
CYAN = (79, 227, 255)
RED = (255, 59, 59)
WHITE = (255, 255, 255)


@lru_cache(maxsize=8)
def font(size):
    return ImageFont.truetype(FONT, size)


def is_emoji(ch):
    o = ord(ch)
    return o >= 0x1F000 or 0x2600 <= o <= 0x27BF


@lru_cache(maxsize=16)
def emoji_img(ch, height):
    f = ImageFont.truetype(EMOJI_FONT, 109)
    im = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((10, 10), ch, font=f, embedded_color=True)
    im = im.crop(im.getbbox())
    return im.resize((int(im.width * height / im.height), height), Image.LANCZOS)


def text_layer(text, size, fill, stroke, glow=None, squeeze=1.0, shadow=False):
    """Render text (Anton + colour emoji) to an RGBA image with stroke,
    optional outer glow and drop shadow."""
    f = font(size)
    asc, desc = f.getmetrics()
    runs, cur = [], ""
    for ch in text:
        if is_emoji(ch) or ch == "️":
            if ch == "️":
                continue
            if cur:
                runs.append(("t", cur))
                cur = ""
            runs.append(("e", ch))
        else:
            cur += ch
    if cur:
        runs.append(("t", cur))
    cap_h = f.getbbox("H")[3] - f.getbbox("H")[1]
    widths = []
    for kind, s in runs:
        if kind == "t":
            widths.append(int(f.getlength(s)))
        else:
            widths.append(emoji_img(s, int(cap_h * 1.15)).width + int(size * 0.12))
    pad = int(size * 0.5)
    W = sum(widths) + 2 * pad
    Hh = asc + desc + 2 * pad
    txt = Image.new("RGBA", (W, Hh), (0, 0, 0, 0))
    d = ImageDraw.Draw(txt)
    x = pad
    emo = []
    for (kind, s), w in zip(runs, widths):
        if kind == "t":
            d.text((x, pad), s, font=f, fill=fill + (255,), stroke_width=stroke,
                   stroke_fill=(0, 0, 0, 255))
        else:
            emo.append((x, s))
        x += w
    top = pad + f.getbbox("H")[1]
    for ex, s in emo:
        e = emoji_img(s, int(cap_h * 1.15))
        txt.alpha_composite(e, (ex, top + cap_h - e.height + int(cap_h * 0.08)))
    out = Image.new("RGBA", txt.size, (0, 0, 0, 0))
    if glow:
        a = txt.split()[3].filter(ImageFilter.GaussianBlur(size * 0.09))
        g = Image.new("RGBA", txt.size, glow + (0,))
        g.putalpha(a.point(lambda v: min(255, int(v * 1.6))))
        out.alpha_composite(g)
        a2 = txt.split()[3].filter(ImageFilter.GaussianBlur(size * 0.03))
        g2 = Image.new("RGBA", txt.size, glow + (0,))
        g2.putalpha(a2)
        out.alpha_composite(g2)
    if shadow:
        a = txt.split()[3].filter(ImageFilter.GaussianBlur(size * 0.05))
        s = Image.new("RGBA", txt.size, (0, 0, 0, 0))
        s.putalpha(a.point(lambda v: int(v * 0.75)))
        out.alpha_composite(s, (int(size * 0.04), int(size * 0.06)))
    out.alpha_composite(txt)
    out = out.crop(out.getbbox())
    if squeeze != 1.0:
        out = out.resize((max(1, int(out.width * squeeze)), out.height), Image.LANCZOS)
    return out


COUNTER_SIZE = 262          # Anton digits ~230 px tall
COUNTER_SQUEEZE = 0.84      # keep 3 digits inside the left third
COUNTER_CX = int(0.215 * TL.W)
COUNTER_CY = int(0.45 * TL.H)
CAPTION_SIZE = 104
CAPTION_CY = int(0.70 * TL.H)
CAPTION_CX = int(0.47 * TL.W)     # nudged left of centre, away from the right-side UI
CAPTION_MAXW = int(0.80 * TL.W)
CAPTION_SIZES = {"0": 240}        # the zero beat gets a big slam


@lru_cache(maxsize=1200)
def counter_img(value, red):
    col = RED if red else WHITE
    glow = (255, 40, 40) if red else CYAN
    return text_layer(str(value), COUNTER_SIZE, col, 2, glow=glow, squeeze=COUNTER_SQUEEZE)


@lru_cache(maxsize=64)
def caption_img(text):
    size = CAPTION_SIZES.get(text, CAPTION_SIZE)
    im = text_layer(text, size, WHITE, 6, shadow=True)
    while im.width > CAPTION_MAXW and size > 60:
        size -= 4
        im = text_layer(text, size, WHITE, 6, shadow=True)
    return im


def counter_track():
    """Integer counter value per frame."""
    keys = [(T(t), v, mode) for t, v, mode in TL.COUNTER]
    vals = np.zeros(NFRAMES, int)
    for f in range(NFRAMES):
        t = f / TL.FPS
        v = keys[0][1]
        for i, (kt, kv, mode) in enumerate(keys):
            if t >= kt:
                v = kv
                continue
            if mode == "ease" and i > 0:
                pt, pv, _ = keys[i - 1]
                u = (t - pt) / (kt - pt)
                u = u * u * (3 - 2 * u)
                v = pv + (kv - pv) * u
            break
        vals[f] = int(round(v))
    return vals


def caption_track():
    caps = []
    for i, (text, s, e) in enumerate(TL.CAPTIONS):
        st = T(s)
        if e is None:
            en = T(TL.CAPTIONS[i + 1][1])
        else:
            en = T(e)
            if isinstance(e, tuple) and e[1] == "end":
                en += TL.CAPTION_TAIL
        caps.append((text, st, en))
    # never overlap: cut a caption hard when the next one starts
    for i in range(len(caps) - 1):
        t, s, e = caps[i]
        caps[i] = (t, s, min(e, caps[i + 1][1]))
    return caps


def scrim_img(strength):
    w = int(0.50 * TL.W)
    x = np.linspace(0, 1, w)
    a = strength * np.clip(1 - x, 0, 1) ** 1.6
    alpha = (np.tile(a, (TL.H, 1)) * 255).astype(np.uint8)
    im = Image.new("RGBA", (w, TL.H), (0, 0, 0, 0))
    im.putalpha(Image.fromarray(alpha))
    return im


def overlay_frame(f, counter, caps, scrims):
    t = f / TL.FPS
    layer = Image.new("RGBA", (TL.W, TL.H), (0, 0, 0, 0))
    for s0, s1, strength in TL.SCRIM:
        if s0 <= t < s1:
            layer.alpha_composite(scrims[strength], (0, 0))
    # counter
    v = int(counter[f])
    red = t >= T(TL.RED_AT) and v == 0
    img = counter_img(v, red)
    scale = 1.0
    if t >= TL.PULSE_FROM:
        # find frames since the last integer change
        k = f
        while k > 0 and counter[k - 1] == counter[f]:
            k -= 1
        if k > 0:
            age = f - k
            pulse = [1.06, 1.045, 1.025, 1.01]
            if age < len(pulse):
                scale = pulse[age]
        if red and frame_of(T(TL.RED_AT)) <= f < frame_of(T(TL.RED_AT)) + 6:
            scale = [1.18, 1.12, 1.08, 1.05, 1.02, 1.0][f - frame_of(T(TL.RED_AT))]
    if scale != 1.0:
        img = img.resize((int(img.width * scale), int(img.height * scale)), Image.LANCZOS)
    layer.alpha_composite(img, (COUNTER_CX - img.width // 2, COUNTER_CY - img.height // 2))
    # caption
    for text, s, e in caps:
        fs, fe = frame_of(s), frame_of(e)
        if fs <= f < fe:
            ci = caption_img(text)
            age = f - fs
            sc = [0.85, 0.89, 0.93, 0.97][age] if age < 4 else 1.0
            if sc != 1.0:
                ci = ci.resize((int(ci.width * sc), int(ci.height * sc)), Image.LANCZOS)
            cx = CAPTION_CX
            layer.alpha_composite(ci, (cx - ci.width // 2, CAPTION_CY - ci.height // 2))
    return layer


def render(with_overlay=True, out_path=None):
    counter = counter_track()
    caps = caption_track()
    scrims = {s: scrim_img(s) for _, _, s in TL.SCRIM}
    shake_f = frame_of(T(TL.SHAKE_AT))
    flash_f = frame_of(T(TL.FLASH_AT))
    rng = np.random.default_rng(7)
    shake = {shake_f + i: (int(a * rng.uniform(-1, 1)), int(a * rng.uniform(-1, 1)))
             for i, a in enumerate([34, 28, 22, 15, 9, 4])}

    dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", f"{WORK}/base_video.mp4",
                            "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                           stdout=subprocess.PIPE)
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y",
                            "-f", "rawvideo", "-pix_fmt", "rgb24",
                            "-s", f"{TL.W}x{TL.H}", "-r", str(TL.FPS), "-i", "-",
                            "-i", f"{WORK}/mix.wav",
                            "-map", "0:v", "-map", "1:a",
                            "-c:v", "libx264", "-preset", "slow", "-crf", "18",
                            "-profile:v", "high", "-pix_fmt", "yuv420p",
                            "-movflags", "+faststart",
                            "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
                            "-t", str(TL.DURATION), out_path],
                           stdin=subprocess.PIPE)
    fsz = TL.W * TL.H * 3
    for f in range(NFRAMES):
        buf = dec.stdout.read(fsz)
        if len(buf) < fsz:
            raise SystemExit(f"base video ended early at frame {f}")
        frame = np.frombuffer(buf, np.uint8).reshape(TL.H, TL.W, 3)
        if with_overlay:
            im = Image.fromarray(frame).convert("RGBA")
            im.alpha_composite(overlay_frame(f, counter, caps, scrims))
            frame = np.asarray(im.convert("RGB"))
            if f in shake:  # camera shake on the whole composition
                dx, dy = shake[f]
                frame = np.pad(frame, ((40, 40), (40, 40), (0, 0)), mode="edge")
                frame = frame[40 + dy:40 + dy + TL.H, 40 + dx:40 + dx + TL.W]
            if f == flash_f:
                frame = (frame.astype(np.float32) * 0.15 + 255 * 0.85).astype(np.uint8)
            elif f == flash_f + 1:
                frame = (frame.astype(np.float32) * 0.6 + 255 * 0.4).astype(np.uint8)
        enc.stdin.write(np.ascontiguousarray(frame).tobytes())
    enc.stdin.close()
    enc.wait()
    dec.wait()
    if enc.returncode:
        raise SystemExit("encode failed")


def final():
    os.makedirs(OUT, exist_ok=True)
    render(True, f"{OUT}/sun_499_final.mp4")


def nocap():
    os.makedirs(OUT, exist_ok=True)
    sh(["ffmpeg", "-v", "error", "-y", "-i", f"{WORK}/base_video.mp4", "-i", f"{WORK}/mix.wav",
        "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "slow", "-crf", "18",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        "-c:a", "aac", "-b:a", "192k", "-t", str(TL.DURATION), f"{OUT}/sun_499_noCaptions.mp4"])


# ======================================================================
# SRT + report
# ======================================================================
def srt_time(t):
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


# Full spoken text per VO id, for platform captions
SPOKEN = {
    "gone": "The Sun just vanished. You have 499 seconds.",
    "lookup": "Look up. It's still there.",
    "light": "Light takes about 8 minutes 20 seconds to reach you.",
    "fight": "Now the fight. Does gravity vanish instantly?",
    "no": "Nope. Gravity moves at the speed of light.",
    "merger": "A 2017 neutron star merger confirmed it, to a few parts in a quadrillion.",
    "orbit": "So Earth keeps orbiting an empty spot. Same sky. Same warmth.",
    "ten": "10.", "five": "5.", "three": "3.", "two": "2.", "one": "1.",
    "zero": "Zero.",
    "after": "The light and the pull stop together. Earth flies off in a straight line.",
    "week": "Within a week, the average surface temperature is below freezing.",
    "argue": "Did gravity really wait? Argue below.",
}


def srt():
    os.makedirs(OUT, exist_ok=True)
    items = sorted(TL.VO, key=lambda k: TL.VO[k][1])
    lines = []
    for i, vid in enumerate(items):
        s = T((vid, 0.0))
        e = T((vid, "end")) + 0.25
        if i + 1 < len(items):
            e = min(e, T((items[i + 1], 0.0)) - 0.02)
        lines.append(f"{i + 1}\n{srt_time(s)} --> {srt_time(e)}\n{SPOKEN[vid]}\n")
    open(f"{OUT}/captions.srt", "w").write("\n".join(lines))
    print(f"wrote {OUT}/captions.srt ({len(lines)} cues)")


def check():
    print("--- VO placement (first syllable / speech end) ---")
    for vid, (path, at) in sorted(TL.VO.items(), key=lambda kv: kv[1][1]):
        print(f"  {vid:8s} {T((vid, 0.0)):6.2f} -> {T((vid, 'end')):6.2f}  frame {frame_of(T((vid, 0.0)))}")
    print("--- captions (frame in/out) ---")
    for text, s, e in caption_track():
        print(f"  {text:20s} {s:6.2f} -> {e:6.2f}   f{frame_of(s)}-{frame_of(e)}")
    c = counter_track()
    zf = int(np.argmax(c == 0))
    print(f"--- counter: frame0={c[0]}  hits 0 at frame {zf} ({zf / TL.FPS:.3f}s); "
          f"'zero' VO at frame {frame_of(T(('zero', 0.0)))}; last frame={c[-1]}")
    ends = [T((v, "end")) for v in TL.VO]
    assert max(ends) < TL.DURATION, "VO runs past the end"


def main():
    steps = sys.argv[1:] or ["all"]
    if steps == ["all"]:
        steps = ["prep", "base", "audio", "final", "nocap", "srt", "check"]
    for s in steps:
        globals()[s]()


if __name__ == "__main__":
    main()
