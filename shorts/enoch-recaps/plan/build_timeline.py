"""Voice first: build src/timeline.json for all 8 recaps from the VO files + one Scribe pass over all_vo.mp3.
Scribe ran on the 64 lines concatenated (offsets in concat_offsets.json); words are mapped back to each line.
The script's spelling is kept (Hénoch, Dudaël…), Scribe's timing is used; a word-count mismatch aborts."""
import json, re, subprocess, sys
from pathlib import Path
P = Path(__file__).parent
R = P.parent
S = json.load(open(P / "scripts.json"))
OFF = json.load(open(P / "concat_offsets.json"))
W = [w for w in json.load(open(P / "words_all.json"))["words"] if w["type"] == "word"]

LEAD, GAP, OUTRO = 0.35, 0.3, 4.2   # s before line 1, between lines, after the last line (question + pull-back)
TAG = re.compile(r"\[[^\]]*\]\s*")
tok = lambda s: [t for t in TAG.sub("", s).replace("«", " ").replace("»", " ").split() if re.search(r"\w", t)]
def dec(f):  # decoded length (what the player actually plays)
    return len(subprocess.check_output(["ffmpeg", "-v", "error", "-i", f, "-ac", "1", "-ar", "44100", "-f", "s16le", "-"])) / 2 / 44100

episodes = []
for ep in S["episodes"]:
    n, t, lines = ep["n"], LEAD, []
    for k, (spk, text) in enumerate(ep["lines"], 1):
        o = next(x for x in OFF if x["ep"] == n and x["line"] == k)
        fix = P / f"words_ep{n}_line0{k}.json"   # line regenerated after fact-check: transcribed on its own
        if fix.exists():
            o = {"start": 0.0, "dur": dec(str(R / f"public/vo/ep{n}/line_0{k}.mp3"))}
            hits = [w for w in json.load(open(fix))["words"] if w["type"] == "word" and re.search(r"\w", w["text"])]
        else:
            hits = [w for w in W if o["start"] - 0.05 <= w["start"] < o["start"] + o["dur"] + 0.6 and re.search(r"\w", w["text"])]
        words = tok(text)
        if len(hits) != len(words):
            sys.exit(f"ep{n} line{k}: script has {len(words)} words, Scribe {len(hits)}: {[h['text'] for h in hits]}")
        f = f"public/vo/ep{n}/line_0{k}.mp3"
        d = o["dur"]
        lines.append({"id": k, "speaker": spk, "text": TAG.sub("", text), "file": f.replace("public/", ""), "start": round(t, 3), "duration": round(d, 3),
                      "words": [{"text": w, "start": round(t + h["start"] - o["start"], 3), "end": round(t + h["end"] - o["start"], 3)} for w, h in zip(words, hits)]})
        t += d + GAP
    total = round(t - GAP + OUTRO, 3)
    episodes.append({"n": n, "title": ep["title"], "ref": ep["ref"], "question": ep["question"], "duration": total,
                     "frames": round(total * 30), "lines": lines, "questionAt": round(lines[-1]["start"] + lines[-1]["duration"] + 0.2, 3)})
    print(f"ep{n}: {total:.1f}s")
json.dump({"fps": 30, "episodes": episodes}, open(R / "src/timeline.json", "w"), ensure_ascii=False, indent=1)
