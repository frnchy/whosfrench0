// Episode 3: beat plan + music bed. Events are timed to the BACKBEAT (the snare on every 2nd beat), not to the
// detector's SNARE/KICK labels: those labels are noisy, which made the event spacing uneven.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const LEN = 28, FROM = 119.335 - 95; // earliest file time the video may open on
const hits = fs.readFileSync('plan/bibi_beat_map.csv', 'utf8').trim().split('\n').slice(1).map((l) => l.split(','))
  .map((c) => ({t: +c[2] - 95, s: +c[3], label: c[4]})).filter((h) => h.t >= FROM - 0.01 && h.t < FROM + LEN + 2);

// tempo from the data: median gap between hits that are one beat apart
const gaps = hits.slice(1).map((h, i) => h.t - hits[i].t).filter((g) => g > 0.4 && g < 0.56).sort((a, b) => a - b);
const Q = gaps[gaps.length >> 1] / 2; // half a beat
// position of every hit in half-beats, accumulated hit to hit so tempo error cannot drift
let idx = 0;
hits.forEach((h, i) => { if (i) idx += Math.round((h.t - hits[i - 1].t) / Q); h.i = idx; });
// the backbeat repeats every 4 half-beats: pick the phase the SNARE labels vote for
const votes = [0, 0, 0, 0];
for (const h of hits) if (h.label === 'SNARE/CLAP') votes[h.i % 4] += h.s;
const phase = votes.indexOf(Math.max(...votes));
console.log('half-beat', Q.toFixed(4), 's, snare-label votes per phase', votes.map((v) => v.toFixed(1)).join(' / '), '-> phase', phase);

// one snare slot every 4 half-beats; use the detected hit when there is one, otherwise fill the slot in
const byIdx = new Map(hits.map((h) => [h.i, h]));
const first = hits.find((h) => h.i % 4 === phase), START = first.t;
const beats = hits.filter((h) => h.t >= START - 1e-6 && h.i % 4 !== phase).map((h) => ({t: h.t, s: h.s, snare: false}));
let last = first;
for (let i = first.i; ; i += 4) {
  const h = byIdx.get(i) ?? {t: last.t + (i - last.i) * Q, s: 1, i};
  if (h.t - START >= LEN) break;
  beats.push({t: h.t, s: Math.max(h.s, 0.9), snare: true});
  last = h;
}
const out = beats.map((b) => ({...b, t: +(b.t - START).toFixed(3)})).filter((b) => b.t < LEN).sort((a, b) => a.t - b.t);
const sn = out.filter((b) => b.snare).map((b) => b.t), steps = sn.slice(1).map((t, i) => t - sn[i]);
if (Math.max(...steps) - Math.min(...steps) > 0.04) throw new Error('snare grid is not even: ' + Math.min(...steps) + '..' + Math.max(...steps));
fs.writeFileSync('plan/homegirl.json', JSON.stringify({length: LEN, beats: out}));
execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(START), '-i', 'public/bibi_song.mp3', '-t', String(LEN), '-af', `afade=t=out:st=${LEN - 0.6}:d=0.6`, '-ar', '48000', 'public/homegirl_music.wav']);
console.log(sn.length, 'snares, step', Math.min(...steps).toFixed(3), '..', Math.max(...steps).toFixed(3), 's, video opens at file time', START.toFixed(3));
