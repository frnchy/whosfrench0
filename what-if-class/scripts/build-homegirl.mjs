// Episode 3: starts on the first fast beat after the drop of the same track, so frame 0 lands on a beat.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const LEN = 29, START = 119.335 - 95; // file time of the beat the video opens on
const beats = fs.readFileSync('plan/bibi_beat_map.csv', 'utf8').trim().split('\n').slice(1).map((l) => l.split(','))
  .map((c) => ({t: +(+c[2] - 95 - START).toFixed(3), s: +c[3]})).filter((b) => b.t >= 0 && b.t < LEN);
const gap = Math.max(...beats.slice(1).map((b, i) => b.t - beats[i].t));
if (gap > 0.5) throw new Error('gap between beats > 0.5 s: ' + gap); // house rule: nothing waits longer than half a second
fs.writeFileSync('plan/homegirl.json', JSON.stringify({length: LEN, beats}));
execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(START), '-i', 'public/bibi_song.mp3', '-t', String(LEN), '-af', `afade=t=out:st=${LEN - 0.6}:d=0.6`, '-ar', '48000', 'public/homegirl_music.wav']);
console.log(beats.length, 'beats, max gap', gap.toFixed(3));
