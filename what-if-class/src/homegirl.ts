// Episode 3: "What if your homeboy turned into a girl?" — captions only, every event on the snare grid.
import plan from '../plan/homegirl.json';
import { makeEpisode, mk, you, dance, still, SOLO, DUO, TRIO, face, sym, confetti, type Entry } from './grid';
import { Builder, LOOKS, rnd, clamp, easeOut, lerp, type V3, type Pose, type Look, type Expr } from './world';

// ---------- cast (the homeboy keeps hoodie, jeans, shoes and skin: same person) ----------
const HB: Look = { skin: '#8a5a3c', top: '#ffd60a', pants: '#3d7bd9', shoe: '#ffffff', hair: '#1a1a1a', style: 'spiky' };
const HG: Look = { ...HB, style: 'long' };
const MOM: Look = { ...LOOKS.teacher, top: '#ff5d8f' };
const CLERK: Look = { skin: '#f0c8a8', top: '#ff7b54', pants: '#2f3a56', shoe: '#fff', hair: '#e02424', style: 'cap' };
const CRUSH: Look = LOOKS.kids[0];
const BOYS: Look[] = [LOOKS.kids[2], { ...LOOKS.kids[3], top: '#3f8f4f' }, { ...LOOKS.kids[1], top: '#e0743a' }];

