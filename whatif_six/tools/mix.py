#!/usr/bin/env python3
"""Sound design + VO mix, all synthesized in code (royalty-free), plus captions.srt.

    python3 tools/mix.py           -> .cache/mix.wav, out/captions.srt
"""
import json, os, re
import numpy as np
import soundfile as sf
from scipy.signal import lfilter, butter, sosfilt, resample_poly

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
SR = 48000
DUR = 60.0
N = int(DUR * SR)
STORY = json.load(open("story.json"))
VO = json.load(open("video/src/vo_timing.json"))
rng = np.random.default_rng(6)
T0 = STORY["beats"]["t0"]          # everyone turns 6 (screen time)
LOOP = STORY["beats"]["loopCut"]


def t(n): return np.arange(n) / SR
def lp(x, f): return sosfilt(butter(2, f, 'low', fs=SR, output='sos'), x)
def hp(x, f): return sosfilt(butter(2, f, 'high', fs=SR, output='sos'), x)
def bp(x, a, b): return sosfilt(butter(2, [a, b], 'band', fs=SR, output='sos'), x)
def env(n, a, d):
    tt = t(n)
    return np.clip(tt / max(a, 1e-4), 0, 1) * np.exp(-np.maximum(tt - a, 0) / d)
def place(bus, x, at, g=1.0):
    i = int(round(at * SR))
    if i < 0: x, i = x[-i:], 0
    n = min(len(x), len(bus) - i)
    if n > 0: bus[i:i + n] += g * x[:n]
def fade_window(n, a, b):
    w = np.ones(n)
    ia, ib = int(a * SR), int(b * SR)
    w[:ia] = np.linspace(0, 1, ia) if ia else 1
    if ib: w[-ib:] = np.linspace(1, 0, ib)
    return w

# ------------------------------------------------------------- city bed --
def city_bed(dur):
    n = int(dur * SR); tt = t(n)
    brown = lfilter([1], [1, -0.995], rng.standard_normal(n)); brown /= np.abs(brown).max()
    hum = lp(brown, 220) * 0.9
    tyres = bp(rng.standard_normal(n), 300, 1800) * (0.25 + 0.15 * np.sin(2 * np.pi * 0.17 * tt))
    murmur = bp(rng.standard_normal(n), 250, 2200) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 0.9 * tt) * np.sin(2 * np.pi * 0.37 * tt + 1)))
    engine = 0.12 * np.sin(2 * np.pi * (55 + 3 * np.sin(2 * np.pi * 0.2 * tt)) * tt)
    x = hum + 0.5 * tyres + 0.35 * murmur + engine
    for at, f in [(1.6, 392), (4.9, 349), (6.1, 330)]:  # distant horns
        h = np.sign(np.sin(2 * np.pi * f * t(int(0.42 * SR)))) * env(int(0.42 * SR), 0.02, 0.3)
        place(x, lp(h, 1400) * 0.25, at)
    return x / np.abs(x).max()

def siren(dur):
    n = int(dur * SR); tt = t(n)
    f = 950 + 350 * np.sin(2 * np.pi * tt / 1.7)
    return lp(np.sin(2 * np.pi * np.cumsum(f) / SR), 2500) * np.minimum(1, tt / 1.5)

def car_alarm(dur):
    n = int(dur * SR); tt = t(n)
    gate = (np.sin(2 * np.pi * 2.2 * tt) > 0).astype(float)
    f = np.where(np.sin(2 * np.pi * 0.55 * tt) > 0, 1250, 900)
    return bp(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * gate, 600, 3000) * 0.5

# ---------------------------------------------------------- slow-mo SFX --
def sweep(f0, f1, dur, shape=2.0):
    n = int(dur * SR); u = t(n) / dur
    f = f0 + (f1 - f0) * u ** shape
    return np.sin(2 * np.pi * np.cumsum(f) / SR)

def shrink_whomp():
    s = sweep(420, 45, 1.6, 0.6) * env(int(1.6 * SR), 0.02, 0.7)
    s += lp(rng.standard_normal(len(s)), 600) * env(len(s), 0.01, 0.25) * 0.4
    return s / np.abs(s).max()

