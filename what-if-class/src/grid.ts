// Shared engine for captions-only episodes timed to an even snare grid (see scripts/build-grid.mjs):
// each script entry starts on the next snare, so every event is the same distance apart.
import { shell, bedroom } from './bibi';
import { Builder, buildChar, LOOKS, rnd, easeOut, type Char, type World, type V3, type Cam, type Pose, type Look, type Expr } from './world';

export type Plan = { length: number; beats: { t: number; s: number; snare: boolean }[] };
export type Ctx = { t: number; lt: number; since: number; n: number; bi: number };
export type Shot = { chars: Char[]; cam: Cam; props?: (b: Builder, c: Ctx) => void; flash?: number; face?: boolean };
/** [caption, set, shot] */
export type Entry = [string, keyof typeof SETS, (c: Ctx) => Shot];

export const mk = (id: string, look: Look, x: number, expr: Expr, pose: Pose = { mode: 'stand' }, o: Partial<Char> = {}): Char => ({ id, look, pos: [x, 0, 0], rotY: 0, pose, expr, gaze: [0, 1.2, 6], fg: true, ...o });
export const you = (x: number, expr: Expr, pose?: Pose, o: Partial<Char> = {}) => mk('you', LOOKS.you, x, expr, pose, o);
/** celebrating: hop on the beat, arms alternate */
export const dance = (c: Ctx, seed = 0): Pose => {
  const up = (c.bi + seed) % 2 === 0;
  const arms = { armL: [up ? -2.9 : -1.2, -0.3] as [number, number], armR: [up ? -1.2 : -2.9, 0.3] as [number, number] };
  return c.since < 0.2 ? { mode: 'air', lift: Math.sin((c.since / 0.2) * Math.PI) * 0.1, ...arms } : { mode: 'stand', ...arms };
};
export const still: Pose = { mode: 'stand' };

export const SOLO: Cam = { pos: [0.12, 1.0, 3.3], look: [0, 0.8, 0], fov: 40 };
export const FACE: Cam = { pos: [0.05, 1.14, 2.0], look: [0, 0.98, 0], fov: 40 };
export const DUO: Cam = { pos: [0, 1.05, 4.4], look: [0, 0.85, 0], fov: 40 };
export const TRIO: Cam = { pos: [0, 1.1, 5.6], look: [0, 0.85, 0], fov: 40 };
export const face = (ch: Char): Shot => ({ chars: [ch], cam: FACE, face: true });

export const SETS = {
  room: { warm: 0.15, bg: '#78818d', build: bedroom },
  den: { warm: 0.6, bg: '#e2b07d', build: (b: Builder) => { shell(b, '#b9773f', '#e2b07d'); b.part(null, 'couch', 'box', [2.0, 0.45, 0.7], [0, 0.225, -1.5], '#4f6fa8'); b.part(null, 'couchBack', 'box', [2.0, 0.55, 0.2], [0, 0.72, -1.8], '#44608f', { solid: false }); b.part(null, 'rug', 'box', [2.4, 0.02, 1.4], [0, 0.01, 0.1], '#c0583a', { solid: false, flat: true }); } },
  home: { warm: 0.7, bg: '#f3d9b0', build: (b: Builder) => { shell(b, '#c9a27a', '#f3d9b0'); b.part(null, 'counter', 'box', [3.2, 0.9, 0.5], [0, 0.45, -1.9], '#fbfaf3'); b.part(null, 'fridge', 'box', [0.8, 1.9, 0.6], [1.9, 0.95, -1.9], '#dfe3ea'); } },
  shop: { warm: 0.6, bg: '#d9685a', build: (b: Builder) => { shell(b, '#8a8f98', '#d9685a'); b.part(null, 'till', 'box', [3.0, 0.95, 0.5], [0, 0.475, -1.8], '#6b4a2f'); } },
  out: { warm: 0.9, bg: '#9fd3ff', build: (b: Builder) => { shell(b, '#7cc36a', null); for (let i = 0; i < 5; i++) b.part(null, `cloud${i}`, 'sphere', [3, 1.2, 1.6], [-7 + i * 3.4, 4.2 + rnd(i) * 2.5, -9], '#ffffff', { solid: false }); for (let i = 0; i < 3; i++) { b.part(null, `tree${i}`, 'sphere', [1.8, 1.8, 1.8], [-3 + i * 3, 2.3, -5], '#4caf50', { solid: false }); b.part(null, `trunk${i}`, 'box', [0.3, 1.6, 0.3], [-3 + i * 3, 0.8, -5], '#6b4a2f', { solid: false }); } } },
};

