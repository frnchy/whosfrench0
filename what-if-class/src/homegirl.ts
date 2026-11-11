// Episode 3: "What if your homeboy turned into a girl?" — captions only.
// House rules: bright colours only, an eye-catcher on frame 0, something changes on EVERY beat
// (camera punch, counter tick, sunburst step, sparkle, hop), nothing holds longer than 0.5 s.
import plan from '../plan/homegirl.json';
import { Builder, buildChar, LOOKS, rnd, clamp, easeOut, lerp, type Char, type World, type V3, type Cam, type Pose, type Look, type Expr } from './world';

export const LEN = plan.length;
export const BEATS: { t: number; s: number }[] = plan.beats;
const PAL = ['#ff4fa3', '#19c8ff', '#ffd60a', '#7dff5a', '#ff8a1f', '#b06bff'];

// ---------- cast (the homeboy keeps hoodie, jeans, shoes and skin: same person) ----------
const HB: Look = { skin: '#8a5a3c', top: '#ffd60a', pants: '#3d7bd9', shoe: '#ffffff', hair: '#1a1a1a', style: 'spiky' };
const HG: Look = { ...HB, style: 'long' };
const MOM: Look = { ...LOOKS.teacher, top: '#ff5d8f', pants: '#b06bff' };
const CLERK: Look = { skin: '#f0c8a8', top: '#ff7b54', pants: '#19c8ff', shoe: '#fff', hair: '#e02424', style: 'cap' };
const CRUSH: Look = LOOKS.kids[0];
const BOYS: Look[] = [LOOKS.kids[2], { ...LOOKS.kids[3], top: '#7dff5a' }, { ...LOOKS.kids[1], top: '#ff8a1f' }];

type Ctx = { t: number; lt: number; since: number; n: number; bi: number };
type Shot = { chars: Char[]; cam: Cam; props?: (b: Builder, c: Ctx) => void; flash?: number };
const mk = (id: string, look: Look, x: number, expr: Expr, pose: Pose = { mode: 'stand' }, o: Partial<Char> = {}): Char => ({ id, look, pos: [x, 0, 0], rotY: 0, pose, expr, gaze: [0, 1.2, 6], ...o });
const girl = (x: number, expr: Expr, pose?: Pose) => mk('hb', HG, x, expr, pose, { acc: { bow: '#ff4fa3' }, blush: true });
const boy = (x: number, expr: Expr, pose?: Pose) => mk('hb', HB, x, expr, pose);
const you = (x: number, expr: Expr, pose?: Pose, o: Partial<Char> = {}) => mk('you', LOOKS.you, x, expr, pose, o);
/** hop on every beat, arms alternate */
const dance = (c: Ctx, seed = 0): Pose => {
  const up = (c.bi + seed) % 2 === 0;
  const arms = { armL: [up ? -2.9 : -1.2, -0.3] as [number, number], armR: [up ? -1.2 : -2.9, 0.3] as [number, number] };
  return c.since < 0.2 ? { mode: 'air', lift: Math.sin((c.since / 0.2) * Math.PI) * 0.1, ...arms } : { mode: 'stand', ...arms };
};
const nod = (c: Ctx): Pose => ({ mode: 'stand', head: [c.bi % 2 ? 0.12 : -0.05, 0, 0] });

const SOLO: Cam = { pos: [0.12, 1.0, 3.3], look: [0, 0.8, 0], fov: 40 };
const FACE: Cam = { pos: [0.05, 1.14, 2.0], look: [0, 0.98, 0], fov: 40 };
const DUO: Cam = { pos: [0, 1.05, 4.4], look: [0, 0.85, 0], fov: 40 };
const TRIO: Cam = { pos: [0, 1.1, 5.6], look: [0, 0.85, 0], fov: 40 };