def thud(dur=0.9):
    n = int(dur * SR)
    s = sweep(110, 40, dur, 0.5) * env(n, 0.005, 0.18) + lp(rng.standard_normal(n), 400) * env(n, 0.002, 0.06) * 0.6
    return s / np.abs(s).max()

def creak(dur=1.4):
    n = int(dur * SR); tt = t(n)
    f = 90 + 40 * tt + 20 * np.sin(2 * np.pi * 6 * tt)
    s = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.sin(np.pi * np.clip(tt / dur, 0, 1))
    return lp(s, 1200) * 0.6

def rumble(dur):
    n = int(dur * SR); tt = t(n)
    s = lp(rng.standard_normal(n), 140) * 3 + 0.4 * np.sin(2 * np.pi * 38 * tt)
    return s / np.abs(s).max() * np.minimum(1, tt / 1.0) * np.minimum(1, (dur - tt) / 1.0)

def chime(f):
    n = int(0.9 * SR); tt = t(n)
    return (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt)) * env(n, 0.005, 0.25)

def brake_hiss(dur):
    n = int(dur * SR); tt = t(n)
    s = bp(rng.standard_normal(n), 250, 1100) * np.minimum(1, tt / 0.6) * np.exp(-tt / (dur * 0.6))
    return s / np.abs(s).max()

def impact():
    n = int(3.0 * SR)
    low = sweep(80, 28, 3.0, 0.4) * env(n, 0.004, 0.9)
    crunch = lp(hp(rng.standard_normal(n), 200), 2500) * env(n, 0.002, 0.35)
    ticks = np.zeros(n)
    for k in range(18):
        i = int(rng.uniform(0, 0.8) * SR)
        ln = int(0.05 * SR)
        ticks[i:i + ln] += hp(rng.standard_normal(ln), 1500) * env(ln, 0.001, 0.01) * rng.uniform(0.2, 0.8)
    s = low + 0.6 * crunch + 0.4 * ticks
    return s / np.abs(s).max()

def airbag_pop():
    n = int(1.2 * SR)
    s = bp(rng.standard_normal(n), 120, 1800) * env(n, 0.01, 0.25) + sweep(70, 30, 1.2) * env(n, 0.01, 0.3)
    return s / np.abs(s).max()

def whoosh_up(dur=1.6):
    n = int(dur * SR); u = t(n) / dur
    noise = rng.standard_normal(n)
    s = np.zeros(n)
    for k in range(8):   # rising band
        a, b = int(k * n / 8), int((k + 1) * n / 8)
        f = 200 + 2600 * (k / 7) ** 2
        s[a:b] = bp(noise[a:b], f * 0.7, f * 1.4)
    s = lp(s, 6000) * u ** 2 + 0.5 * sweep(60, 420, dur, 2.5) * u ** 3
    return s / np.abs(s).max()

def slow_drone(dur):
    n = int(dur * SR); tt = t(n)
    s = 0.6 * np.sin(2 * np.pi * 41 * tt) + 0.3 * np.sin(2 * np.pi * 61.5 * tt + 1) + lp(rng.standard_normal(n), 300) * 0.5
    return s / np.abs(s).max() * np.minimum(1, tt / 2) * np.minimum(1, (dur - tt) / 0.5)

