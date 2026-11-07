# Plan: What if everyone turned 6 for 5 seconds?

```
TITLE:     What if everyone turned 6 for 5 seconds?
LOCATION:  Times Square (7th Ave × cross street), New York, at rush hour
HUD METRIC: AVERAGE HEIGHT  5′6″ → 3′10″ → 5′6″   (CDC adults 20+ / WHO age 6)
WORLD:     ~170 people, SUV (new, autobrake), old yellow taxi, city bus, 9 background cars,
           Times Square towers with glowing (text-free, logo-free) billboards, traffic lights,
           crosswalks, hot-dog cart, planters, lamp posts, bollards
STACK:     100 % code. Remotion + @remotion/three (three.js) for every frame; Kokoro (local,
           open-source TTS) for the VO; numpy-synthesized sound design; ffmpeg mux.
```

Facts and sources are in [RESEARCH.md](RESEARCH.md). Every value on screen comes from there.

## Time warp (slow motion)

Real time `T` drives all the physics; screen time `t` drives cameras and text.

| Screen t | Rate | Real T |
|---|---|---|
| 0 – 6.6 s | 1× | −7.4 → −1.4 s |
| 6.6 – 8.0 s | eases 1× → ⅛× | → 0.00 s (the switch) |
| 8 – 40 s | ⅛× (seconds 1–4, 8 s each) | 0 → 4.00 s |
| 40 – 46 s | ⅙× (second 5) | 4 → 5.00 s (switch back) |
| 46 – 47.5 s | eases back to 1× | 5 → ~6 s |

Falling cups, rolling cars and braking are real kinematics in `T` (g = 9.81 m/s², 25 mph = 11.18 m/s), so the slow motion is physically right.

## Second by second

| Real T | Screen t | Effect | Source |
|---|---|---|---|
| 0.00 | 8.0 | Everyone shrinks 5′6″ → 3′10″ (over 0.15 s). Adult shirts become knee-length dresses on child bodies, and heads shrink only about 7 % | S1, S2, S10 |
| 0.1–0.6 | 8.8–12.8 | Pants slide to the ankles. Shoes stay where adult feet were. People slow to a stop | derived from S1–S3 |
| 0.2–1.0 | 9.6–16 | Grip −80 %: cups, bags and phones fall in real free-fall (1 m takes 0.45 s, about 3.6 s on screen) | S4, S5 |
| 1–2 | 16–24 | Taxi cutaway: belt crosses the neck, head below the top of the wheel, feet far from the pedals ("estimated") | S7 |
| 2–3 | 24–32 | Traffic coasts. A "37 ft / s" dimension line rides the road next to the SUV | S8 + maths |
| 3.1 | 32.8 | SUV autobrake: cyan sensor arcs, brake lights, 7.5 m/s² stop about 1.5 m short of the crosswalk full of kids | S9 |
| 4.25 | 41.5 | The old taxi (no autobrake) rear-ends the braking SUV at about 13 mph closing speed. The taxi's airbag fires in front of a 6-year-old (slow-motion puff), with a small camera shake | S7, S9 |
| 5.00 | 46.0 | Snap back to adult size with a white pulse. The bus is still rolling through the intersection | S8 |
| after | 46–56 | Adults barefoot with pants at their ankles, shoes all over the crosswalk. Head-size diagram: brain ≈ 90 % of adult size by age 5–6 | S10 |

## Shots

| # | Screen t | Camera | What animates |
|---|---|---|---|
| 1 | 0–3 | High drone over Times Square, slow push-in toward the north crosswalk | Title (serif), normal traffic and walkers |
| 2 | 3–8 | Descends to the NE corner at about 3 m, looking at the crosswalk; time eases into slow motion | SUV and taxi approaching, bus on the cross street |
| 3 | 8–16 | Street level beside the crosswalk walkers (1.4 m), slow dolly | The shrink, pants, shoes, falling cups and bags |
| 4 | 16–24 | Follows the taxi, beside the driver, door cut away | Belt across the neck, feet far from the pedals |
| 5 | 24–32 | Low tracking shot alongside the SUV | "37 ft every second" dimension line, bus crossing |
| 6 | 32–40 | **Hero:** low, behind the kids on the crosswalk, looking up the avenue at the SUV | Sensor arcs and autobrake; taxi closing in behind |
| 7 | 40–46 | Side-on to the taxi and SUV, taxi cutaway, then cranes up for the switch-back | Impact, airbag, shake; snap back to adults |
| 8 | 46–51 | Medium-wide aftermath at normal speed | Adults with pants down, scattered shoes, bus down the road |
| 9 | 51–55.6 | Same shot, dimmed, with a 2D head-size diagram | Adult vs 6-year-old silhouettes, heads nearly equal |
| 10 | 55.6–59.6 | Slow crane up over the intersection | — |
| loop | 59.6–60 | Hard cut to the opening frame (identical to frame 0) | — |

