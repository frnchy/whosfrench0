#!/bin/bash
# usage: ./render.sh ep1   → out/ep1/{final.mp4, final_clean.mp4, thumbnail.png, captions.srt, validate-report.md}
EP=$1; cd "$(dirname "$0")"
B=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
mkdir -p out/$EP public/renders
node --experimental-strip-types sim/validate.ts $EP > out/$EP/validate.log 2>&1 || { echo "VALIDATOR BLOCKED RENDER" > out/$EP/render.log; exit 1; }
cp sim/validate-report-$EP.md out/$EP/validate-report.md
start=$(date +%s)
# clean pass in 300-frame silent chunks so a container restart only loses the chunk in progress; audio rendered once and muxed
if [ ! -f public/renders/${EP}_clean.mp4 ]; then
  P=public/renders/parts/$EP; mkdir -p $P; N=$(python3 -c "import json;print(json.load(open('src/timeline_$EP.json'))['frames'])")
  : > $P/list.txt
  for a in $(seq 0 300 $((N-1))); do b=$((a+299<N-1 ? a+299 : N-1)); c=$P/$(printf %05d $a).mp4
    [ -f $c ] || { npx remotion render $EP-Clean $c.tmp.mp4 --frames=$a-$b --muted --browser-executable=$B --gl=swangle --codec=h264 --crf=18 --concurrency=4 >> out/$EP/render_clean.log 2>&1 && mv $c.tmp.mp4 $c; } || exit 1
    echo "file '$(basename $c)'" >> $P/list.txt; done
  [ -f $P/audio.wav ] || { npx remotion render $EP-Audio $P/audio.tmp.wav --codec=wav --browser-executable=$B >> out/$EP/render_clean.log 2>&1 && mv $P/audio.tmp.wav $P/audio.wav; } || exit 1
  ffmpeg -v error -y -f concat -safe 0 -i $P/list.txt -i $P/audio.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest public/renders/${EP}_clean.mp4 || exit 1
fi
npx remotion render $EP-Final out/$EP/final_raw.mp4 --browser-executable=$B --codec=h264 --crf=18 --audio-bitrate=192k --concurrency=4 > out/$EP/render_final.log 2>&1 || exit 1
npx remotion still $EP-Final out/$EP/thumbnail.png --frame=40 --browser-executable=$B > out/$EP/render_thumb.log 2>&1 || exit 1
ffmpeg -v error -y -i out/$EP/final_raw.mp4 -c:v copy -af loudnorm=I=-14:TP=-1:LRA=11 -c:a aac -b:a 192k -ar 48000 -movflags +faststart out/$EP/final.mp4 || exit 1
ffmpeg -v error -y -i public/renders/${EP}_clean.mp4 -c:v copy -af loudnorm=I=-14:TP=-1:LRA=11 -c:a aac -b:a 192k -ar 48000 -movflags +faststart out/$EP/final_clean.mp4 || exit 1
rm out/$EP/final_raw.mp4
python3 plan/make_srt.py $EP > /dev/null
echo "DONE $(( $(date +%s) - start ))s" > out/$EP/render.log
