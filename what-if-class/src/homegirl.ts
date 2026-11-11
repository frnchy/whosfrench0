// Episode 3: "What if your homeboy turned into a girl?" — captions only, cut to the beat.
// Natural rooms and lighting; each joke holds long enough to read.
import plan from '../plan/homegirl.json';
import { shell, bedroom } from './bibi';
import { Builder, buildChar, LOOKS, rnd, clamp, easeOut, lerp, type Char, type World, type V3, type Cam, type Pose, type Look, type Expr } from './world';

export const LEN = plan.length;
export const BEATS: { t: number; s: number }[] = plan.beats;

// ---------- cast (the homeboy keeps hoodie, jeans, shoes and skin: same person) ----------
const HB: Look = { skin: '#8a5a3c', top: '#ffd60a', pants: '#3d7bd9', shoe: '#ffffff', hair: '#1a1a1a', style: 'spiky' };
const HG: Look = { ...HB, style: 'long' };
const MOM: Look = { ...LOOKS.teacher, top: '#ff5d8f' };
const CLERK: Look = { skin: '#f0c8a8', top: '#ff7b54', pants: '#2f3a56', shoe: '#fff', hair: '#e02424', style: 'cap' };
const CRUSH: Look = LOOKS.kids[0];
const BOYS: Look[] = [LOOKS.kids[2], { ...LOOKS.kids[3], top: '#3f8f4f' }, { ...LOOKS.kids[1], top: '#e0743a' }];

type Ctx = { t: number; lt: number; since: number; n: number; bi: number };
type Shot = { chars: Char[]; cam: Cam; props?: (b: Builder, c: Ctx) => void; flash?: number; face?: boolean };
const mk = (id: string, look: Look, x: number, expr: Expr, pose: Pose = { mode: 'stand' }, o: Partial<Char> = {}): Char => ({ id, look, pos: [x, 0, 0], rotY: 0, pose, expr, gaze: [0, 1.2, 6], fg: true, ...o });
const girl = (x: number, expr: Expr, pose?: Pose) => mk('hb', HG, x, expr, pose, { acc: { bow: '#ff4fa3' }, blush: true });
const boy = (x: number, expr: Expr, pose?: Pose) => mk('hb', HB, x, expr, pose);
const you = (x: number, expr: Expr, pose?: Pose, o: Partial<Char> = {}) => mk('you', LOOKS.you, x, expr, pose, o);
/** celebrating: hop on the beat, arms alternate */
const dance = (c: Ctx, seed = 0): Pose => {
  const up = (c.bi + seed) % 2 === 0;
  const arms = { armL: [up ? -2.9 : -1.2, -0.3] as [number, number], armR: [up ? -1.2 : -2.9, 0.3] as [number, number] };
  return c.since < 0.2 ? { mode: 'air', lift: Math.sin((c.since / 0.2) * Math.PI) * 0.1, ...arms } : { mode: 'stand', ...arms };
};
const still: Pose = { mode: 'stand' };

const SOLO: Cam = { pos: [0.12, 1.0, 3.3], look: [0, 0.8, 0], fov: 40 };
const FACE: Cam = { pos: [0.05, 1.14, 2.0], look: [0, 0.98, 0], fov: 40 };
const DUO: Cam = { pos: [0, 1.05, 4.4], look: [0, 0.85, 0], fov: 40 };
const TRIO: Cam = { pos: [0, 1.1, 5.6], look: [0, 0.85, 0], fov: 40 };
const face = (ch: Char): Shot => ({ chars: [ch], cam: FACE, face: true });

