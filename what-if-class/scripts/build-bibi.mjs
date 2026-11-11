// Episode 2 (captions only): beat list relative to the clip start (song 1:35 = file 0:00) + 48 s music bed.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const LEN = 48, OFFSET = 95;
const beats = fs.readFileSync('plan/bibi_beat_map.csv', 'utf8').trim().split('\n').slice(1).map((l) => l.split(','))
  .map((c) => ({t: +(+c[2] - OFFSET).toFixed(3), s: +c[3]})).filter((b) => b.t < LEN);
const drop = +(115.027 - OFFSET).toFixed(3);
fs.writeFileSync('plan/bibi.json', JSON.stringify({length: LEN, drop, beats}));
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', 'public/bibi_song.mp3', '-t', String(LEN), '-af', `afade=t=out:st=${LEN - 0.8}:d=0.8`, '-ar', '48000', 'public/bibi_music.wav']);
console.log(beats.length, 'beats, drop at', drop);