## VO

Times are in `story.json`. They're measured from the generated audio and written to `video/src/vo_timing.json`.

| id | Start | Line |
|---|---|---|
| q | 0.25 | What if everyone turned six... for five seconds? |
| place | 3.40 | Times Square. Rush hour. |
| avg | 5.30 | The average American adult? Five foot six. |
| s1 | 8.30 | Second one. Everyone drops twenty inches, |
| weight | 11.03 | and three quarters of their weight. |
| grip | 13.08 | Shoes slip off. Grip strength? Down eighty percent. |
| s2 | 16.30 | Second two. Every seat belt now crosses a six year old's neck. |
| belt | 20.91 | Adult belts fit at four foot nine and up. |
| s3 | 24.30 | Second three. Nobody can reach the brake. *(estimated)* |
| roll | 27.43 | At twenty five miles an hour, that's thirty seven feet... every second. |
| s4 | 32.30 | Second four. Most new cars... brake themselves. |
| aeb | 35.68 | Automatic emergency braking. |
| taxi | 37.97 | The old taxi? Not so much. |
| s5 | 40.30 | Second five. |
| airbag | 42.30 | Its airbag fires... at a six year old. |
| back | 46.40 | And... everyone's back. |
| barefoot | 48.12 | Barefoot. Pants down. |
| heads | 49.81 | Their heads barely shrank. By six, the brain is about ninety percent adult size. |
| argue | 55.60 | Who was in more danger: the kids walking... or the kids driving? |

## On-screen text

- **Title** (0–3.4 s, then fades): EB Garamond 500, 84 px, white, soft shadow, two lines centred at 40 % height.
- **HUD**, top-left (x 64, y 160):
  - AVERAGE HEIGHT (Inter Medium 26 px, +20 % tracking, 85 % white)
  - the value (EB Garamond 78 px). It counts 5′6″ → 3′10″ in 0.6 s at t = 8 s and turns icy blue `#9FD8FF` with one label pulse, then counts back at t = 46 s.
  - TIMES SQUARE, NEW YORK (22 px, 70 %)
  - from 8 to 46 s: SECOND n / 5 and REAL TIME 2.37 s
- **Captions:** word-by-word, Inter Bold 86 px, at 72 % height, 1–3 words at a time.
  - Numbers are shown as digits (5′6″, 20 inches, 80 %, 4′9″, 25 mph, 37 feet, 90 %), and the key word or number is in `#9FD8FF`.
  - Each chunk appears on its first word (Whisper timestamps) and cuts hard.
- **Source tags:** 20 px at 60 % white, under the captions, while a sourced number is on screen. "estimated" appears under the brake line.
- **Safe zones:** nothing important in the bottom 18 % (y > 1574) or the right 12 % (x > 950).

## Sound (all synthesized in code)

| Cue | t | Description |
|---|---|---|
| city bed | 0–8 | Traffic hum, tyre noise, distant horns, crowd murmur |
| slow-down | 6.6–8 | The bed pitches down and filters out into **dead silence** at t = 8 |
| shrink | 8.0 | A descending "whomp" sweep |
| drops | 9.6–16 | Soft cup and bag thuds when each lands (slowed) |
| belt | 16.5 | Slow-motion strap creak / click |
| rolling | 24–32 | Low tyre rumble, slowed down |
| autobrake | 32.8 | Two warning chimes plus a slowed, pitched-down brake hiss |
| impact | 41.5 | Low crunch thud, airbag "pop" |
| switch-back | 46.0 | A reverse whoosh up; the bed returns, now with a siren and a car alarm |
| end | 59.6 | Bed cut for the loop |

Everything is ducked 6 dB under the VO, the mix peaks at −1 dBFS, and every sound is generated, so it's royalty-free.

## Closing question / pinned comment

- **Closing question:** "Who was in more danger: the kids walking, or the kids driving? 👇"
- **Pinned comment:** CDC body measurements + WHO growth reference (S1–S3).
