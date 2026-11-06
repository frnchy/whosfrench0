#!/usr/bin/env python3
"""Assemble one episode of the series into a finished vertical video.

Usage:  python src/build_episode.py episodes/episode_01.yaml

Steps
  1. Measure each narration file; shot length = narration + padding
     (and at least the script's target length if use_target_as_minimum).
  2. Render each shot to 1080x1920 / 30 fps:
       - needs <= clip/max_slowdown seconds: slow the clip down + motion interpolation
       - needs more: clip at max slowdown, then a slow Ken Burns push-in
         (1.00 -> 1.08) dissolved in from the clip's end.
  3. Join shots (hard cut 1->2, 0.4 s dissolves after), fade 8 to black,
     add the end card, apply one grade (contrast, vignette, grain).
  4. French subtitles (ASS burned in + SRT export), timed on the voice.
  5. Mix: narration at 0 dB, music around -19 dB, side-chain ducked under
     the voice, 1.5 s fade-in / 3 s fade-out.
"""
import json
import math
import re
import shutil
import subprocess
import sys
from pathlib import Path

import yaml
from PIL import ImageFont

ROOT = Path(__file__).resolve().parent.parent
W, H, FPS = 1080, 1920, 30
TMP = ROOT / "build"

SUB_FONT_FILE = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
SUB_FONT_NAME = "DejaVu Sans"
SUB_SIZE = 66
SUB_MAX_W = 800            # px per line: keeps text inside x 12%..86% (right 12% is UI)
SUB_Y = int(H * 0.65)      # vertical centre of the subtitle block
CARD_FONT_NAME = "Liberation Serif"


# --------------------------------------------------------------------------- utils
def run(cmd: list[str]) -> None:
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.stderr.write(r.stderr[-4000:])
        raise SystemExit(f"command failed: {' '.join(cmd[:6])} ...")


def duration(path: Path) -> float:
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                   "-of", "csv=p=0", str(path)], text=True)
    return float(out.strip())


def silences(path: Path, noise_db: float = -38, min_d: float = 0.12) -> list[tuple[float, float]]:
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-af",
                        f"silencedetect=noise={noise_db}dB:d={min_d}", "-f", "null", "-"],
                       capture_output=True, text=True)
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", r.stderr)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", r.stderr)]
    total = duration(path)
    if len(ends) < len(starts):
        ends.append(total)
    return list(zip(starts, ends))


def enc(fast: bool = True) -> list[str]:
    return ["-c:v", "libx264", "-preset", "veryfast", "-crf", "14" if fast else "20",
            "-pix_fmt", "yuv420p", "-r", str(FPS)]


# --------------------------------------------------------------------------- timing
def plan(cfg: dict) -> list[dict]:
    t = cfg["timing"]
    shots = []
    start = 0.0
    for i, s in enumerate(cfg["shots"]):
        narr = ROOT / s["narration"]
        if not narr.exists():
            raise SystemExit(f"missing narration {narr} - run src/tts.py first")
        nd = duration(narr)
        lead = 0.0 if i == 0 else t["lead_in"]
        need = lead + nd + t["pad_after_voice"]
        d = max(need, float(s.get("target", 0))) if t.get("use_target_as_minimum") else need
        slack = d - need
        voice_at = lead + slack * 0.3          # sit the line a little after the cut
        xf_in = 0.0 if i == 0 or s.get("transition_in") in ("cut", "none") else t["crossfade"]
        start = start - xf_in
        shots.append({**s, "dur": round(d, 3), "narr_dur": nd, "voice_offset": voice_at,
                      "xf_in": xf_in, "start": start})
        start += d
    return shots


