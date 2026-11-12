#!/bin/bash
# usage: fetch.sh EP EXPIRES  then rows on stdin: LINE SRC_SESSION/SRC_GEN SRC_SIG WORDS_SESSION/WORDS_GEN WORDS_SIG
# Saves the take that was aligned (public/EP/vo/line_NN.mp3) and its word timings (plan/EP/words/line_NN.json).
cd "$(dirname "$0")/.."; EP=$1; X=$2; B=https://elevenlabsusercontent.com/database/workspace/f480e5baa7d94b7e8284cd1e9ee130b0/content_generation
mkdir -p public/$EP/vo plan/$EP/words
while read -r n src ssig w wsig; do [ -z "$n" ] && continue; k=$(printf %02d $n); g=${w#*/}
  curl -sSf -o public/$EP/vo/line_$k.mp3 "$B/$src/content.mp3?Expires=$X&KeyName=assets-cdn-key-1&Signature=$ssig" || echo "FAIL audio $n"
  curl -sSf -o plan/$EP/words/line_$k.json "$B/$w/words.json?response-content-disposition=attachment%3B%20filename%3D%22transcript-$g-words.json%22&Expires=$X&KeyName=assets-cdn-key-1&Signature=$wsig" || echo "FAIL words $n"
done; ls public/$EP/vo | wc -l; ls plan/$EP/words | wc -l
