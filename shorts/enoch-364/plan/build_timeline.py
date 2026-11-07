"""Build plan/timeline.json from the 12 VO files + Scribe word timings. Voice first: all timing keys off this."""
import json, subprocess
from pathlib import Path
P = Path(__file__).parent
LINES = [  # (speaker, script text)
 ("ENOCH", "The year is completed in 364 days."),
 ("MAYA", "Respectfully? No. Earth takes 365.24 days."),
 ("ENOCH", "A mere day and a quarter. What harm can it do?"),
 ("MAYA", "Your calendar slips a day and a quarter every year. In ten years, every feast lands twelve days early."),
 ("MAYA", "After 147 years… midsummer falls in the middle of winter."),
 ("ENOCH", "Then let the Earth obey the calendar."),
 ("MAYA", "Okay… but that's the scary part."),
 ("MAYA", "To finish its orbit a day and a quarter sooner, Earth has to move closer to the Sun. 339,000 kilometers closer. Almost the distance to the Moon."),
 ("ENOCH", "And the sunlight?"),
 ("MAYA", "Half a percent stronger. That's about forty percent of all the warming push humans have added since 1750."),
 ("ENOCH", "So… we fix the calendar?"),
 ("MAYA", "Or we move the planet. You decide."),
]
GAP = 0.15
def dur(f): return float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f]))
out, t = [], 0.0
for i, (spk, text) in enumerate(LINES, 1):
    f = f"public/vo/line_{i:02d}.mp3"
    words = [w for w in json.load(open(P / f"words_{i:02d}.json"))["words"] if w["type"] == "word"]
    # Scribe spelled the number out and misheard one word; restore the script's words, keep its timing
    if i == 5:
        k = [w["text"] for w in words].index("one")
        words[k:k+4] = [{"text": "147", "start": words[k]["start"], "end": words[k+3]["end"]}]
    if i == 11:
        for w in words:
            if w["text"] == "fixed": w["text"] = "fix"
    d = dur(f)
    out.append({"id": i, "speaker": spk, "text": text, "file": f.replace("public/", ""), "start": round(t, 3), "duration": round(d, 3),
                "words": [{"text": w["text"], "start": round(t + w["start"], 3), "end": round(t + w["end"], 3)} for w in words]})
    t += d + GAP
total = round(t - GAP + 1.0, 3)  # 1 s tail for the loop back to frame 1
def at(line, word, n=0):
    hits = [w for w in out[line-1]["words"] if w["text"].strip(".,?…").lower() == word.lower()]
    return hits[n]["start"]
events = {
 "y365": at(2, "365.24"), "quarter": at(3, "quarter"), "ten": at(4, "ten"), "twelve": at(4, "twelve"),
 "y147": at(5, "147"), "winter": at(5, "winter"), "obey": at(6, "obey"), "scary": at(7, "scary"),
 "closer": at(8, "closer"), "km": at(8, "339,000"), "moon": at(8, "moon"), "sunlight": at(9, "sunlight"),
 "half": at(10, "half"), "forty": at(10, "forty"), "fix": at(11, "fix"), "move": at(12, "move"), "decide": at(12, "decide"),
}
events.update({f"line{l['id']}": l["start"] for l in out})
json.dump({"fps": 30, "duration": total, "lines": out, "events": events}, open(P / "timeline.json", "w"), indent=1, ensure_ascii=False)
print("total", total, "s"); print(json.dumps(events))