# --------------------------------------------------------------------------- shots
def render_shot(s: dict, t: dict, idx: int) -> Path:
    out = TMP / f"shot_{idx:02d}.mp4"
    clip = ROOT / s["clip"]
    cd = duration(clip)
    d = s["dur"]
    max_len = cd / t["max_slowdown"]
    cover = f"scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H},setsar=1"
    interp = f"minterpolate=fps={FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1"

    if d <= max_len + 1e-3:
        factor = d / cd
        vf = (f"setpts={factor:.5f}*PTS,{interp}," if factor > 1.02 else f"fps={FPS},") + \
             f"{cover},trim=duration={d},setpts=PTS-STARTPTS"
        run(["ffmpeg", "-v", "error", "-y", "-i", str(clip), "-vf", vf, "-an", *enc(), str(out)])
        return out

    # clip slowed to the max, then Ken Burns on a frame, dissolved in
    part1 = TMP / f"shot_{idx:02d}_a.mp4"
    run(["ffmpeg", "-v", "error", "-y", "-i", str(clip), "-vf",
         f"setpts={1 / t['max_slowdown']:.5f}*PTS,{interp},{cover}", "-an", *enc(), str(part1)])
    p1 = duration(part1)
    xf = 0.8
    kb_len = d - p1 + xf
    src = t.get("extend_source", "last_frame")
    if src == "still" and s.get("still") and (ROOT / s["still"]).exists():
        img = ROOT / s["still"]
    else:
        img = TMP / f"shot_{idx:02d}_last.png"
        run(["ffmpeg", "-v", "error", "-y", "-sseof", "-0.15", "-i", str(clip), "-frames:v", "1",
             "-update", "1", str(img)])
    n = int(math.ceil(kb_len * FPS)) + 2
    zmax = 1.08
    part2 = TMP / f"shot_{idx:02d}_b.mp4"
    kb = (f"scale={W * 2}:{H * 2}:force_original_aspect_ratio=increase:flags=lanczos,crop={W * 2}:{H * 2},"
          f"zoompan=z='1+{zmax - 1:.3f}*on/{n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
          f":d={n}:s={W}x{H}:fps={FPS},setsar=1")
    run(["ffmpeg", "-v", "error", "-y", "-loop", "1", "-i", str(img), "-vf", kb,
         "-frames:v", str(n), *enc(), str(part2)])
    run(["ffmpeg", "-v", "error", "-y", "-i", str(part1), "-i", str(part2), "-filter_complex",
         f"[0:v][1:v]xfade=transition=fade:duration={xf}:offset={p1 - xf:.3f},"
         f"trim=duration={d},setpts=PTS-STARTPTS[v]", "-map", "[v]", *enc(), str(out)])
    return out


# --------------------------------------------------------------------------- subtitles
def ass_time(x: float) -> str:
    cs = int(round(x * 100))
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


