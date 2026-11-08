"""captions.srt from the timeline — same cue rules as the on-screen captions (1–3 words, cut on punctuation/pauses)."""
import json, re, sys
EP = sys.argv[1]; tl = json.load(open(f"src/timeline_{EP}.json"))
cues = []
for l in tl["lines"]:
    cur = []
    def push():
        if cur: cues.append([cur[0]["start"], cur[-1]["end"], " ".join(w["text"].replace("…", "") for w in cur), l["speaker"]]); cur.clear()
    for i, w in enumerate(l["words"]):
        p = l["words"][i - 1] if i else None
        if cur and (len(cur) >= 3 or re.search(r"[.,?!…:]$", p["text"]) or w["start"] - p["end"] > 0.35): push()
        cur.append(w)
    push()
for i, c in enumerate(cues):
    n = cues[i + 1] if i + 1 < len(cues) else None
    c[1] = n[0] if n and n[0] - c[1] < 0.4 else c[1] + 0.25
ts = lambda t: f"{int(t // 3600):02d}:{int(t % 3600 // 60):02d}:{int(t % 60):02d},{int(round(t % 1 * 1000)) % 1000:03d}"
name = {"CHOEUR": "LES 200"}
open(f"out/{EP}/captions.srt", "w").write("\n".join(f"{i}\n{ts(a)} --> {ts(b)}\n{name.get(s, s)}: {txt}\n" for i, (a, b, txt, s) in enumerate(cues, 1)))
print(len(cues), "cues")
