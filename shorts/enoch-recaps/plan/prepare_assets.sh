#!/bin/bash
# Copies the series' Higgsfield stills (gitignored there) into public/stills as JPEGs, plus the music bed.
set -e
cd "$(dirname "$0")/.."
A=../../enoch-series/assets
for e in 1 2 3 4 5 6 7 8; do
  src=$A/ep0$e/stills; [ $e = 1 ] && src=$A/stills
  mkdir -p public/stills/ep$e
  for k in 1 2 3 4 5 6 7 8; do ffmpeg -v error -y -i $src/0$k.png -q:v 3 public/stills/ep$e/0$k.jpg; done
done
cp $A/audio/music.mp3 public/music.mp3