def srt_time(x: float) -> str:
    ms = int(round(x * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def protect(text: str) -> str:
    """Glue French punctuation to its word so a line never starts with ':' or '»'."""
    text = re.sub(r"«\s+", "« ", text)
    text = re.sub(r"\s+([»:;?!])", " \\1", text)
    return text


def chunk_text(text: str, font: ImageFont.FreeTypeFont) -> list[list[str]]:
    """Split a line into subtitle cues of 1-2 lines, each line <= SUB_MAX_W px."""
    words = protect(text).split(" ")

    def wrap(ws: list[str]) -> list[str]:
        lines, cur = [], ""
        for w in ws:
            cand = (cur + " " + w).strip()
            if font.getlength(cand) <= SUB_MAX_W or not cur:
                cur = cand
            else:
                lines.append(cur)
                cur = w
        if cur:
            lines.append(cur)
        return lines

    # 1) phrases: break after strong punctuation, and after commas
    phrases, cur = [], []
    for w in words:
        cur.append(w)
        if re.search(r"[.…?!:»,]$", w):
            phrases.append(cur)
            cur = []
    if cur:
        phrases.append(cur)
    # glue a phrase ending in a comma to the next one if both fit on 2 short lines
    merged = []
    for p in phrases:
        if merged and merged[-1][-1].endswith(",") and len(merged[-1]) <= 2 \
                and len(wrap(merged[-1] + p)) <= 2:
            merged[-1] = merged[-1] + p
        else:
            merged.append(p)
    # 2) each phrase -> as few cues as needed, words split evenly
    cues = []
    for p in merged:
        k = 1
        while True:
            size = math.ceil(len(p) / k)
            parts = [p[i:i + size] for i in range(0, len(p), size)]
            if all(len(wrap(x)) <= 2 for x in parts):
                break
            k += 1
        cues.extend(parts)
    # balance the two lines of each cue
    out = []
    for c in cues:
        lines = wrap(c)
        if len(lines) == 2:
            best = min(range(1, len(c)), key=lambda k: abs(font.getlength(" ".join(c[:k])) -
                                                            font.getlength(" ".join(c[k:]))))
            a, b = " ".join(c[:best]), " ".join(c[best:])
            if font.getlength(a) <= SUB_MAX_W and font.getlength(b) <= SUB_MAX_W:
                lines = [a, b]
        out.append(lines)
    return out


def cue_times(narr: Path, cues: list[list[str]]) -> list[tuple[float, float]]:
    """Time each cue inside the narration file.

    With ElevenLabs alignment json: exact character times.
    Otherwise: spread characters over the voiced parts of the file and snap
    cue boundaries to the nearest pause.
    """
    texts = [" ".join(c) for c in cues]

    # Word timestamps from speech-to-text (ElevenLabs Scribe / whisper), if present
    words_file = narr.with_suffix(".words.json")
    if words_file.exists():
        spoken = [w for w in json.loads(words_file.read_text())["words"]
                  if w.get("type", "word") == "word" and re.search(r"\w", w["text"])]
        per_cue = [[tok for tok in re.split(r"[  ]", tx) if re.search(r"\w", tok)] for tx in texts]
        if sum(len(p) for p in per_cue) == len(spoken):
            res, k = [], 0
            for p in per_cue:
                res.append((spoken[k]["start"], spoken[k + len(p) - 1]["end"]))
                k += len(p)
            return res
        print(f"  note: {words_file.name} does not match the script word count, estimating timings")

    align = narr.with_suffix(".json")
    if align.exists():
        a = json.loads(align.read_text())
        chars, st, en = a["characters"], a["start"], a["end"]
        res, pos = [], 0
        flat = "".join(chars).replace(" ", " ")
        for tx in texts:
            plain = tx.replace(" ", " ")
            k = flat.find(plain.split(" ")[0], pos)
            k = pos if k < 0 else k
            e = min(k + len(plain), len(en)) - 1
            res.append((st[k], en[e]))
            pos = e + 1
        return res

    total = duration(narr)
    sil = silences(narr)
    head = sil[0][1] if sil and sil[0][0] < 0.05 else 0.0
    tail = sil[-1][0] if sil and sil[-1][1] >= total - 0.05 else total
    gaps = [(a, b) for a, b in sil if a > head + 0.05 and b < tail - 0.05]
    # voiced timeline
    voiced, cur = [], head
    for a, b in gaps:
        voiced.append((cur, a))
        cur = b
    voiced.append((cur, tail))
    vtot = sum(b - a for a, b in voiced)

    def v2t(v: float) -> float:
        for a, b in voiced:
            if v <= b - a:
                return a + v
            v -= b - a
        return tail

    weights = [len(re.sub(r"[^\w]", "", tx)) for tx in texts]
    wsum = sum(weights)
    bounds, acc = [head], 0
    for w in weights[:-1]:
        acc += w
        t = v2t(vtot * acc / wsum)
        # snap to a pause if one is close
        near = min(gaps, key=lambda g: abs((g[0] + g[1]) / 2 - t), default=None)
        if near and abs((near[0] + near[1]) / 2 - t) < 0.6:
            t = near[1]
        bounds.append(t)
    bounds.append(tail)
    return [(bounds[i], bounds[i + 1]) for i in range(len(texts))]


def build_subs(shots: list[dict], cfg: dict, total: float, card_start: float) -> tuple[Path, Path]:
    font = ImageFont.truetype(SUB_FONT_FILE, SUB_SIZE)
    events = []
    for s in shots:
        cues = chunk_text(s["text"], font)
        base = s["start"] + s["voice_offset"]
        for lines, (a, b) in zip(cues, cue_times(ROOT / s["narration"], cues)):
            events.append([base + a - 0.05, base + b + 0.15, lines])
    # no overlap; hold short gaps
    for i in range(len(events) - 1):
        nxt = events[i + 1][0]
        if events[i][1] > nxt - 0.02 or nxt - events[i][1] < 0.35:
            events[i][1] = nxt - 0.02

    srt = ROOT / cfg["episode"]["srt"]
    srt.parent.mkdir(parents=True, exist_ok=True)
    with open(srt, "w", encoding="utf-8") as f:
        for i, (a, b, lines) in enumerate(events, 1):
            f.write(f"{i}\n{srt_time(a)} --> {srt_time(b)}\n" +
                    "\n".join(l.replace(" ", " ") for l in lines) + "\n\n")

    card = cfg["end_card"]
    title = card["text"]
    if ":" in title:
        top, bottom = [x.strip() for x in title.split(":", 1)]
        card_text = f"{{\\fs58\\fsp6}}{top.upper()}{{\\fs20}}\\N\\N{{\\fs88\\fsp1}}{bottom}"
    else:
        card_text = title
    fi = int(card.get("fade_in", 1.0) * 1000)

    ass = TMP / "subs.ass"
    with open(ass, "w", encoding="utf-8") as f:
        f.write(f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,{SUB_FONT_NAME},{SUB_SIZE},&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,-1,0,0,0,100,100,0,0,1,5,3,5,40,40,40,1
Style: Card,{CARD_FONT_NAME},80,&H00E8F4FF,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,0,0,5,60,60,60,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""")
        for a, b, lines in events:
            f.write(f"Dialogue: 0,{ass_time(a)},{ass_time(b)},Sub,,0,0,0,,"
                    f"{{\\pos({W // 2},{SUB_Y})\\fad(80,60)}}" + "\\N".join(lines) + "\n")
        f.write(f"Dialogue: 0,{ass_time(card_start + 0.2)},{ass_time(total)},Card,,0,0,0,,"
                f"{{\\pos({W // 2},{H // 2})\\fad({fi},0)}}{card_text}\n")
    return ass, srt


# --------------------------------------------------------------------------- main
def main(cfg_path: str) -> int:
    cfg = yaml.safe_load(open(ROOT / cfg_path if not Path(cfg_path).is_absolute() else cfg_path,
                              encoding="utf-8"))
    t = cfg["timing"]
    TMP.mkdir(exist_ok=True)

    missing = [p for s in cfg["shots"] for p in [s["clip"]] if not (ROOT / p).exists()]
    if missing:
        print("Missing clips - run src/download_assets.py or download them from higgsfield.ai:")
        for m in missing:
            print("  -", m)
        return 1

    shots = plan(cfg)
    for i, s in enumerate(shots, 1):
        print(f"shot {i}: {s['dur']:.2f}s  (voice {s['narr_dur']:.2f}s @ +{s['voice_offset']:.2f}s, "
              f"starts {s['start']:.2f}s)")

    files = []
    for i, s in enumerate(shots, 1):
        print(f"rendering shot {i} ...", flush=True)
        files.append(render_shot(s, t, i))

    # ---- timeline
    last = shots[-1]
    video_end = last["start"] + last["dur"]
    card_d = cfg["end_card"]["duration"]
    total = video_end + card_d
    print(f"total length: {total:.2f}s")

    ass, srt = build_subs(shots, cfg, total, video_end)

    # ---- filter graph
    n = len(files)
    inputs = []
    for f in files:
        inputs += ["-i", str(f)]
    narr_idx = len(inputs) // 2
    for s in shots:
        inputs += ["-i", str(ROOT / s["narration"])]
    music = ROOT / cfg["music"]["file"]
    has_music = music.exists()
    if has_music:
        inputs += ["-stream_loop", "-1", "-i", str(music)]
    else:
        print(f"WARNING: {cfg['music']['file']} not found - rendering without music")

    fc = []
    fo = t["end_fade_to_black"]
    for i in range(n):
        extra = f",fade=t=out:st={shots[i]['dur'] - fo:.3f}:d={fo}" if i == n - 1 else ""
        fc.append(f"[{i}:v]settb=AVTB,fps={FPS},format=yuv420p{extra}[s{i}]")
    cur, length = "s0", shots[0]["dur"]
    for i in range(1, n):
        xf = shots[i]["xf_in"]
        if xf <= 0:
            fc.append(f"[{cur}][s{i}]concat=n=2:v=1:a=0[j{i}]")
            length += shots[i]["dur"]
        else:
            fc.append(f"[{cur}][s{i}]xfade=transition=fade:duration={xf}:offset={length - xf:.3f}[j{i}]")
            length += shots[i]["dur"] - xf
        cur = f"j{i}"
    # end card background
    fc.append(f"color=c=black:s={W}x{H}:r={FPS}:d={card_d},format=yuv420p[card]")
    fc.append(f"[{cur}][card]concat=n=2:v=1:a=0[body]")
    grade = ("eq=contrast=1.07:brightness=-0.012:saturation=0.93,"
             "colorbalance=rs=0.015:bs=-0.02:rh=0.025:bh=-0.03,"
             "vignette=angle=PI/4.6,noise=alls=5:allf=t+u")
    ass_esc = str(ass).replace("\\", "/").replace(":", "\\:")
    fc.append(f"[body]{grade},ass='{ass_esc}',format=yuv420p[vout]")

    # ---- audio
    vlabels = []
    for i, s in enumerate(shots):
        ms = int(round((s["start"] + s["voice_offset"]) * 1000))
        fc.append(f"[{narr_idx + i}:a]aresample=48000,aformat=channel_layouts=stereo,"
                  f"adelay={ms}|{ms}[n{i}]")
        vlabels.append(f"[n{i}]")
    fc.append(f"{''.join(vlabels)}amix=inputs={n}:normalize=0,apad,atrim=0:{total:.3f}[voice]")
    if has_music:
        m = cfg["music"]
        mi = narr_idx + n
        fc.append("[voice]asplit=2[vmix][vsc]")
        fc.append(f"[{mi}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:{total:.3f},"
                  f"volume={m.get('gain_db', -19)}dB,"
                  f"afade=t=in:d={m.get('fade_in', 1.5)},"
                  f"afade=t=out:st={total - m.get('fade_out', 3.0):.3f}:d={m.get('fade_out', 3.0)}[mus]")
        fc.append("[mus][vsc]sidechaincompress=threshold=0.02:ratio=5:attack=30:release=450:makeup=1[duck]")
        fc.append("[vmix][duck]amix=inputs=2:normalize=0,alimiter=limit=0.95[aout]")
    else:
        fc.append("[voice]alimiter=limit=0.95[aout]")

    out = ROOT / cfg["episode"]["output"]
    out.parent.mkdir(parents=True, exist_ok=True)
    (TMP / "filter.txt").write_text(";\n".join(fc))
    print("final encode ...", flush=True)
    run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex_script", str(TMP / "filter.txt"),
         "-map", "[vout]", "-map", "[aout]", "-t", f"{total:.3f}",
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-r", str(FPS),
         "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", str(out)])

    cap = ROOT / cfg["episode"]["caption_file"]
    cap.write_text(cfg["episode"]["caption"] + "\n", encoding="utf-8")
    shutil.copy(ass, out.with_suffix(".ass"))
    print(f"done: {out.relative_to(ROOT)} ({duration(out):.1f}s), {srt.relative_to(ROOT)}, "
          f"{cap.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "episodes/episode_01.yaml"))
