# Plan: "The Book of Enoch says a year is 364 days"

**Format:** what-if (the book's 364-day year vs Earth's 365.24 days). Dialogue between ENOCH (deep, older British voice) and MAYA (witty young astronomer). 9:16, 30 fps, 63.2 s, English.

## Hooks considered
1. **Chosen.** Frame 1: Sun and Earth plus the title "The Book of Enoch says a year is 364 days." Enoch, first line: "The year is completed in 364 days." Maya cuts in: "Respectfully? No." The conflict lands in the first 1.5 s.
2. "Earth would have to move 339,000 km to make this ancient book right." This hook is stronger on numbers but gives the payoff away.
3. "This 2,000-year-old calendar breaks summer in 147 years." The drift angle has been done before. The orbit twist is fresher.

## Beats (times keyed to the voice: plan/timeline.json)
| t (s) | Line | Visual | HUD | Sound | Micro-hook |
|---|---|---|---|---|---|
| 0.0 | E1 "The year is completed in 364 days" | Sun and Earth chase shot, title | 364 days · 1 Enoch 82:6 | dark bed | title + number on frame 1 |
| 4.6 | M2 "Respectfully? No… 365.24 days" | slow orbit | flips red to 365.24 days | tick | number contradiction |
| 10.2 | E3 "A mere day and a quarter" | gold calendar marker appears on the orbit | | chime | new object |
| 13.9 | M4 drift, 10 years | pull up to an overhead view; gold arc opens | +12.4 days, after 10 years | ticks | camera move + counter |
| 21.1 | M5 147 years / winter | marker sweeps to the far side of the orbit | +182.6 days, icy blue | whoosh, tick | the big sweep |
| 27.6 | E6 "Then let the Earth obey" | swoop toward Earth | Earth–Sun 149,597,871 km | whoosh | camera dive |
| 30.4 | M7 "that's the scary part" (open loop) | cut to an Earth close-up | | bed drops to silence, hit | sound drop |
| 34.2 | M8 339,000 km / Moon | crane up to overhead; Earth slides onto the gold orbit; Moon ring | −339,381 km (red) | whoosh, hit | crane + count + Moon reveal |
| 45.9 | E9 "And the sunlight?" | back out to the Sun | | whoosh | scene change |
| 47.5 | M10 half a percent / 40% | Sun shot, glow swells | +0.46%, +6.2 W/m², ≈40% | rise, tick | value + comparison |
| 55.0 | E11 "So… we fix the calendar?" | ease back to the opening chase shot | 364 days | whoosh, light bed | |
| 58.5 | M12 "Or we move the planet. You decide." | question card | 364 days | chime | comment bait |
| 62.2–63.2 | (tail) | same framing, title and HUD as frame 1 | | | **loop** |

**Open loop:** "that's the scary part" (30.4 s) pays off at 339,000 km (39.9 s) and the 40% forcing comparison (50.3 s).
**Ending question:** "Fix the calendar, or move the planet?"

## Shots
- **Chase (wide):** the camera rides Earth's orbit, solved by `sim/frame_solver.py`: Sun upper-left, half-lit Earth lower-right, ~50 mm equivalent (45° vertical FOV). It is Earth-relative, so the last frame flows into the first.
- **Overview:** a top-down view of the whole orbit for the drift sweep.
- **Local:** distances to scale, with Earth and Moon drawn ×8. Close-up push-in, then a crane up to overhead for the orbit shift and Moon ring.
- **Sun shot:** the chase framing pushing toward the Sun.
