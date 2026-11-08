#!/bin/bash
# usage: ./render.sh 1   → out/ep1/{final.mp4, final_clean.mp4, thumbnail.png, captions.srt, validate-report.md}
n=$1; EP=ep$n; cd "$(dirname "$0")"
B=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
mkdir -p out/$EP public/renders
node --experimental-strip-types sim/validate.ts $EP > out/$EP/validate.log 2>&1 || { echo "VALIDATOR BLOCKED RENDER" > out/$EP/render.log; exit 1; }
cp sim/validate-report-$EP.md out/$EP/validate-report.md
start=$(date +%s)
[ -f public/renders/${EP}_clean.mp4 ] || npx remotion render Ep$n-Clean public/renders/${EP}_clean.mp4 --browser-executable=$B --gl=swangle --codec=h264 --crf=18 --audio-bitrate=192k --concurrency=4 > out/$EP/render_clean.log 2>&1 || exit 1
npx remotion render Ep$n-Final out/$EP/final_raw.mp4 --browser-executable=$B --codec=h264 --crf=18 --audio-bitrate=192k --concurrency=4 > out/$EP/render_final.log 2>&1 || exit 1
npx remotion still Ep$n-Final out/$EP/thumbnail.png --frame=40 --browser-executable=$B > out/$EP/render_thumb.log 2>&1 || exit 1
ffmpeg -v error -y -i out/$EP/final_raw.mp4 -c:v copy -af loudnorm=I=-14:TP=-1:LRA=11 -c:a aac -b:a 192k -ar 48000 -movflags +faststart out/$EP/final.mp4 || exit 1
ffmpeg -v error -y -i public/renders/${EP}_clean.mp4 -c:v copy -af loudnorm=I=-14:TP=-1:LRA=11 -c:a aac -b:a 192k -ar 48000 -movflags +faststart out/$EP/final_clean.mp4 || exit 1
rm out/$EP/final_raw.mp4
python3 plan/make_srt.py $EP > /dev/null
echo "DONE $(( $(date +%s) - start ))s" > out/$EP/render.log
