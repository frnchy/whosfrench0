#!/usr/bin/env python3
"""Generate the voiceover locally (Kokoro, open-source) one file per line,
trim silence, measure word timings with Whisper, and write
video/public/vo/<id>.wav + video/src/vo_timing.json.

    python3 tools/vo.py            # generate missing lines + time them
    python3 tools/vo.py --force    # regenerate every line
"""
import json, os, re, sys
import numpy as np
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
STORY = json.load(open("story.json"))
CACHE = ".cache/tts"
OUTDIR = "video/public/vo"
SR = 24000
os.makedirs(OUTDIR, exist_ok=True)


def trim(x, thr_db=-45, pad=0.01):
    db = 20 * np.log10(np.abs(x) + 1e-9)
    loud = np.where(db > thr_db + 20 * np.log10(np.abs(x).max() + 1e-9))[0]
    a = max(0, loud[0] - int(pad * SR))
    b = min(len(x), loud[-1] + int(0.12 * SR))
    y = x[a:b].copy()
    n = int(0.005 * SR)
    y[:n] *= np.linspace(0, 1, n)
    y[-n:] *= np.linspace(1, 0, n)
    return y


def generate(force=False):
    from kokoro_onnx import Kokoro
    k = None
    tts = STORY["tts"]
    for line in STORY["vo"]:
        out = f"{OUTDIR}/{line['id']}.wav"
        meta = out + ".txt"
        if not force and os.path.exists(out) and open(meta).read() == line["text"] + str(line.get("speed", "")):
            continue
        k = k or Kokoro(f"{CACHE}/kokoro-v1.0.onnx", f"{CACHE}/voices-v1.0.bin")
        x, sr = k.create(line["text"], voice=tts["voice"], speed=line.get("speed", tts["speed"]), lang="en-us")
        assert sr == SR
        sf.write(out, trim(np.asarray(x, np.float32)), SR)
        open(meta, "w").write(line["text"] + str(line.get("speed", "")))
        print("generated", line["id"])


def norm(w):
    return re.sub(r"[^a-z0-9]", "", w.lower())


def timings():
    from faster_whisper import WhisperModel
    m = WhisperModel("small.en", device="cpu", compute_type="int8")
    out = {}
    prev_end = 0.0
    for line in STORY["vo"]:
        x, sr = sf.read(f"{OUTDIR}/{line['id']}.wav", dtype="float32")
        x16 = x[::3] if sr == 48000 else np.interp(np.arange(0, len(x), sr / 16000), np.arange(len(x)), x).astype(np.float32)
        segs, _ = m.transcribe(x16, word_timestamps=True, language="en",
                               initial_prompt=line["text"])
        at = line["at"]
        if isinstance(at, str):          # "+gap" = right after the previous line
            at = round(prev_end + float(at), 3)
        prev_end = at + len(x) / sr - 0.12   # minus the trailing pad kept by trim()
        line = dict(line, at=at)
        words = [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)}
                 for s in segs for w in s.words]
        heard = " ".join(w["w"] for w in words)
        out[line["id"]] = {"at": line["at"], "dur": round(len(x) / sr, 3), "text": line["text"],
                           "heard": heard, "words": words}
        flag = "" if norm(heard.replace(" ", "")) == norm(line["text"].replace(" ", "")) else "   <-- CHECK"
        print(f"{line['id']:9s} at {line['at']:5.2f} dur {len(x)/sr:4.2f} end {line['at']+len(x)/sr:5.2f} | {heard}{flag}")
    json.dump(out, open("video/src/vo_timing.json", "w"), indent=1)


if __name__ == "__main__":
    generate("--force" in sys.argv)
    timings()