// ---------- sets ----------
const SETS: Record<string, { warm: number; bg: string; build: (b: Builder) => void }> = {
  room: { warm: 0.15, bg: '#78818d', build: bedroom },
  den: { warm: 0.6, bg: '#e2b07d', build: (b) => { shell(b, '#b9773f', '#e2b07d'); b.part(null, 'couch', 'box', [2.0, 0.45, 0.7], [0, 0.225, -1.5], '#4f6fa8'); b.part(null, 'couchBack', 'box', [2.0, 0.55, 0.2], [0, 0.72, -1.8], '#44608f', { solid: false }); b.part(null, 'rug', 'box', [2.4, 0.02, 1.4], [0, 0.01, 0.1], '#c0583a', { solid: false, flat: true }); } },
  home: { warm: 0.7, bg: '#f3d9b0', build: (b) => { shell(b, '#c9a27a', '#f3d9b0'); b.part(null, 'counter', 'box', [3.2, 0.9, 0.5], [0, 0.45, -1.9], '#fbfaf3'); b.part(null, 'fridge', 'box', [0.8, 1.9, 0.6], [1.9, 0.95, -1.9], '#dfe3ea'); } },
  shop: { warm: 0.6, bg: '#d9685a', build: (b) => { shell(b, '#8a8f98', '#d9685a'); b.part(null, 'till', 'box', [3.0, 0.95, 0.5], [0, 0.475, -1.8], '#6b4a2f'); } },
  out: { warm: 0.9, bg: '#9fd3ff', build: (b) => { shell(b, '#7cc36a', null); for (let i = 0; i < 5; i++) b.part(null, `cloud${i}`, 'sphere', [3, 1.2, 1.6], [-7 + i * 3.4, 4.2 + rnd(i) * 2.5, -9], '#ffffff', { solid: false }); for (let i = 0; i < 3; i++) { b.part(null, `tree${i}`, 'sphere', [1.8, 1.8, 1.8], [-3 + i * 3, 2.3, -5], '#4caf50', { solid: false }); b.part(null, `trunk${i}`, 'box', [0.3, 1.6, 0.3], [-3 + i * 3, 0.8, -5], '#6b4a2f', { solid: false }); } } },
};

// ---------- props ----------
const sym = (b: Builder, id: string, text: string, pos: V3, size: number, c: Ctx) => b.part(null, id, 'plane', [size * easeOut(c.lt / 0.15), size * easeOut(c.lt / 0.15), 1], pos, '#fff', { tex: `sym:${text}`, emissive: 1, solid: false, fg: true });
function fries(b: Builder, pos: V3) {
  const n = b.node(null, pos);
  b.part(n, 'friesBox', 'box', [0.16, 0.18, 0.09], [0, 0, 0], '#ff2d2d', { solid: false, fg: true });
  for (let i = 0; i < 5; i++) b.part(n, `fry${i}`, 'box', [0.025, 0.16, 0.025], [-0.055 + i * 0.028, 0.13 + (i % 2) * 0.03, 0], '#ffd60a', { solid: false, fg: true }, [0, 0, (i - 2) * 0.08]);
}
function burger(b: Builder, pos: V3, spin: number) {
  const n = b.node(null, pos, [0.3, spin, 0]);
  ([['#e0a04a', -0.06, 0.07], ['#6b3a1e', 0, 0.05], ['#4caf50', 0.035, 0.02], ['#e0a04a', 0.085, 0.08]] as const).forEach(([col, y, h], i) => b.part(n, `bun${i}`, 'cyl', [0.26, h, 0.26], [0, y, 0], col, { solid: false }));
}
function confetti(b: Builder, t: number) {
  for (let i = 0; i < 60; i++) b.part(null, `conf${i}`, 'box', [0.07, 0.012, 0.1], [(rnd(i + 11) - 0.5) * 3.2, 3.2 - ((t * (0.9 + rnd(i) * 0.6) + rnd(i + 3) * 3.2) % 3.2), -0.6 + rnd(i + 21) * 1.6], ['#ff4fa3', '#19c8ff', '#ffd60a', '#ffffff'][i % 4], { solid: false, flat: true }, [t * 3 + i, i, t * 2]);
}