// ---------- props ----------
const sym = (b: Builder, id: string, text: string, pos: V3, size: number, c: Ctx) => {
  const k = easeOut(c.lt / 0.12) * (1 + 0.25 * clamp(1 - c.since / 0.12)); // pops in, then pulses on each beat
  b.part(null, id, 'plane', [size * k, size * k, 1], pos, '#fff', { tex: `sym:${text}`, emissive: 1, solid: false });
};
function fries(b: Builder, pos: V3) {
  const n = b.node(null, pos);
  b.part(n, 'friesBox', 'box', [0.16, 0.18, 0.09], [0, 0, 0], '#ff2d2d', { solid: false });
  for (let i = 0; i < 5; i++) b.part(n, `fry${i}`, 'box', [0.025, 0.16, 0.025], [-0.055 + i * 0.028, 0.13 + (i % 2) * 0.03, 0], '#ffd60a', { solid: false }, [0, 0, (i - 2) * 0.08]);
}
function burger(b: Builder, pos: V3, spin: number) {
  const n = b.node(null, pos, [0.3, spin, 0]);
  ([['#e0a04a', -0.06, 0.07], ['#6b3a1e', 0, 0.05], ['#7dff5a', 0.035, 0.02], ['#e0a04a', 0.085, 0.08]] as const).forEach(([col, y, h], i) => b.part(n, `bun${i}`, 'cyl', [0.26, h, 0.26], [0, y, 0], col, { solid: false }));
}
function confetti(b: Builder, t: number) {
  for (let i = 0; i < 60; i++) b.part(null, `conf${i}`, 'box', [0.07, 0.012, 0.1], [(rnd(i + 11) - 0.5) * 3.2, 3.2 - ((t * (0.9 + rnd(i) * 0.6) + rnd(i + 3) * 3.2) % 3.2), -0.6 + rnd(i + 21) * 1.6], PAL[i % 6], { solid: false, flat: true }, [t * 3 + i, i, t * 2]);
}

