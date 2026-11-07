#!/usr/bin/env bash
# Full rebuild, 100% code: voice (local Kokoro TTS) -> word timings (Whisper) ->
# 3D render (Remotion + three.js) -> synthesized sound + mix -> final MP4 + SRT.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p .cache/tts out
for f in kokoro-v1.0.onnx voices-v1.0.bin; do
  [ -s .cache/tts/$f ] || curl -fSL -o .cache/tts/$f https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/$f
done
python3 tools/vo.py                      # video/public/vo/*.wav + video/src/vo_timing.json
(cd video && [ -d node_modules ] || npm ci)
(cd video && npx remotion render src/index.ts WhatIfSix ../.cache/video_silent.mp4 --muted --codec=h264 --crf=17)
python3 tools/mix.py                     # .cache/mix.wav + out/captions.srt
ffmpeg -v error -y -i .cache/video_silent.mp4 -i .cache/mix.wav -map 0:v -map 1:a \
  -c:v copy -c:a aac -b:a 192k -ar 48000 \
  -af "loudnorm=I=-14:TP=-1.6:LRA=11" -movflags +faststart -shortest out/whatif_six_final.mp4
echo "done: out/whatif_six_final.mp4"
