"""Voice first: src/timeline.json (line starts, word times) and src/mouth.json (per-frame mouth opening from VO loudness)."""
import json, re, subprocess, sys
from pathlib import Path
EP = sys.argv[1] if len(sys.argv) > 1 else "ep1"
P = Path(__file__).parent / EP; R = Path(__file__).parent.parent
S = json.load(open(P / "script.json")); W = json.load(open(P / "word_times.json"))
FPS = 30
LEAD = 0.4
S0 = json.load(open(P / "script.json"))
GAP_AFTER = {int(k): v for k, v in S0.get("gaps", {}).items()}   # story beats between lines
TAIL = 2.2
TAG = re.compile(r"\[[^\]]*\]\s*")
tok = lambda s: [t for t in TAG.sub("", s).replace("«", " ").replace("»", " ").split() if re.search(r"\w", t)]
def pcm(f):
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", f, "-ac", "1", "-ar", "24000", "-f", "s16le", "-"])
    import array; a = array.array("h"); a.frombytes(raw); return a
lines, mouth, t = [], {}, LEAD
for k, (spk, text) in enumerate(S["lines"], 1):
    f = f"public/{EP}/vo/line_{k:02d}.mp3"; a = pcm(str(R / f)); d = len(a) / 24000
    words = tok(text); times = W[str(k)]
    assert len(words) == len(times), (k, len(words), len(times))
    # mouth: RMS per video frame, normalised to the line's 95th percentile, gated by the word windows
    hop = 24000 // FPS; env = []
    for i in range(0, len(a), hop):
        seg = a[i:i + hop]; env.append((sum(x * x for x in seg) / max(1, len(seg))) ** 0.5)
    ref = sorted(env)[int(len(env) * 0.95)] or 1
    open_ = []
    for i, e in enumerate(env):
        ts = i / FPS; inword = any(s - 0.05 <= ts <= e2 + 0.03 for s, e2 in times)
        open_.append(round(min(1.0, e / ref) if inword else 0.0, 3))
    mouth[k] = open_
    lines.append({"id": k, "speaker": spk, "text": TAG.sub("", text), "file": f.replace("public/", ""), "start": round(t, 3), "duration": round(d, 3),
                  "words": [{"text": w, "start": round(t + s, 3), "end": round(t + e, 3)} for w, (s, e) in zip(words, times)]})
    t += d + GAP_AFTER.get(k, 0.2)
total = round(t - GAP_AFTER.get(len(S["lines"]), 0.2) + TAIL, 3)
json.dump({"fps": FPS, "duration": total, "frames": round(total * FPS), "title": S["title"], "ref": S["ref"], "question": S["question"], "lines": lines},
          open(R / f"src/timeline_{EP}.json", "w"), ensure_ascii=False, indent=1)
json.dump(mouth, open(R / f"src/mouth_{EP}.json", "w"))
print("total", total, "s,", round(total * FPS), "frames"); print([(l["id"], l["start"]) for l in lines])
