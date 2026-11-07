# What if everyone turned 6 for 5 seconds?

A 60 s vertical short (1080×1920, 30 fps). **Every frame is drawn by code**: a low-poly Times Square built in three.js and rendered with Remotion. There's no AI video.
The voiceover comes from an open-source TTS model (Kokoro) running locally, and the sound design is synthesized in numpy, so a render costs nothing and is identical every time.

| File | What |
|---|---|
| `out/whatif_six_final.mp4` | The finished video (H.264 + AAC) |
| `out/captions.srt` | Spoken lines with timings, for platform captions |
| `RESEARCH.md` | Every effect second by second, with its source (CDC, WHO, AAP, IIHS, NYC DOT, Dodds 2014, Lenroot & Giedd 2006) |
| `PLAN.md` | Time warp, shot list, VO script, HUD values, captions, sound cues |
| `story.json` | VO lines and beat times: the single source of truth |
| `video/src/` | Remotion project: `sim.ts` (physics in real time T), `time.ts` (slow-motion warp), `city.tsx`, `actors.tsx`, `camera.ts`, `overlay.tsx`, `captions.ts` |
| `tools/vo.py` | Kokoro TTS, one file per line, then Whisper word timings → `video/src/vo_timing.json` |
| `tools/mix.py` | Synthesized city bed, slow-motion SFX, ducking, peak −1 dBFS, `captions.srt` |

## Rebuild

```bash
pip install kokoro-onnx soundfile faster-whisper scipy numpy pillow
./build.sh
```

`build.sh` downloads the Kokoro model (about 350 MB, into `.cache/`) and installs the Node packages.

To check frames without a full render: `cd video && node stills.mjs 0 8.5 33 46.3`, then `python3 ../tools/sheet.py sheet.png ../.cache/stills/*.png`.

## How the slow motion works

`time.ts` maps screen time *t* to real time *T*:
- 1× until 6.6 s, then ⅛× for seconds 1–4 (8 s of screen each), and ⅙× for second 5.
- After the switch back (*T* = 5 s at *t* = 46 s) it returns to 1×.

Everything physical lives in real time in `sim.ts`, so the slowed physics stays correct:
- dropped cups fall at *g* = 9.81 m/s²
- cars coast at 25 mph (37 ft/s)
- the SUV autobrakes at 7.5 m/s²
- the taxi rear-ends it at about 13 mph

## Notes

- **Licence:** Remotion is free for individuals and companies of up to 3 people. Larger teams need a company licence (remotion.dev/license). Fonts are EB Garamond and Inter (OFL), voice model Kokoro (Apache-2.0).
- **No real brands:** billboards are abstract animated patterns, with no text or logos.
