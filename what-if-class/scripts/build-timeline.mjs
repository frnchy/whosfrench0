// Voice first: cut VO into one file per line, snap each line (and its scene cut) to a hard beat, write plan/timeline.json.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const LOOP = 27.512789, LEN = 60;
const csv = fs.readFileSync('plan/beat_map.csv', 'utf8').trim().split('\n').slice(1).map((l) => l.split(','));
const beats = [];
for (let k = 0; k * LOOP < LEN; k++)
  for (const [, t, s, type] of csv) if (+t + k * LOOP < LEN) beats.push({t: +(+t + k * LOOP).toFixed(3), s: +s, type});

const words = JSON.parse(fs.readFileSync('plan/words.json', 'utf8'));
// [first word idx, last word idx, desired global start, scene (if line opens one), caption chunks [wordIdxWithinLine, text]]
const L = [
  [0, 2, 0.0, 'face', [[0, 'THIS IS YOU.']]],
  [3, 4, 1.4, null, [[0, 'IN CLASS.']]],
  [5, 10, 2.4, 'phone', [[0, 'TEACHER:'], [3, 'SOMETHING IMPORTANT.']]],
  [11, 19, 4.7, null, [[0, 'YOU: WATCHING'], [4, 'A DOG FALL'], [6, 'OFF A COUCH.']]],
  [20, 23, 7.5, null, [[0, 'FOR THE 4TH TIME.']]],
  [24, 28, 9.9, 'sad', [[0, 'LEARNED TODAY:'], [4, 'ZERO.']]],
  [29, 35, 13.6, 'whatif', [[0, 'BUT WHAT IF…'], [3, 'YOU ACTUALLY'], [5, 'PAID ATTENTION?']]],
  [36, 38, 17.8, 'esc1', [[0, 'YOU LOOK UP.']]],
  [39, 44, 19.4, null, [[0, 'YOU LEARN'], [4, 'A FRACTION.']]],
  [45, 47, 21.6, null, [[0, 'THEN ANOTHER ONE.']]],
  [48, 51, 25.2, 'esc2', [[0, 'YOU RAISE YOUR HAND.']]],
  [52, 58, 27.5, null, [[0, 'SHE HAS NEVER'], [4, 'SEEN THIS BEFORE.']]],
  [59, 63, 30.4, null, [[0, 'SHE TELLS'], [2, 'THE OTHER TEACHERS.']]],
  [64, 67, 33.5, 'esc3', [[0, 'YOU ACE THE TEST.']]],
  [68, 71, 35.4, null, [[0, 'THE WHOLE SCHOOL'], [3, 'CHEERS.']]],
  [72, 73, 37.5, null, [[0, 'BIRDS ARRIVE.']]],
  [74, 76, 39.2, null, [[0, 'NOBODY KNOWS WHY.']]],
  [77, 80, 41.4, 'peak', [[0, 'YOU NOW UNDERSTAND'], [3, 'EVERYTHING.']]],
  [81, 82, 43.9, null, [[0, 'MATH.'], [1, 'PHYSICS.']]],
  [83, 89, 45.9, null, [[0, 'WHY THE DOG'], [3, 'FELL OFF THE COUCH.']]],
  [90, 91, 48.6, null, [[0, 'YOU ASCEND.']]],
  [92, 95, 52.8, 'twist', [[0, 'THEN THE BELL'], [3, 'RINGS.']]],
  [96, 97, 56.6, null, [[0, 'YOUR MOVE.']]],
];

fs.mkdirSync('public/vo', {recursive: true});
const PRE = 0.06, POST = 0.15;
let prevEnd = 0;
const lines = L.map(([a, b, want, scene, chunks], i) => {
  const s0 = words[a][1] - PRE, s1 = words[b][2] + POST;
  const earliest = Math.max(want, prevEnd + 0.1);
  // first strong beat at/after the desired time (fall back to any beat)
  const beat = i === 0 ? {t: 0} : beats.find((x) => x.t >= earliest && x.t <= earliest + 0.5 && x.s >= 0.85) ?? beats.find((x) => x.t >= earliest);
  const start = beat.t;
  const file = `vo/L${String(i + 1).padStart(2, '0')}.mp3`;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', 'public/vo_full.mp3', '-ss', String(s0), '-to', String(s1), '-af', 'afade=t=in:d=0.02,afade=t=out:st=' + (s1 - s0 - 0.06) + ':d=0.06', 'public/' + file]);
  const ws = words.slice(a, b + 1).map(([w, ws_, we]) => ({w, start: +(start + ws_ - s0).toFixed(3), end: +(start + we - s0).toFixed(3)}));
  prevEnd = start + (s1 - s0);
  const caps = chunks.map(([wi, text], k) => ({text, start: i === 0 && k === 0 ? 0 : ws[wi].start, end: k + 1 < chunks.length ? ws[chunks[k + 1][0]].start : ws.at(-1).end + 0.35}));
  return {i: i + 1, file, start, dur: +(s1 - s0).toFixed(3), scene, words: ws, caps};
});
if (prevEnd > LEN - 1) throw new Error('VO overruns ' + prevEnd);
const scenes = lines.filter((l) => l.scene).map((l, k, arr) => ({id: l.scene, start: l.start, end: arr[k + 1]?.start ?? LEN}));
const w = (txt, li) => lines[li - 1].words.find((x) => x.w.toLowerCase().startsWith(txt)).start;
// counter keyed to words: [time, value]
const counter = [
  [0, 0], [w('fraction', 9), 1], [w('another', 10), 2], [w('one', 10), 3], [w('hand', 11), 12], [w('before', 12), 47],
  [w('teachers', 13), 120], [w('test', 14), 300], [w('cheers', 15), 1000], [w('arrive', 16), 1500], [w('everything', 18), 10000],
  [w('math', 19), 250000], [w('physics', 19), 1000000], [w('couch', 20), 99999999], [w('ascend', 21), -1], [w('rings', 22), 0],
];
fs.writeFileSync('plan/timeline.json', JSON.stringify({fps: 30, length: LEN, loop: LOOP, beats, lines, scenes, counter}, null, 1));
console.log(scenes.map((s) => `${s.id} ${s.start}-${s.end}`).join('\n'));
console.log(lines.map((l) => `L${l.i} @${l.start} +${l.dur}`).join(' | '));

// music bed: the track looped to 60 s, ducked so the VO sits ~6 dB above it (VO −20.7 LUFS, track −12.4 LUFS → ×0.19),
// cut to silence right before "Your move."
const cut = (lines.at(-1).start - 0.35).toFixed(3);
execFileSync('ffmpeg', ['-v', 'error', '-y', '-stream_loop', '2', '-i', 'public/music.m4a', '-af', `atrim=0:${LEN},volume=0.19,volume=enable='gte(t,${cut})':volume=0`, '-ar', '48000', 'public/music60.wav']);