// ---------- the script: [seconds, caption, shot] — each start is snapped to a beat ----------
const E: [number, string, (c: Ctx) => Shot][] = [
  [1.0, 'THIS IS YOUR HOMEBOY.', (c) => ({ chars: [boy(0, 'joy', dance(c))], cam: SOLO })],
  [0.7, 'ONE DAY…', (c) => ({ chars: [boy(0, 'side', nod(c))], cam: FACE })],
  [0.7, 'POOF.', (c) => ({
    chars: [girl(0, 'shock')], cam: SOLO, flash: clamp(1 - c.lt / 0.15),
    props: (b) => { for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2, r = 0.25 + c.lt * 1.4; b.part(null, `puff${i}`, 'sphere', [0.3 + c.lt * 0.4, 0.3 + c.lt * 0.4, 0.3 + c.lt * 0.4], [Math.cos(a) * r, 0.75 + Math.sin(a) * r, 0.25], '#ffffff', { opacity: Math.round(clamp(1 - c.lt / 0.6) * 5) / 5, solid: false }); } },
  })],
  [1.2, "HE'S A GIRL NOW.", (c) => ({ chars: [girl(0, 'joy', dance(c))], cam: SOLO })],
  [0.9, 'YOU: "BRO??"', (c) => ({ chars: [you(0, 'shock', nod(c))], cam: FACE })],
  [0.9, 'HER: "BRO."', (c) => ({ chars: [girl(0, 'side', nod(c))], cam: FACE })],
  [1.0, 'SAME HOODIE.', (c) => ({ chars: [girl(0, 'happy', { mode: 'stand', armL: [0, -1.2], armR: [0, 1.2] })], cam: SOLO, props: (b) => sym(b, 's', 'SAME', [0.4, 1.5, 0.3], 0.5, c) })],
  [1.2, 'SAME $20 SHE OWES YOU.', (c) => ({ chars: [you(-0.42, 'side', nod(c), { gaze: [0.42, 1.1, 0] }), girl(0.42, 'happy', dance(c))], cam: DUO, props: (b) => sym(b, 's', '$20', [0, 1.75, 0], 0.8, c) })],
  [1.3, 'STILL COOKS YOU AT VIDEO GAMES.', (c) => ({ chars: [you(-0.42, 'sad', nod(c)), girl(0.42, 'joy', dance(c))], cam: DUO, props: (b) => sym(b, 's', `${Math.min(c.n + 4, 7)}-0`, [0, 1.85, 0], 0.9, c) })],
  [0.7, '7–0.', (c) => ({ chars: [you(0, 'cry', nod(c))], cam: FACE })],
  [1.2, 'STILL STEALS YOUR FRIES.', (c) => ({ chars: [you(-0.42, 'shock', nod(c), { gaze: [0.42, 1.3, 0] }), girl(0.42, 'joy', dance(c))], cam: DUO, props: (b) => fries(b, [lerp(-0.42, 0.42, clamp(c.n / 3)), 1.62 + 0.08 * clamp(1 - c.since / 0.15), 0.1]) })],
  [0.7, 'BUT NOW…', (c) => ({ chars: [girl(0, 'happy', nod(c))], cam: FACE })],
  [1.2, 'YOUR MOM LIKES HER MORE.', (c) => ({ chars: [you(-0.66, 'sad', nod(c)), mk('mom', MOM, 0, 'joy', dance(c, 1), { gaze: [0.66, 1.1, 0] }), girl(0.66, 'joy', dance(c))], cam: TRIO, props: (b) => sym(b, 's', 'FAVE', [0.66, 1.8, 0], 0.7, c) })],
  [1.2, 'SHE GETS FREE FOOD.', (c) => ({ chars: [mk('clerk', CLERK, -0.42, 'happy', nod(c), { gaze: [0.42, 1.1, 0] }), girl(0.42, 'joy', dance(c))], cam: DUO, props: (b) => { burger(b, [lerp(-0.3, 0.3, clamp(c.n / 3)), 1.45, 0.15], c.t * 4); sym(b, 's', 'FREE', [0, 1.9, 0], 0.7, c); } })],
  [1.2, 'YOU GET CHARGED EXTRA.', (c) => ({ chars: [mk('clerk', CLERK, -0.42, 'side', nod(c)), you(0.42, 'shock', nod(c))], cam: DUO, props: (b) => sym(b, 's', `$${9 + c.n * 5}.99`, [0, 1.85, 0], 0.9, c) })],
  [1.2, 'YOUR CRUSH TEXTS HER.', (c) => ({ chars: [mk('crush', CRUSH, -0.42, 'joy', dance(c, 1)), girl(0.42, 'joy', dance(c))], cam: DUO, props: (b) => sym(b, 's', 'BFF', [0, 1.85, 0], 0.8, c) })],
  [0.7, 'NOT YOU.', (c) => ({ chars: [you(0, 'cry', nod(c))], cam: FACE })],
  [1.2, 'THE BOYS ARE CONFUSED.', (c) => ({ chars: BOYS.map((l, i) => mk(`boy${i}`, l, (i - 1) * 0.66, i === 1 ? 'shock' : 'side', nod({ ...c, bi: c.bi + i }))), cam: TRIO, props: (b) => { for (let i = 0; i <= Math.min(c.n, 5); i++) sym(b, `q${i}`, '?', [(i % 3 - 1) * 0.66, 1.7 + Math.floor(i / 3) * 0.45, 0], 0.5, c); } })],
  [1.2, 'SHE STILL BURPS THE LOUDEST.', (c) => ({ chars: [girl(0, 'shock', { mode: 'stand', lean: -0.15, armL: [0, -0.8], armR: [0, 0.8] })], cam: SOLO, props: (b) => sym(b, 's', 'BUURP', [0.12, 1.55, 0.4], 0.5 + 0.12 * Math.min(c.n, 4), c) })],
  [0.9, 'RESPECT.', (c) => ({ chars: BOYS.map((l, i) => mk(`boy${i}`, l, (i - 1) * 0.66, 'joy', dance(c, i))), cam: TRIO })],
  [1.0, 'YOU: "TURN BACK?"', (c) => ({ chars: [you(0, 'sad', nod(c))], cam: FACE })],
  [0.9, 'HER: "NAH."', (c) => ({ chars: [girl(0, 'side', nod(c))], cam: FACE })],
  [1.2, '"I GET FREE FRIES NOW."', (c) => ({ chars: [girl(0, 'joy', dance(c))], cam: SOLO, props: (b) => { for (let i = 0; i <= Math.min(c.n, 4); i++) fries(b, [-0.46 + i * 0.23, 1.5 + (i % 2) * 0.1, 0.2]); } })],
  [1.2, 'STILL YOUR HOMEBOY.', (c) => ({ chars: [you(-0.42, 'joy', dance(c, 1)), girl(0.42, 'joy', dance(c))], cam: DUO, props: (b) => confetti(b, c.t) })],
  [1.0, 'JUST WITH BETTER HAIR.', (c) => ({ chars: [girl(0, 'joy', nod(c))], cam: FACE })],
  [1.3, '…STILL OWES YOU $20.', (c) => ({ chars: [you(0, 'side', nod(c))], cam: FACE, props: (b) => sym(b, 's', '$20', [0.3, 1.42, 0.3], 0.4, c) })],
  [9, 'SEND THIS TO YOUR HOMEBOY.', (c) => ({ chars: [you(-0.42, 'joy', dance(c, 1)), girl(0.42, 'joy', dance(c))], cam: DUO, props: (b) => confetti(b, c.t) })],
];
const near = (t: number) => BEATS.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a)).t;
const STARTS = E.reduce<number[]>((acc, _, k) => [...acc, k ? near(acc[k - 1] + E[k - 1][0]) : 0], []);
if (STARTS.some((s, k) => k && s <= STARTS[k - 1])) throw new Error('script entries collapsed onto one beat');
if (STARTS[STARTS.length - 1] > LEN - 1.5) throw new Error('script overruns the video');

