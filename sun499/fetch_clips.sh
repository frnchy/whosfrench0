#!/usr/bin/env bash
# Downloads the 4 Kling clips into clips/. If your network blocks the CDN,
# download them in a browser and save as clips/clip1.mp4 ... clip4.mp4.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p clips
base=https://d8j0ntlcm91z4.cloudfront.net/user_3Lgvhsp7lvSmX220rph9KSGByuc
ids=(hf_20261105_181525_0a2f1f7d-1503-400f-bd11-6f468c2ed77b
     hf_20261105_181459_bdda616a-bf26-4d40-beb8-4274b72ce2ab
     hf_20261105_181500_1c93c209-54f2-45fb-88fe-8ac5502e569c
     hf_20261105_181459_38ecd3bd-a0b3-4848-acca-6c60b1e69c34)
for i in 1 2 3 4; do
  [ -s clips/clip$i.mp4 ] || curl -fSL -o clips/clip$i.mp4 "$base/${ids[$((i-1))]}.mp4"
done
