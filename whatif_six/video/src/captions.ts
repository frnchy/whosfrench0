// Word-by-word captions built from the measured VO word timestamps.
import vo from './vo_timing.json';

type Word = {w: string; s: number; e: number};
type Line = {at: number; dur: number; text: string; words: Word[]};
export type Chunk = {start: number; end: number; tokens: {text: string; key: boolean}[]};

const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, '');

// spoken phrase -> on-screen text (numbers as digits)
const REPL: [string[], string][] = [
  [['five', 'foot', 'six'], '5′6″'],
  [['four', 'foot', 'nine'], '4′9″'],
  [['twenty', 'five', 'miles', 'an', 'hour'], '25 mph'],
  [['thirty', 'seven', 'feet'], '37 feet'],
  [['twenty', 'inches'], '20 inches'],
  [['eighty', 'percent'], '80%'],
  [['ninety', 'percent'], '90%'],
  [['five', 'seconds'], '5 seconds'],
  [['six', 'year', 'olds'], '6-year-old’s'],
  [['six', 'year', 'old'], '6-year-old'],
  [['second', 'one'], 'Second 1'],
  [['second', 'two'], 'Second 2'],
  [['second', 'three'], 'Second 3'],
  [['second', 'four'], 'Second 4'],
  [['second', 'five'], 'Second 5'],
  [['times', 'square'], 'Times Square'],
  [['six'], '6'],
];
const KEYS = new Set(['times square', 'weight', 'neck', 'brake', 'themselves', 'braking', 'taxi', 'airbag', 'back', 'barefoot', 'heads', 'brain', 'walking', 'driving', 'grip', 'shoes', 'rush hour']);

function tokens(line: Line) {
  const ws = line.words;
  const out: {text: string; s: number; e: number; stop: boolean}[] = [];
  let i = 0;
  while (i < ws.length) {
    let hit: [number, string] | null = null;
    for (const [seq, disp] of REPL) {
      if (i + seq.length > ws.length) continue;
      if (seq.every((x, k) => norm(ws[i + k].w) === x)) {
        hit = [seq.length, disp];
        break;
      }
    }
    const n = hit ? hit[0] : 1;
    const last = ws[i + n - 1].w;
    const trail = (last.match(/[.,?!:…]+$/) || [''])[0];
    let text = hit ? hit[1] : ws[i].w.replace(/[.,!:;…]+$/, '').replace(/\.\.\.$/, '');
    if (trail.includes('?')) text = text.replace(/\?*$/, '?');
    out.push({text, s: line.at + ws[i].s, e: line.at + ws[i + n - 1].e, stop: trail.length > 0});
    i += n;
  }
  return out;
}

function build(): Chunk[] {
  const lines = Object.values(vo as Record<string, Line>).sort((a, b) => a.at - b.at);
  const chunks: Chunk[] = [];
  for (const line of lines) {
    const toks = tokens(line);
    let cur: typeof toks = [];
    const flush = () => {
      if (!cur.length) return;
      let keyUsed = false;
      chunks.push({
        start: cur[0].s,
        end: cur[cur.length - 1].e + 0.3,
        tokens: cur.map((tk) => {
          const k = !keyUsed && (/\d/.test(tk.text) || KEYS.has(tk.text.toLowerCase().replace(/[^a-z ]/g, '')));
          if (k) keyUsed = true;
          return {text: tk.text, key: k};
        }),
      });
      cur = [];
    };
    for (const tk of toks) {
      const len = cur.reduce((a, b) => a + b.text.length + 1, 0) + tk.text.length;
      if (cur.length >= 3 || (cur.length > 0 && len > 16)) flush();
      cur.push(tk);
      if (tk.stop) flush();
    }
    flush();
  }
  // hard cuts: a chunk ends when the next one starts
  for (let i = 0; i < chunks.length - 1; i++) chunks[i].end = Math.min(chunks[i].end, chunks[i + 1].start);
  return chunks;
}

export const CHUNKS = build();
export const chunkAt = (t: number) => CHUNKS.find((c) => t >= c.start && t < c.end) || null;