# ------------------------------------------------------------------ mix --
def build():
    bed = np.zeros(N)
    sfx = np.zeros(N)
    city = city_bed(9.0)
    # 0 -> 8: city bed; 6.6 -> 8: slows, filters down, dies to silence at T0
    pre = city[: int(T0 * SR)].copy()
    i0 = int(6.6 * SR)
    tail = pre[i0:]
    u = np.linspace(0, 1, len(tail))
    tail = np.concatenate([lp(tail[k:k + 4800], max(120, 3000 * (1 - u[k]) ** 2)) for k in range(0, len(tail), 4800)])[:len(tail)]
    pre[i0:] = tail * (1 - u) ** 1.5
    place(bed, pre * 0.55, 0)
    place(sfx, sweep(260, 40, 1.4, 0.7) * np.linspace(0.6, 0, int(1.4 * SR)) * 0.25, 6.6)  # tape-stop
    # slow-motion world (dead quiet + low drone)
    place(bed, slow_drone(46.0 - T0) * 0.12, T0)
    place(sfx, shrink_whomp() * 0.55, T0)
    for at in np.sort(rng.uniform(10.6, 15.6, 12)):      # dropped cups & bags landing
        place(sfx, thud() * rng.uniform(0.18, 0.32), at)
    place(sfx, creak() * 0.35, 16.6)
    place(bed, rumble(8.0) * 0.32, 24.0)
    aeb_t = T0 + 3.1 * 8
    place(sfx, chime(1400) * 0.32, aeb_t)
    place(sfx, chime(1050) * 0.32, aeb_t + 0.55)
    place(sfx, brake_hiss(8.0) * 0.22, aeb_t + 0.2)
    hit_t = 40 + (4.25 - 4) * 6
    place(sfx, impact() * 0.62, hit_t)
    place(sfx, airbag_pop() * 0.5, hit_t + 0.24)
    # switch back at t=46: rising whoosh, the city returns with a siren and a car alarm
    place(sfx, whoosh_up(1.6) * 0.5, 46.0 - 1.55)
    after = city_bed(14.0)
    place(bed, after * 0.5 * fade_window(len(after), 0.15, 0.0), 46.0)
    place(bed, siren(13.6) * 0.12, 46.4)
    place(bed, car_alarm(12.0) * 0.07, 46.9)
    # loop: the last 0.4 s is the opening's bed, so 59.6 -> 0.0 is seamless
    il = int(LOOP * SR)
    bed[il:] = 0
    sfx[il:] = 0
    place(bed, city[: N - il] * 0.55, LOOP)

    vo = np.zeros(N)
    for k, line in VO.items():
        x, sr = sf.read(f"video/public/vo/{k}.wav", dtype="float32")
        if sr != SR: x = resample_poly(x, SR, sr)
        place(vo, x, line["at"])
    vo[int(LOOP * SR):] = 0
    vo *= 10 ** (-3 / 20) / np.abs(vo).max()

    # duck everything 6 dB under the voice
    e = lp(np.abs(vo), 8.0)
    e = np.clip(e / (e.max() + 1e-9) * 5, 0, 1)
    duck = 1 - (1 - 10 ** (-6 / 20)) * e
    music = (bed + sfx) * duck
    if np.abs(music).max() > 10 ** (-7 / 20):  # keep effects well below the voice peak
        music *= 10 ** (-7 / 20) / np.abs(music).max()
    mix = vo + music
    mix *= 10 ** (-1 / 20) / np.abs(mix).max()
    sf.write(".cache/mix.wav", np.stack([mix, mix], 1).astype(np.float32), SR)
    act = np.abs(vo) > 0.02
    rms = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
    print(f"peak -1.0 dBFS | VO rms {rms(vo[act]):.1f} dB vs effects under VO {rms(music[act]):.1f} dB")

# ------------------------------------------------------------------ srt --
REPL = [("five foot six", "5′6″"), ("four foot nine", "4′9″"), ("twenty five miles an hour", "25 mph"),
        ("thirty seven feet", "37 feet"), ("twenty inches", "20 inches"), ("eighty percent", "80%"),
        ("ninety percent", "90%"), ("five seconds", "5 seconds"), ("six year old", "6-year-old"),
        ("Second one", "Second 1"), ("Second two", "Second 2"), ("Second three", "Second 3"),
        ("Second four", "Second 4"), ("Second five", "Second 5"), ("turned six", "turned 6"), ("By six", "By 6")]

def srt():
    def ts(x):
        ms = int(round(x * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
    lines = sorted(VO.values(), key=lambda v: v["at"])
    out = []
    for i, v in enumerate(lines):
        txt = v["text"]
        for a, b in REPL: txt = re.sub(re.escape(a), b, txt, flags=re.I)
        s = v["at"] + v["words"][0]["s"]
        e = v["at"] + v["words"][-1]["e"] + 0.25
        if i + 1 < len(lines): e = min(e, lines[i + 1]["at"] - 0.02)
        out.append(f"{i + 1}\n{ts(s)} --> {ts(e)}\n{txt}\n")
    os.makedirs("out", exist_ok=True)
    open("out/captions.srt", "w").write("\n".join(out))
    print(f"wrote out/captions.srt ({len(out)} cues)")

if __name__ == "__main__":
    build()
    srt()
