# 499: What If the Sun Vanished (60 s vertical short)

| File | What |
|---|---|
| `out/sun_499_final.mp4` | 1080×1920, 30 fps, H.264 + AAC 48 kHz, 60.0 s, 38 MB |
| `out/sun_499_noCaptions.mp4` | Same edit and mix with no counter, captions, scrim, shake or flash (for re-editing) |
| `out/captions.srt` | Full spoken lines, timed to the VO, for platform captions |
| `build/` | Source. `timeline.py` holds every timing; `build.py` runs the pipeline; `sfx.py` synthesizes the sound design |
| `audio/vo/` | The raw Higgsfield `seed_audio` VO lines (voice "Gideon", speech_rate -10), one file per line |

Pinned comment: **Gravity: instant or 8 minutes? 👇**

## Rebuild

```bash
./fetch_clips.sh                 # clips/ is git-ignored (44 MB)
pip install numpy scipy pillow   # plus ffmpeg on PATH
python3 build/build.py all       # prep, base, audio, final, nocap, srt, check
```

To change a timing, edit `build/timeline.py` and run `python3 build/build.py prep audio final nocap srt check`.
Rebuild `base` only when the clip edit changes. Captions and counter keys point at VO line ids, so moving a VO line moves everything tied to it.
`check` prints every VO, caption and counter frame.

## How it is built

- **VO first.** `prep` trims each line so it starts on its first syllable, caps internal pauses at 0.45 s, drops breath noise before the first word, and splits the countdown into separate words. Each line's `at` time in the timeline is the frame where its first syllable is heard.
- **Captions** start on the first syllable of their line, so the timing error is 0 frames by construction. They pop in at 0.85 → 1.0 scale over 4 frames and cut out hard. "8 MIN 20 SEC" switches on the spoken "eight", and "STRAIGHT LINE" on "Earth flies off".
- **Counter** shows 499 on frame 0 and holds through the hook, then eases 499 → 440 → 340 → 180 → 11. From there it snaps to 10/5/3/2/1/0 on each spoken word, with a tick pulse whenever the integer changes after 30 s. On "Zero" (frame 1200, 40.000 s) it turns red, with a 1-frame white flash and a 6-frame shake. It snaps back to 499 for the last 9 frames so the loop is seamless.
- **Scrim.** A dark gradient on the left keeps the counter readable. It is stronger over the clip-1 close-up (see below).
- **Sound** is all procedurally generated, so it is royalty-free: sub drone (0–40 s), heartbeat speeding up from 27 s to 40 s, a hard cut to silence into the zero hit (bass + glass crack + whoosh), then wind and ice creaks from 46 s. Everything is sidechain-ducked up to 8 dB under the VO.
- **Measured levels:** the mix peaks at -1.0 dBFS, integrated loudness is -14.9 LUFS, and the VO runs about 17 dB above the bed while it is speaking.

## Clip check (frames sampled every 2 s, plus 0.25–0.5 s around key moments)

No AI text or garbled lettering in any clip.

1. **Clip 1 is OK but has a layout problem.** The Sun dims and vanishes between 0.5 and 1.75 s, which lines up with "The Sun just vanished". Earth stays lit. From about 5 s the shot cuts to a close-up of a man looking up, and his face fills the left third, so the counter sits on his cheek and hair. **Fix applied:** a stronger left scrim (80 %) from 4.6 to 15 s. It reads well, but a regenerated close-up framed to the right would be cleaner.
2. **Clip 2 mostly matches.** It shows Earth in close-up with a glowing ring crawling around a black disc (the empty Sun) toward Earth. The ring sits around 25–40 % of the frame width and partly overlaps the counter. A 55 % scrim keeps the counter readable. Earth does not visibly orbit; it is a slow push-in.
3. **Clip 3 has a background problem, which is fixed.** It was rendered on a **flat grey backdrop with a hard dark bar on the left third**, not space. **Fix applied:** a curves grade crushes the grey to near-black, which also hides the seam of the bar. Action: the wavefront hits around 3 s, Earth goes dark (city lights) by about 11 s, and from 11.5 s Earth shrinks away (flies off).
   **Retime:** the first 1.5 s are trimmed so the hard cut to the fly-off lands exactly on "Zero" at 40.0 s. The fly-off then plays at 0.6× (blended frames) so it is still on screen during "Earth flies off in a straight line". A 4-frame whip blur covers the cut at 30 s.
4. **Clip 4 is OK.** Frozen, cracked Earth drifts while a small orange star brightens in the upper middle. The left third is dark. The first 0.875 s are trimmed so the clip still ends on the brightest star frame, which then cuts back to frame 1.

## Deviations from the brief

- **VO line 4 says "Nope. Gravity moves at the speed of light."** Higgsfield's moderation falsely flagged "No. Gravity …" three times. "Nope." went through.
- **The hook line runs 0–6.1 s, not 0–3 s.** The spoken "four hundred and ninety-nine seconds" is long. "499" is on screen from frame 0 and the VO starts at sample 0, so the hook still lands in the first 1.5 s. Every later line was retimed to the real VO, as the brief allows.
- **The 0 caption** appears as a big white "0" under the red counter, with the shake and flash.
- **Stack:** Python (Pillow and numpy) composites the overlay frame by frame, with ffmpeg for decode and encode, instead of Remotion. That means no Chrome or npm dependency, and the timings are just as easy to change in `timeline.py`.
- **Font:** Anton (OFL), with emoji from Noto Color Emoji.