export const sym = (b: Builder, id: string, text: string, pos: V3, size: number, c: Ctx) => b.part(null, id, 'plane', [size * easeOut(c.lt / 0.15), size * easeOut(c.lt / 0.15), 1], pos, '#fff', { tex: `sym:${text}`, emissive: 1, solid: false, fg: true });
export function confetti(b: Builder, t: number) {
  for (let i = 0; i < 60; i++) b.part(null, `conf${i}`, 'box', [0.07, 0.012, 0.1], [(rnd(i + 11) - 0.5) * 3.2, 3.2 - ((t * (0.9 + rnd(i) * 0.6) + rnd(i + 3) * 3.2) % 3.2), -0.6 + rnd(i + 21) * 1.6], ['#ff4fa3', '#19c8ff', '#ffd60a', '#ffffff'][i % 4], { solid: false, flat: true }, [t * 3 + i, i, t * 2]);
}

/** ticks: counter value per entry (-1 = ∞) */
export function makeEpisode(plan: Plan, E: Entry[], ticks: number[]) {
  const LEN = plan.length, BEATS = plan.beats;
  const SN = BEATS.filter((b) => b.snare);
  if (ticks.length !== E.length) throw new Error('one counter value per script entry');
  if (SN.length < E.length + 2) throw new Error(`script has ${E.length} entries but the grid only ${SN.length} snares`);
  const STARTS = E.map((_, k) => (k ? SN[k].t : 0));
  if (LEN - STARTS[STARTS.length - 1] < 1.5) throw new Error('last entry gets under 1.5 s: lengthen the video');
  const beatIdx = (t: number) => { let i = 0; while (i + 1 < SN.length && SN[i + 1].t <= t + 1e-6) i++; return i; };
  const entryAt = (t: number) => { let k = 0; while (k + 1 < E.length && t >= STARTS[k + 1]) k++; return k; };
  const world = (t: number): World => {
    const k = entryAt(t), bi = beatIdx(t);
    const c: Ctx = { t, lt: t - STARTS[k], since: t - SN[bi].t, bi, n: bi - beatIdx(STARTS[k]) };
    const shot = E[k][2](c), set = SETS[E[k][1]];
    const b = new Builder('env');
    set.build(b);
    shot.props?.(b, c);
    // slow push-in on every shot
    const z = 1 - Math.min(c.lt * 0.025, 0.08);
    const cam: Cam = { ...shot.cam, pos: shot.cam.pos.map((p, i) => shot.cam.look[i] + (p - shot.cam.look[i]) * z) as V3 };
    return { scene: `s${k}`, t, cam, warm: set.warm, blur: shot.face ? 9 : 4, bg: set.bg, flash: shot.flash ?? 0, chars: shot.chars, checks: [], parts: [...b.done(), ...shot.chars.flatMap((ch) => buildChar(ch, t).parts)] };
  };
  return {
    LEN, BEATS, world,
    caps: E.map(([text], k) => ({ text, start: STARTS[k], end: STARTS[k + 1] ?? LEN })),
    counterAt: (t: number) => { const k = entryAt(t); return { value: ticks[k], from: ticks[k - 1] ?? 0, since: t - STARTS[k] }; },
    titleAt: (t: number) => t < STARTS[2],
    THUMB_T: STARTS[3] + 0.6,
  };
}