const girl = (x: number, expr: Expr, pose?: Pose) => mk('hb', HG, x, expr, pose, { acc: { bow: '#ff4fa3' }, blush: true });
const boy = (x: number, expr: Expr, pose?: Pose) => mk('hb', HB, x, expr, pose);
function fries(b: Builder, pos: V3) {
  const n = b.node(null, pos);
  b.part(n, 'friesBox', 'box', [0.16, 0.18, 0.09], [0, 0, 0], '#ff2d2d', { solid: false, fg: true });
  for (let i = 0; i < 5; i++) b.part(n, `fry${i}`, 'box', [0.025, 0.16, 0.025], [-0.055 + i * 0.028, 0.13 + (i % 2) * 0.03, 0], '#ffd60a', { solid: false, fg: true }, [0, 0, (i - 2) * 0.08]);
}
function burger(b: Builder, pos: V3, spin: number) {
  const n = b.node(null, pos, [0.3, spin, 0]);
  ([['#e0a04a', -0.06, 0.07], ['#6b3a1e', 0, 0.05], ['#4caf50', 0.035, 0.02], ['#e0a04a', 0.085, 0.08]] as const).forEach(([col, y, h], i) => b.part(n, `bun${i}`, 'cyl', [0.26, h, 0.26], [0, y, 0], col, { solid: false }));
}
// ---------- the script: [caption, set, shot] — entry k starts on snare k ----------
const E: Entry[] = [
  ['THIS IS YOUR HOMEBOY.', 'room', (c) => ({ chars: [boy(0, 'joy', dance(c))], cam: SOLO })],
  ['ONE MORNING…', 'room', () => face(boy(0, 'side'))],
  ['POOF.', 'room', (c) => ({
    chars: [girl(0, 'shock')], cam: SOLO, flash: clamp(1 - c.lt / 0.15),
    props: (b) => { for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2, r = 0.25 + c.lt * 1.4; b.part(null, `puff${i}`, 'sphere', [0.3 + c.lt * 0.4, 0.3 + c.lt * 0.4, 0.3 + c.lt * 0.4], [Math.cos(a) * r, 0.75 + Math.sin(a) * r, 0.25], '#ffffff', { opacity: Math.round(clamp(1 - c.lt / 0.6) * 5) / 5, solid: false }); } },
  })],
  ["HE'S A GIRL NOW.", 'room', () => ({ chars: [girl(0, 'shock', { mode: 'stand', armL: [0, -0.6], armR: [0, 0.6] })], cam: SOLO })],
  ['YOU: "BRO??"', 'room', () => face(you(0, 'shock'))],
  ['HER: "BRO."', 'room', () => face(girl(0, 'side'))],
  ['SAME HOODIE.', 'den', (c) => ({ chars: [girl(0, 'happy', { mode: 'stand', armL: [0, -1.2], armR: [0, 1.2] })], cam: SOLO, props: (b) => sym(b, 's', 'SAME', [0.4, 1.5, 0.3], 0.5, c) })],
  ['SAME $20 SHE OWES YOU.', 'den', (c) => ({ chars: [you(-0.42, 'side', still, { gaze: [0.42, 1.1, 0] }), girl(0.42, 'happy')], cam: DUO, props: (b) => sym(b, 's', '$20', [0, 1.75, 0], 0.8, c) })],
  ['STILL COOKS YOU AT VIDEO GAMES.', 'den', (c) => ({ chars: [you(-0.42, 'sad'), girl(0.42, 'joy', dance(c))], cam: DUO, props: (b) => sym(b, 's', `${Math.min(c.n + 6, 7)}-0`, [0, 1.85, 0], 0.9, c) })],
  ['7–0.', 'den', () => face(you(0, 'cry'))],
  ['STILL STEALS YOUR FRIES.', 'den', (c) => ({ chars: [you(-0.42, 'shock', still, { gaze: [0.42, 1.3, 0] }), girl(0.42, 'joy')], cam: DUO, props: (b) => fries(b, [lerp(-0.42, 0.42, easeOut(c.lt / 0.9)), 1.62, 0.1]) })],
  ['BUT NOW…', 'den', () => face(girl(0, 'happy'))],
  ['YOUR MOM LIKES HER MORE.', 'home', (c) => ({ chars: [you(-0.66, 'sad'), mk('mom', MOM, 0, 'joy', { mode: 'stand', armL: [-1.4, -0.9] }, { gaze: [0.66, 1.1, 0] }), girl(0.66, 'joy')], cam: TRIO, props: (b) => sym(b, 's', 'FAVE', [0.66, 1.8, 0], 0.7, c) })],
  ['SHE GETS FREE FOOD.', 'shop', (c) => ({ chars: [mk('clerk', CLERK, -0.42, 'happy', still, { gaze: [0.42, 1.1, 0] }), girl(0.42, 'joy')], cam: DUO, props: (b) => { burger(b, [lerp(-0.3, 0.3, easeOut(c.lt / 0.9)), 1.45, 0.15], c.t * 2); sym(b, 's', 'FREE', [0, 1.9, 0], 0.7, c); } })],
  ['YOU GET CHARGED EXTRA.', 'shop', (c) => ({ chars: [mk('clerk', CLERK, -0.42, 'side'), you(0.42, 'shock')], cam: DUO, props: (b) => sym(b, 's', `$${19 + Math.min(c.n, 1) * 10}.99`, [0, 1.85, 0], 0.9, c) })],
  ['YOUR CRUSH TEXTS HER.', 'out', (c) => ({ chars: [mk('crush', CRUSH, -0.42, 'joy', dance(c, 1)), girl(0.42, 'joy', dance(c))], cam: DUO, props: (b) => sym(b, 's', 'BFF', [0, 1.85, 0], 0.8, c) })],
  ['NOT YOU.', 'out', () => face(you(0, 'cry'))],
  ['THE BOYS ARE CONFUSED.', 'out', (c) => ({ chars: BOYS.map((l, i) => mk(`boy${i}`, l, (i - 1) * 0.66, i === 1 ? 'shock' : 'side')), cam: TRIO, props: (b) => { for (let i = 0; i < 3; i++) sym(b, `q${i}`, '?', [(i - 1) * 0.66, 1.75, 0], 0.5, c); } })],
  ['SHE STILL BURPS THE LOUDEST.', 'out', (c) => ({ chars: [girl(0, 'shock', { mode: 'stand', lean: -0.15, armL: [0, -0.8], armR: [0, 0.8] })], cam: SOLO, props: (b) => sym(b, 's', 'BUURP', [0.12, 1.55, 0.4], 0.5 + 0.3 * easeOut(c.lt / 1.2), c) })],
  ['RESPECT.', 'out', (c) => ({ chars: BOYS.map((l, i) => mk(`boy${i}`, l, (i - 1) * 0.66, 'joy', dance(c, i))), cam: TRIO })],
  ['YOU: "TURN BACK?"', 'den', () => face(you(0, 'sad'))],
  ['HER: "NAH."', 'den', () => face(girl(0, 'side'))],
  ['"I GET FREE FRIES NOW."', 'den', () => ({ chars: [girl(0, 'joy', { mode: 'stand', armL: [-2.6, -0.4], armR: [-2.6, 0.4] })], cam: SOLO, props: (b) => { for (let i = 0; i < 3; i++) fries(b, [-0.36 + i * 0.36, 1.55 + (i % 2) * 0.1, 0.2]); } })],
  ['STILL YOUR HOMEBOY.', 'out', (c) => ({ chars: [you(-0.42, 'joy', dance(c, 1)), girl(0.42, 'joy', dance(c))], cam: DUO, props: (b) => confetti(b, c.t) })],
  ['JUST WITH BETTER HAIR.', 'out', () => face(girl(0, 'joy'))],
  ['…STILL OWES YOU $20.', 'room', () => face(you(0, 'side'))],
  ['SEND THIS TO YOUR HOMEBOY.', 'out', (c) => ({ chars: [you(-0.42, 'joy', dance(c, 1)), girl(0.42, 'joy', dance(c))], cam: DUO, props: (b) => confetti(b, c.t) })],
];
// "bro" count jumps with each new joke
const TICKS = E.reduce<number[]>((acc, _, k) => [...acc, k < 2 ? 0 : (acc[k - 1] ?? 0) + 1 + Math.floor(rnd(k) * 12)], []);
export const { LEN, BEATS, caps, counterAt, titleAt, THUMB_T, world } = makeEpisode(plan, E, TICKS);