// ---------- the script: [seconds, caption, set, shot] — each start is snapped to a beat ----------
const E: [number, string, string, (c: Ctx) => Shot][] = [
  [1.9, 'THIS IS YOUR HOMEBOY.', 'room', (c) => ({ chars: [boy(0, 'joy', dance(c))], cam: SOLO })],
  [1.2, 'ONE MORNING…', 'room', () => face(boy(0, 'side'))],
  [0.9, 'POOF.', 'room', (c) => ({
    chars: [girl(0, 'shock')], cam: SOLO, flash: clamp(1 - c.lt / 0.15),
    props: (b) => { for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2, r = 0.25 + c.lt * 1.4; b.part(null, `puff${i}`, 'sphere', [0.3 + c.lt * 0.4, 0.3 + c.lt * 0.4, 0.3 + c.lt * 0.4], [Math.cos(a) * r, 0.75 + Math.sin(a) * r, 0.25], '#ffffff', { opacity: Math.round(clamp(1 - c.lt / 0.6) * 5) / 5, solid: false }); } },
  })],
  [1.9, "HE'S A GIRL NOW.", 'room', () => ({ chars: [girl(0, 'shock', { mode: 'stand', armL: [0, -0.6], armR: [0, 0.6] })], cam: SOLO })],
  [1.4, 'YOU: "BRO??"', 'room', () => face(you(0, 'shock'))],
  [1.4, 'HER: "BRO."', 'room', () => face(girl(0, 'side'))],
  [1.5, 'SAME HOODIE.', 'den', (c) => ({ chars: [girl(0, 'happy', { mode: 'stand', armL: [0, -1.2], armR: [0, 1.2] })], cam: SOLO, props: (b) => sym(b, 's', 'SAME', [0.4, 1.5, 0.3], 0.5, c) })],
  [1.7, 'SAME $20 SHE OWES YOU.', 'den', (c) => ({ chars: [you(-0.42, 'side', still, { gaze: [0.42, 1.1, 0] }), girl(0.42, 'happy')], cam: DUO, props: (b) => sym(b, 's', '$20', [0, 1.75, 0], 0.8, c) })],
  [2.0, 'STILL COOKS YOU AT VIDEO GAMES.', 'den', (c) => ({ chars: [you(-0.42, 'sad'), girl(0.42, 'joy', dance(c))], cam: DUO, props: (b) => sym(b, 's', `${Math.min(c.n + 3, 7)}-0`, [0, 1.85, 0], 0.9, c) })],
  [1.2, '7–0.', 'den', () => face(you(0, 'cry'))],
  [1.9, 'STILL STEALS YOUR FRIES.', 'den', (c) => ({ chars: [you(-0.42, 'shock', still, { gaze: [0.42, 1.3, 0] }), girl(0.42, 'joy')], cam: DUO, props: (b) => fries(b, [lerp(-0.42, 0.42, easeOut(c.lt / 0.9)), 1.62, 0.1]) })],
  [1.2, 'BUT NOW…', 'den', () => face(girl(0, 'happy'))],
  [1.9, 'YOUR MOM LIKES HER MORE.', 'home', (c) => ({ chars: [you(-0.66, 'sad'), mk('mom', MOM, 0, 'joy', { mode: 'stand', armL: [-1.4, -0.9] }, { gaze: [0.66, 1.1, 0] }), girl(0.66, 'joy')], cam: TRIO, props: (b) => sym(b, 's', 'FAVE', [0.66, 1.8, 0], 0.7, c) })],
  [1.9, 'SHE GETS FREE FOOD.', 'shop', (c) => ({ chars: [mk('clerk', CLERK, -0.42, 'happy', still, { gaze: [0.42, 1.1, 0] }), girl(0.42, 'joy')], cam: DUO, props: (b) => { burger(b, [lerp(-0.3, 0.3, easeOut(c.lt / 0.9)), 1.45, 0.15], c.t * 2); sym(b, 's', 'FREE', [0, 1.9, 0], 0.7, c); } })],
  [1.9, 'YOU GET CHARGED EXTRA.', 'shop', (c) => ({ chars: [mk('clerk', CLERK, -0.42, 'side'), you(0.42, 'shock')], cam: DUO, props: (b) => sym(b, 's', `$${9 + Math.min(c.n, 4) * 5}.99`, [0, 1.85, 0], 0.9, c) })],
  [1.9, 'YOUR CRUSH TEXTS HER.', 'out', (c) => ({ chars: [mk('crush', CRUSH, -0.42, 'joy', dance(c, 1)), girl(0.42, 'joy', dance(c))], cam: DUO, props: (b) => sym(b, 's', 'BFF', [0, 1.85, 0], 0.8, c) })],
  [1.2, 'NOT YOU.', 'out', () => face(you(0, 'cry'))],
  [1.9, 'THE BOYS ARE CONFUSED.', 'out', (c) => ({ chars: BOYS.map((l, i) => mk(`boy${i}`, l, (i - 1) * 0.66, i === 1 ? 'shock' : 'side')), cam: TRIO, props: (b) => { for (let i = 0; i <= Math.min(c.n, 2); i++) sym(b, `q${i}`, '?', [(i - 1) * 0.66, 1.75, 0], 0.5, { ...c, lt: c.since + (c.n > i ? 1 : 0) }); } })],
  [1.9, 'SHE STILL BURPS THE LOUDEST.', 'out', (c) => ({ chars: [girl(0, 'shock', { mode: 'stand', lean: -0.15, armL: [0, -0.8], armR: [0, 0.8] })], cam: SOLO, props: (b) => sym(b, 's', 'BUURP', [0.12, 1.55, 0.4], 0.5 + 0.3 * easeOut(c.lt / 1.2), c) })],
  [1.4, 'RESPECT.', 'out', (c) => ({ chars: BOYS.map((l, i) => mk(`boy${i}`, l, (i - 1) * 0.66, 'joy', dance(c, i))), cam: TRIO })],
  [1.5, 'YOU: "TURN BACK?"', 'den', () => face(you(0, 'sad'))],
  [1.4, 'HER: "NAH."', 'den', () => face(girl(0, 'side'))],
  [1.9, '"I GET FREE FRIES NOW."', 'den', () => ({ chars: [girl(0, 'joy', { mode: 'stand', armL: [-2.6, -0.4], armR: [-2.6, 0.4] })], cam: SOLO, props: (b) => { for (let i = 0; i < 3; i++) fries(b, [-0.36 + i * 0.36, 1.55 + (i % 2) * 0.1, 0.2]); } })],
  [1.9, 'STILL YOUR HOMEBOY.', 'out', (c) => ({ chars: [you(-0.42, 'joy', dance(c, 1)), girl(0.42, 'joy', dance(c))], cam: DUO, props: (b) => confetti(b, c.t) })],
  [1.5, 'JUST WITH BETTER HAIR.', 'out', () => face(girl(0, 'joy'))],
  [2.4, '…STILL OWES YOU $20.', 'room', () => face(you(0, 'side'))],
  [9, 'SEND THIS TO YOUR HOMEBOY.', 'out', (c) => ({ chars: [you(-0.42, 'joy', dance(c, 1)), girl(0.42, 'joy', dance(c))], cam: DUO, props: (b) => confetti(b, c.t) })],
];
const near = (t: number) => BEATS.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a)).t;
const STARTS = E.reduce<number[]>((acc, _, k) => [...acc, k ? near(acc[k - 1] + E[k - 1][0]) : 0], []);
if (STARTS.some((s, k) => k && s <= STARTS[k - 1])) throw new Error('script entries collapsed onto one beat');
if (STARTS[STARTS.length - 1] > LEN - 1.5) throw new Error('script overruns the video');