export const caps = E.map(([, text], k) => ({ text, start: STARTS[k], end: STARTS[k + 1] ?? LEN }));
// the counter ticks on every single beat
const TICKS = BEATS.reduce<number[]>((acc, _, i) => [...acc, (acc[i - 1] ?? 0) + 1 + Math.floor(rnd(i) * 9)], []);
const beatIdx = (t: number) => { let i = 0; while (i + 1 < BEATS.length && BEATS[i + 1].t <= t + 1e-6) i++; return i; };
export const counterAt = (t: number) => { const i = beatIdx(t); return { value: TICKS[i], from: TICKS[i - 1] ?? 0, since: t - BEATS[i].t }; };
export const titleAt = (t: number) => t < STARTS[3];
export const THUMB_T = STARTS[3] + 0.5;

export function world(t: number): World {
  let k = 0;
  while (k + 1 < E.length && t >= STARTS[k + 1]) k++;
  const bi = beatIdx(t), since = t - BEATS[bi].t;
  const c: Ctx = { t, lt: t - STARTS[k], since, bi, n: bi - beatIdx(STARTS[k]) };
  const shot = E[k][2](c);
  const b = new Builder('env');
  b.part(null, 'floor', 'box', [14, 0.1, 14], [0, -0.05, 0], PAL[(k + 3) % 6], { flat: true, solid: false });
  // sunburst behind the cast steps round on every beat
  const burst = b.node(null, [0, 1.3, -5], [0, 0, bi * 0.26 + easeOut(since / 0.1) * 0.26]);
  for (let i = 0; i < 8; i++) b.part(burst, `burst${i}`, 'box', [0.7, 20, 0.02], [0, 0, 0], '#ffffff', { add: true, opacity: 0.2, solid: false }, [0, 0, (i * Math.PI) / 8]);
  // a sparkle pops somewhere new on every beat
  const sp = clamp(1 - since / 0.22);
  if (sp > 0) b.part(null, 'sparkle', 'sphere', [0.16 * sp, 0.16 * sp, 0.16 * sp], [(rnd(bi) - 0.5) * 1.6, 1.3 + rnd(bi + 50) * 1.2, 0.5], '#ffffff', { emissive: 2, solid: false });
  shot.props?.(b, c);
  // camera punches in/out on every beat
  const z = (bi % 2 ? 0.9 : 1) + 0.06 * clamp(1 - since / 0.1);
  const cam: Cam = { ...shot.cam, pos: shot.cam.pos.map((p, i) => shot.cam.look[i] + (p - shot.cam.look[i]) * z) as V3 };
  return { scene: `s${k}`, t, cam, warm: 0.6, blur: 0, bg: PAL[k % 6], flash: shot.flash ?? 0, chars: shot.chars, checks: [], parts: [...b.done(), ...shot.chars.flatMap((ch) => buildChar(ch, t).parts)] };
}
