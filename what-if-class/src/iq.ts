// Episode 4: "What if your IQ kept increasing?" — captions only, every event on the snare grid.
// The counter IS your IQ: it climbs with every joke, hits ∞, then a door resets it.
import plan from '../plan/iq.json';
import { makeEpisode, mk, you, dance, still, SOLO, DUO, face, sym, confetti, type Ctx, type Entry } from './grid';
import { Builder, LOOKS, rnd, easeOut, lerp, type V3, type Pose } from './world';

const MOM = { ...LOOKS.teacher, top: '#ff5d8f' };
const think: Pose = { mode: 'stand', armR: [-2.2, 0.55], head: [-0.1, 0, 0.1] }; // hand to chin
const float = (c: Ctx, h: number): Pose => ({ mode: 'fly', lift: h + Math.sin(c.t * 2.4) * 0.04, armL: [-0.4, -0.6], armR: [-0.4, 0.6], sway: Math.sin(c.t * 1.7) * 0.05 });

function berry(b: Builder, id: string, pos: V3) {
  b.part(null, id, 'sphere', [0.07, 0.07, 0.07], pos, '#3b4cca', { solid: false, fg: true });
}
function orbit(b: Builder, c: Ctx, n: number, y: number, r: number, f: (b: Builder, id: string, p: V3, i: number) => void) {
  for (let i = 0; i < n; i++) { const a = c.t * 1.6 + (i / n) * Math.PI * 2; f(b, `o${i}`, [Math.cos(a) * r, y + Math.sin(a * 2) * 0.12, Math.sin(a) * r * 0.6 + 0.2], i); }
}
function door(b: Builder, c: Ctx) {
  b.part(null, 'door', 'box', [0.08, 2.0, 0.9], [0.62, 1.0, 0], '#8b5a2b', { fg: true });
  b.part(null, 'doorKnob', 'sphere', [0.07, 0.07, 0.07], [0.56, 1.0, 0.33], '#ffc93c', { solid: false, fg: true });
  b.part(null, 'pullSign', 'plane', [0.42 * easeOut(c.lt / 0.15), 0.42 * easeOut(c.lt / 0.15), 1], [0.575, 1.45, 0], '#fff', { tex: 'sym:PULL', emissive: 1, solid: false, fg: true }, [0, -Math.PI / 2, 0]);
}
/** label beside the head, kept inside the narrow portrait frame (face = close-up framing) */
const tag = (b: Builder, text: string, c: Ctx, close = false) => sym(b, 's', text, close ? [0.2, 1.48, 0.3] : [0.26, 1.62, 0.2], close ? 0.28 : 0.4, c);
const SIDE = { pos: [-0.6, 1.15, 3.2] as V3, look: [0.25, 0.95, 0] as V3, fov: 40 };