export const caps = E.map(([, text], k) => ({ text, start: STARTS[k], end: STARTS[k + 1] ?? LEN }));
// "bro" count jumps with each new joke
const TICKS = E.reduce<number[]>((acc, _, k) => [...acc, k < 2 ? 0 : (acc[k - 1] ?? 0) + 1 + Math.floor(rnd(k) * 12)], []);
const beatIdx = (t: number) => { let i = 0; while (i + 1 < BEATS.length && BEATS[i + 1].t <= t + 1e-6) i++; return i; };
const entryAt = (t: number) => { let k = 0; while (k + 1 < E.length && t >= STARTS[k + 1]) k++; return k; };
export const counterAt = (t: number) => { const k = entryAt(t); return { value: TICKS[k], from: TICKS[k - 1] ?? 0, since: t - STARTS[k] }; };
export const titleAt = (t: number) => t < STARTS[2];
export const THUMB_T = STARTS[3] + 0.6;

export function world(t: number): World {
  const k = entryAt(t), bi = beatIdx(t);
  const c: Ctx = { t, lt: t - STARTS[k], since: t - BEATS[bi].t, bi, n: bi - beatIdx(STARTS[k]) };
  const shot = E[k][3](c), set = SETS[E[k][2]];
  const b = new Builder('env');
  set.build(b);
  shot.props?.(b, c);
  // slow push-in on every shot
  const z = 1 - Math.min(c.lt * 0.025, 0.08);
  const cam: Cam = { ...shot.cam, pos: shot.cam.pos.map((p, i) => shot.cam.look[i] + (p - shot.cam.look[i]) * z) as V3 };
  return { scene: `s${k}`, t, cam, warm: set.warm, blur: shot.face ? 9 : 4, bg: set.bg, flash: shot.flash ?? 0, chars: shot.chars, checks: [], parts: [...b.done(), ...shot.chars.flatMap((ch) => buildChar(ch, t).parts)] };
}
