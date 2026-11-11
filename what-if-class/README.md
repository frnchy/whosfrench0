# What if you paid attention in class? — code-built blocky 3D short

60 s, 1080×1920, Remotion + Three.js. Every frame is rendered from code.

| Path | What |
|---|---|
| `plan/words.json` | VO word timestamps (ElevenLabs Scribe) |
| `scripts/build-timeline.mjs` | cuts the VO into one file per line, snaps each line + scene cut to a hard beat from `plan/beat_map.csv`, builds the 60 s music bed → `plan/timeline.json` |
| `src/world.ts` | pure scene description: `world(t)` → camera + every part as a world matrix (rig, props, poses, contacts) |
| `src/Scene3D.tsx`, `src/textures.ts` | renderer (two-layer depth of field) + pixel faces, phone app, board, paper |
| `src/Video.tsx` | captions, counter, title, beat shake, grade, audio |
| `sim/validate.ts` | contact/physics validator over all 1800 frames → `sim/validate-report.md` |
| `out/` | `final.mp4`, `final_clean.mp4`, `captions.srt`, `thumbnail.png`, `CREDITS.md`, `POSTING.md` |

```bash
npm i
node scripts/build-timeline.mjs && node scripts/srt.mjs
npx -y tsx sim/validate.ts        # must print 0 violations
npx remotion studio                # preview
npx remotion render WhatIf out/final_raw.mp4
```
Rendering here uses the preinstalled headless Chromium with SwiftShader (`remotion.config.ts`); on a normal machine remove `setBrowserExecutable`.