// ---------- the script: [caption, set, shot] — entry k starts on snare k ----------
const E: Entry[] = [
  ['THIS IS YOU.', 'room', (c) => ({ chars: [you(0, 'joy', dance(c))], cam: SOLO })],
  ['AVERAGE GUY.', 'room', () => face(you(0, 'neutral'))],
  ['YOU EAT A BLUEBERRY.', 'home', (c) => ({ chars: [you(0, 'happy', { mode: 'stand', armR: [-2.35, 0.5] })], cam: SOLO, props: (b) => berry(b, 'berry', [lerp(-0.2, -0.05, easeOut(c.lt / 0.5)), lerp(1.25, 1.05, easeOut(c.lt / 0.5)), 0.3]) })],
  ['BRAIN FOOD.', 'home', (c) => ({ ...face(you(0, 'shock')), props: (b) => tag(b, '+1', c, true) })],
  ['YOU EAT 40 MORE.', 'home', (c) => ({ chars: [you(0, 'joy', { mode: 'stand', armL: [-2.3, -0.5], armR: [-2.3, 0.5] })], cam: SOLO, props: (b) => orbit(b, c, 14, 1.15, 0.55, (bb, id, p) => berry(bb, id, p)) })],
  ['UH OH.', 'home', () => face(you(0, 'side'))],
  ['HOMEWORK: DONE.', 'den', (c) => ({ chars: [you(0, 'happy', { mode: 'stand', armR: [-1.75, 0.35], head: [0.3, 0, 0] }, { hold: { item: 'paper' } })], cam: SOLO, props: (b) => tag(b, 'A+', c) })],
  ['IN 3 SECONDS.', 'den', (c) => ({ ...face(you(0, 'side')), props: (b) => tag(b, '0:03', c, true) })],
  ['YOU FIX THE WIFI.', 'den', (c) => ({ chars: [you(0, 'joy', think)], cam: SOLO, props: (b) => tag(b, 'WIFI', c) })],
  ['MOM CRIES.', 'home', () => ({ chars: [mk('mom', MOM, -0.42, 'cry', { mode: 'stand', armL: [-1.3, -0.9], armR: [-1.3, 0.9] }, { gaze: [0.42, 1.1, 0], blush: true }), you(0.42, 'happy', still, { gaze: [-0.42, 1.1, 0] })], cam: DUO })],
  ['YOU SPEAK DOLPHIN.', 'out', (c) => ({ chars: [you(0, 'joy', { mode: 'stand', armL: [-1.5, -0.6], armR: [-1.5, 0.6] })], cam: SOLO, props: (b) => tag(b, 'EEE!', c) })],
  ['FLUENTLY.', 'out', (c) => ({ ...face(you(0, 'side')), props: (b) => tag(b, 'EEE', c, true) })],
  ['THE CHESS BOT RESIGNS.', 'den', (c) => ({ chars: [you(0, 'side', think)], cam: SOLO, props: (b) => tag(b, '1-0', c) })],
  ['IT RAGE QUITS.', 'den', (c) => ({ ...face(you(0, 'joy')), props: (b) => tag(b, 'GG', c, true) })],
  ['YOUR HEAD GROWS.', 'room', (c) => ({ chars: [you(0, 'shock', still, { headScale: lerp(1, 1.35, easeOut(c.lt / 0.25)) })], cam: SOLO })],
  ['BIGGER.', 'room', (c) => ({ chars: [you(0, 'shock', still, { headScale: lerp(1.35, 1.7, easeOut(c.lt / 0.25)) })], cam: SOLO })],
  ['BIGGER.', 'room', (c) => ({ chars: [you(0, 'joy', still, { headScale: lerp(1.7, 2.1, easeOut(c.lt / 0.25)) })], cam: SOLO })],
  ['YOU SEE MATH EVERYWHERE.', 'out', (c) => ({ chars: [you(0, 'shock', still, { headScale: 2.1 })], cam: SOLO, props: (b) => orbit(b, c, 5, 1.25, 0.55, (bb, id, p, i) => sym(bb, id, ['π', 'x²', '∑', '√', '∞'][i], p, 0.3, c)) })],
  ['YOU READ THE TERMS & CONDITIONS.', 'den', (c) => ({ chars: [you(0, 'neutral', { mode: 'stand', armR: [-1.75, 0.35], head: [0.3, 0, 0] }, { hold: { item: 'paper' }, headScale: 2.1 })], cam: SOLO, props: (b) => tag(b, 'p.847', c) })],
  ['ALL OF THEM.', 'den', () => ({ chars: [you(0, 'side', still, { headScale: 2.1 })], cam: SOLO })],
  ['YOU START FLOATING.', 'out', (c) => ({ chars: [you(0, 'joy', float(c, lerp(0, 0.5, easeOut(c.lt / 0.8))), { headScale: 2.1 })], cam: { ...SOLO, pos: [0.12, 1.4, 3.6], look: [0, 1.2, 0] } })],
  ['YOU SEE THE CODE.', 'out', (c) => ({ chars: [you(0, 'shock', float(c, 0.5), { headScale: 2.1 })], cam: { ...SOLO, pos: [0.12, 1.4, 3.6], look: [0, 1.2, 0] }, props: (b) => orbit(b, c, 8, 1.15, 0.6, (bb, id, p, i) => sym(bb, id, rnd(i + Math.floor(c.t * 4)) > 0.5 ? '1' : '0', p, 0.28, c)) })],
  ['YOU UNDERSTAND EVERYTHING.', 'out', (c) => ({ chars: [you(0, 'joy', { ...float(c, 0.5), armL: [-2.8, -0.3], armR: [-2.8, 0.3] }, { headScale: 2.1, halo: true })], cam: { ...SOLO, pos: [0.12, 1.4, 3.6], look: [0, 1.2, 0] }, props: (b) => confetti(b, c.t) })],
  ['THEN YOU MEET A DOOR.', 'home', (c) => ({ chars: [you(0, 'side', still, { rotY: Math.PI / 2, gaze: [0.6, 1.2, 0] })], cam: SIDE, props: (b) => door(b, c) })],
  ['YOU PUSH. IT SAYS PULL.', 'home', (c) => ({ chars: [you(0, 'shock', { mode: 'stand', lean: c.since < 0.25 ? 0.15 : 0.05, armL: [-1.5, 0], armR: [-1.5, 0] }, { rotY: Math.PI / 2, gaze: [0.6, 1.45, 0] })], cam: SIDE, props: (b) => door(b, c) })],
  ['IQ: RESET.', 'home', () => face(you(0, 'cry'))],
  ['SEND THIS TO YOUR SMARTEST FRIEND.', 'out', (c) => ({ chars: [you(0, 'joy', dance(c))], cam: SOLO, props: (b) => confetti(b, c.t) })],
];
// IQ per entry (-1 = ∞): slow at first, then silly
const IQ = [100, 100, 101, 104, 140, 160, 210, 230, 300, 340, 450, 520, 700, 777, 1000, 1400, 2000, 3141, 5000, 6000, 9000, 50000, -1, -1, -1, 100, 100];
export const { LEN, BEATS, caps, counterAt, titleAt, world } = makeEpisode(plan, E, IQ);
// thumbnail: the giant-head ∞ moment, not the default early frame
export const THUMB_T = caps.find((c) => c.text === 'YOU UNDERSTAND EVERYTHING.')!.start + 0.45;
