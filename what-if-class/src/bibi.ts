// Episode 2: "What if you were Netanyahu for a week?" — captions only, cut to the supplied beat map.
// Cartoon parody: small stuff before the beat drop, the big events after it.
import * as THREE from 'three';
import plan from '../plan/bibi.json';
import { Builder, bird, buildChar, LOOKS, rnd, clamp, ease, easeOut, lerp, lerp3, center, type Char, type World, type V3, type Cam, type Pose, type Check, type Look, type Part } from './world';

export const LEN = plan.length;
export const BEATS: { t: number; s: number }[] = plan.beats;
/** every event time is snapped to the nearest hard beat */
const B = (t: number) => BEATS.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a)).t;

const T = {
  mon: B(1.776), wake: B(2.74), calls: B(4.656), tue: B(6.571), meet: B(7.535), meet2: B(8.975), email: B(10.414),
  wed: B(12.829), chest: B(14.257), dont: B(16.173), open: B(18.088), drop: B(plan.drop), pirate: B(21.931),
  thu: B(24.335), admin: B(25.298), grav: B(26.738), fri: B(28.177), net: B(29.129), memed: B(30.569), alot: B(32.009),
  sat: B(32.972), elect: B(33.936), win: B(35.376), pres: B(36.328), arr: B(38.731),
  sun: B(40.171), up: B(41.61), dream: B(43.05), token: B(44.965), arr2: B(46.893),
};
const CAPS: [number, string][] = [
  [0, 'THIS IS YOU.'], [T.mon, 'MONDAY.'], [T.wake, 'YOU WAKE UP AS NETANYAHU.'], [T.calls, '847 MISSED CALLS.'],
  [T.tue, 'TUESDAY.'], [T.meet, 'A MEETING.'], [T.meet2, 'ANOTHER MEETING.'], [T.email, "COULD'VE BEEN AN EMAIL."],
  [T.wed, 'WEDNESDAY.'], [T.chest, 'A CHEST APPEARS.'], [T.dont, 'DO NOT OPEN IT.'], [T.open, 'YOU OPEN IT.'],
  [T.drop, 'PIRATE TOKEN: UNLOCKED.'], [T.pirate, 'YOU ARE NOW A PIRATE.'],
  [T.thu, 'THURSDAY.'], [T.admin, 'ADMIN PRIVILEGES: GRANTED.'], [T.grav, 'GRAVITY: OFF.'],
  [T.fri, 'FRIDAY.'], [T.net, 'THE INTERNET FINDS OUT.'], [T.memed, 'YOU GET MEMED.'], [T.alot, 'A LOT.'],
  [T.sat, 'SATURDAY.'], [T.elect, 'EMERGENCY ELECTION.'], [T.win, 'YOU WIN.'], [T.pres, 'MEME PRESIDENT OF ISRAEL.'], [T.arr, 'ARRR.'],
  [T.sun, 'SUNDAY.'], [T.up, 'YOU WAKE UP.'], [T.dream, 'IT WAS A DREAM.'], [T.token, 'THE TOKEN IS STILL THERE.'], [T.arr2, 'ARRR.'],
];
export const caps = CAPS.map(([start, text], i) => ({ text, start, end: Math.min(CAPS[i + 1]?.[0] ?? LEN, start + 2.8) }));
const COUNTER: [number, number][] = [[0, 0], [T.net, 1], [B(29.617), 47], [T.memed, 9000], [B(31.533), 250000], [T.alot, 1000000], [T.win, 50000000], [T.pres, -1], [T.sun, 0], [T.arr2, 1]];
export const counterAt = (t: number) => {
  let v = 0, from = 0, at = 0;
  for (const [ct, cv] of COUNTER) if (t >= ct) { from = v; v = cv; at = ct; }
  return { value: v, from, since: t - at };
};
const SCENES: [string, number][] = [['bed', 0], ['calls', T.calls], ['meet', T.meet], ['chest', T.wed], ['token', T.drop], ['admin', T.thu], ['meme', T.fri], ['pres', T.sat], ['sun', T.sun]];

// ---------- cast ----------
const PM: Look = { skin: '#e6b591', top: '#1e2a44', pants: '#1e2a44', shoe: '#15151a', hair: '#d5d8dc', style: 'fringe' };
const SUITS: Look[] = [
  { skin: '#7a4b31', top: '#3a3f4a', pants: '#3a3f4a', shoe: '#111', hair: '#141414', style: 'spiky' },
  { skin: '#f3c9a5', top: '#4a3b52', pants: '#2d2d33', shoe: '#111', hair: '#7a4a24', style: 'long', glasses: true },
];
const HEAD_Y = 1.1; // standing head centre
const ch = (id: string, look: Look, pos: V3, o: Partial<Char> = {}): Char => ({ id, look, pos, rotY: 0, pose: { mode: 'stand' }, expr: 'neutral', gaze: [0, 1.2, 6], ...o });
const pm = (pos: V3, o: Partial<Char> = {}, pirate = false): Char => ch('you', PM, pos, { fg: true, acc: { tie: '#3d7bd9', pirate }, ...o });
const UP: Pose = { mode: 'stand', armL: [-2.9, -0.3], armR: [-2.9, 0.3] };

function jumper(id: string, look: Look, pos: V3, rotY: number, t: number, seed: number, gaze: V3): Char {
  const per = 0.952, f = ((t + rnd(seed) * per) % per) / per; // one jump per two beats, seeded phase
  const pose: Pose = f < 0.25 ? { ...UP, crouch: Math.sin((f / 0.25) * Math.PI) * 0.55 }
    : f < 0.75 ? { ...UP, mode: 'air', lift: 4 * ((f - 0.25) / 0.5) * (1 - (f - 0.25) / 0.5) * 0.35, crouch: 0.12 }
      : { ...UP, crouch: Math.sin(((f - 0.75) / 0.25) * Math.PI) * 0.3 };
  return ch(id, look, pos, { rotY, pose, expr: 'joy', gaze });
}

// ---------- props ----------
export function shell(b: Builder, floor: string, wall: string | null) {
  b.part(null, 'floor', 'box', [12, 0.1, 12], [0, -0.05, 0], floor, { flat: true, solid: false });
  if (wall) b.part(null, 'wall', 'box', [12, 5, 0.1], [0, 2.5, -2.3], wall, { flat: true, solid: false });
}
export function bedroom(b: Builder) {
  shell(b, '#5c6470', '#78818d');
  b.part(null, 'bedFrame', 'box', [1.3, 0.3, 2.1], [-1.25, 0.15, -1.0], '#6b4a2f');
  b.part(null, 'mattress', 'box', [1.2, 0.14, 2.0], [-1.25, 0.37, -1.0], '#dfe3ea', { solid: false });
  b.part(null, 'blanket', 'box', [1.24, 0.1, 1.3], [-1.25, 0.46, -0.6], '#2bb3a3', { solid: false });
  b.part(null, 'pillow', 'box', [0.7, 0.12, 0.4], [-1.25, 0.5, -1.75], '#ffffff', { solid: false });
  b.part(null, 'nightstand', 'box', [0.45, 0.5, 0.4], [1.0, 0.25, -1.7], '#7a5a3a');
  b.part(null, 'window', 'box', [1.3, 1.3, 0.02], [0.1, 2.3, -2.22], '#b9d4ee', { emissive: 0.7, solid: false, flat: true });
}
function coin(b: Builder, pos: V3, d: number, spin: number, flat = false) {
  const n = b.node(null, pos, [0, spin, 0]);
  b.part(n, 'coin', 'cyl', [d, d * 0.12, d], [0, 0, 0], '#ffc93c', { emissive: 0.5, solid: false }, [flat ? 0 : Math.PI / 2, 0, 0]);
  if (flat) b.part(n, 'coinFace', 'plane', [d * 0.82, d * 0.82, 1], [0, d * 0.062, 0], '#fff', { tex: 'coinface', emissive: 1, solid: false }, [-Math.PI / 2, 0, 0]);
  else for (const s of [1, -1]) b.part(n, `coinFace${s}`, 'plane', [d * 0.82, d * 0.82, 1], [0, 0, s * d * 0.062], '#fff', { tex: 'coinface', emissive: 1, solid: false }, [0, s < 0 ? Math.PI : 0, 0]);
}
function rays(b: Builder, pos: V3, len: number, t: number, op: number) {
  const n = b.node(null, pos, [0, 0, t * 0.6]);
  for (let i = 0; i < 6; i++) b.part(n, `ray${i}`, 'box', [0.07, len, 0.02], [0, 0, -0.06], '#fff3b0', { add: true, opacity: op, solid: false }, [0, 0, (i * Math.PI) / 6]);
}
function chest(b: Builder, pos: V3, s: number, open: number, glow: number, rot: V3 = [0, 0, 0]) {
  const r = b.node(null, pos, rot); r.scale.setScalar(s);
  b.part(r, 'chestBase', 'box', [0.6, 0.34, 0.4], [0, 0.17, 0], '#8b5a2b');
  b.part(r, 'chestBand', 'box', [0.62, 0.05, 0.42], [0, 0.3, 0], '#ffc93c', { solid: false });
  b.part(r, 'chestLock', 'box', [0.08, 0.1, 0.03], [0, 0.27, 0.21], '#ffc93c', { solid: false });
  const hinge = b.node(r, [0, 0.34, -0.2], [-open, 0, 0]);
  b.part(hinge, 'chestLid', 'box', [0.62, 0.14, 0.42], [0, 0.07, 0.2], '#a0662f', { solid: false });
  if (glow > 0) b.part(r, 'chestGlow', 'sphere', [0.5 * glow, 0.3 * glow, 0.32 * glow], [0, 0.36, 0], '#ffe27a', { emissive: 2, solid: false });
}
const q = (x: number) => Math.round(clamp(x) * 5) / 5; // quantised opacity keeps the material cache small

type Out = Omit<World, 'scene' | 't' | 'parts'> & { env: Builder[] };
const faceCam = (x: number, y: number, z: number, push = 0): Cam => ({ pos: [x + 0.05, y + 0.02, z + 2.0 - push], look: [x, y - 0.12, z], fov: 40 });

const S: Record<string, (t: number, lt: number, end: number) => Out> = {
  bed(t, lt) {
    const b = new Builder('env'); bedroom(b);
    const woke = t >= T.wake, dt = t - T.wake;
    const you = woke ? pm([0, 0, 0], { expr: dt < 1.1 ? 'shock' : 'side', pose: { mode: 'stand', armL: [0, -0.5 * easeOut(dt / 0.2)], armR: [0, 0.5 * easeOut(dt / 0.2)] } })
      : ch('you', LOOKS.you, [0, 0, 0], { fg: true, expr: t >= T.mon ? 'side' : 'neutral' });
    const fx = new Builder('fx', true);
    if (woke && dt < 0.5) for (let i = 0; i < 10; i++) { // poof
      const a = (i / 10) * Math.PI * 2, r = 0.25 + dt * 1.4;
      fx.part(null, `puff${i}`, 'sphere', [0.25 + dt * 0.5, 0.25 + dt * 0.5, 0.25 + dt * 0.5], [Math.cos(a) * r, 0.75 + Math.sin(a) * r * 0.9, 0.2], '#ffffff', { opacity: q(1 - dt / 0.5), solid: false });
    }
    const cam: Cam = woke ? { pos: [0.1, 1.0, 2.0 + easeOut(dt / 0.2) * 1.4 - dt * 0.05], look: [0, 0.82, 0], fov: 40 } : faceCam(0, HEAD_Y, 0, lt * 0.04);
    return { cam, warm: 0.15, blur: 9, bg: '#78818d', env: [b, fx], chars: [you], checks: [], flash: woke ? clamp(1 - dt / 0.15) : 0 };
  },
  calls(t, lt) {
    const b = new Builder('env'); shell(b, '#6a6f7a', '#8d97a3');
    let you = pm([0, 0, 0], { pose: { mode: 'stand', head: [0.42, 0, 0], armR: [-1.75, 0.35], armL: [0, 0] }, hold: { item: 'phone', screen: 'phone:calls:847:-:0' }, expr: 'sad' });
    const pc = center(buildChar(you, t).parts.find((p) => p.id === 'screen')!.m);
    you = { ...you, gaze: pc };
    const PMx = new THREE.Matrix4().fromArray(buildChar(you, t).parts.find((p) => p.id === 'screen')!.m), up = new THREE.Vector3().setFromMatrixColumn(PMx, 1).normalize();
    const d = 1 - lt * 0.015;
    return { cam: { pos: [pc[0] - 0.5 * d, pc[1] + 0.38 * d, pc[2] - 0.12 * d], look: [pc[0], pc[1] - 0.01, pc[2]], fov: 27, up: [up.x, up.y, up.z] }, warm: 0.2, blur: 10, bg: '#8d97a3', env: [b], chars: [you], checks: [] };
  },
  meet(t, lt) {
    const b = new Builder('env'); shell(b, '#6a6f7a', '#8d97a3');
    b.part(null, 'table', 'box', [2.2, 0.06, 0.7], [0, 0.72, -0.2], '#8a8f98');
    for (const sx of [-1, 1]) b.part(null, `tleg${sx}`, 'box', [0.08, 0.69, 0.5], [sx * 0.95, 0.345, -0.2], '#5d6066');
    b.part(null, 'chart', 'box', [1.4, 0.8, 0.03], [0, 2.0, -2.22], '#ffffff', { flat: true, solid: false });
    const bored = t >= T.meet2, close = t >= T.email;
    const you = pm([0, 0, -0.95], { expr: close ? 'side' : bored ? 'sad' : 'neutral', pose: { mode: 'stand', head: [bored && !close ? 0.2 : 0, 0, 0] }, fg: close });
    const suits = SUITS.map((l, i) => ch(`suit${i}`, l, [i ? 0.62 : -0.62, 0, -0.95], { expr: bored ? 'sad' : 'neutral', pose: { mode: 'stand', head: [0.1 + 0.08 * Math.sin(t * 2 + i * 2), 0.5 * (i ? -1 : 1) * (bored ? 0 : 1), 0], armR: [-0.5 - 0.3 * Math.sin(t * 5 + i), 0] }, gaze: [0, 1.1, -0.95] }));
    const cam: Cam = close ? faceCam(0, HEAD_Y, -0.95, (t - T.email) * 0.05) : bored ? { pos: [2.2 - (t - T.meet2) * 0.1, 1.35, 1.9], look: [0, 0.95, -0.9], fov: 40 } : { pos: [0, 1.45, 4.3 - lt * 0.12], look: [0, 0.9, -0.7], fov: 40 };
    return { cam, warm: 0.2, blur: close ? 9 : 0, bg: '#8d97a3', env: [b], chars: [you, ...suits], checks: [] };
  },
  chest(t, lt, end) {
    const b = new Builder('env'); shell(b, '#5f6470', '#7b8490');
    const f = new Builder('chest', true), checks: Check[] = [];
    const has = t >= T.chest, opening = ease((t - T.open) / (T.drop - T.open - 0.08));
    if (has) {
      // rattles on every sparse beat of the breakdown, then opens into the drop
      const pulse = Math.max(0, ...BEATS.filter((x) => x.t >= T.chest && x.t <= t && t - x.t < 0.2).map((x) => 1 - (t - x.t) / 0.2));
      chest(f, [0.42, 0, 0], easeOut((t - T.chest) / 0.25), t >= T.open ? opening * 1.9 : pulse * 0.12, t >= T.open ? opening : pulse * 0.25);
      if (t - T.chest > 0.25) checks.push({ kind: 'rest', a: 'chestBase', b: 'floor' });
      if (t >= T.open) rays(f, [0.42, 0.5, 0], 1.2 + opening * 2.5, t, q(opening * 0.5));
    }
    const you = pm([-0.38, 0, 0], {
      rotY: 0.9, gaze: has ? [0.42, 0.3, 0] : [0, 1.2, 6],
      expr: t >= T.open ? 'happy' : t >= T.dont ? 'shock' : has ? 'side' : 'neutral',
      pose: { mode: 'stand', lean: t >= T.open ? 0.25 * easeOut((t - T.open) / 0.4) : t >= T.dont ? -0.12 : 0, armR: [t >= T.open ? -1.2 * easeOut((t - T.open) / 0.4) : 0, 0], head: has ? [0.25, 0, 0] : [0, -0.9, 0] },
    });
    const k = ease(lt / (end - T.wed));
    return { cam: { pos: lerp3([0, 1.35, 5.2], [0.1, 0.9, 3.0], k), look: lerp3([0, 0.75, 0], [0.05, 0.6, 0], k), fov: 40 }, warm: 0.25 + 0.4 * opening, blur: 5, bg: '#7b8490', env: [b, f], chars: [you], checks };
  },
  token(t, lt) {
    const b = new Builder('env'); shell(b, '#6a5a3a', '#c9984f');
    const f = new Builder('chest', true);
    chest(f, [0.42, 0, 0], 1, 1.9, 1);
    const rise = easeOut(lt / 0.9), cy = lerp(0.45, 1.5, rise), pir = t >= T.pirate, dp = t - T.pirate;
    rays(f, [0.42, cy, 0], 4.5, t, 0.4);
    coin(f, [0.42, cy, 0], lerp(0.25, 0.62, rise), t * 5);
    for (let i = 0; i < 8; i++) { const a = t * 2 + (i / 8) * Math.PI * 2; f.part(null, `spark${i}`, 'sphere', [0.05, 0.05, 0.05], [0.42 + Math.cos(a) * 0.55, cy + Math.sin(a) * 0.55, 0.1], '#fff7c2', { emissive: 2, solid: false }); }
    const you = pm([-0.38, 0, 0], pir ? { expr: 'joy', pose: UP } : { rotY: 0.9, expr: 'shock', gaze: [0.42, cy, 0], pose: { mode: 'stand', lean: -0.15, armL: [-0.6, -0.4], armR: [-0.6, 0.4] } }, pir);
    const cam: Cam = pir ? { pos: [-0.2, 1.2, 3.1 - easeOut(dp / 0.2) * 0.7 - dp * 0.05], look: [-0.36, 1.12, 0], fov: 40 } : { pos: [0.55 - lt * 0.05, 0.75, 3.0 - lt * 0.12], look: [0.38, lerp(0.6, 1.3, rise), 0], fov: 40 };
    return { cam, warm: 0.9, blur: 6, bg: '#c9984f', env: [b, f], chars: [you], checks: [{ kind: 'rest', a: 'chestBase', b: 'floor' }], flash: Math.max(clamp(1 - lt / 0.2), pir ? 0.7 * clamp(1 - dp / 0.12) : 0) };
  },
  admin(t, lt) {
    const g = ease((t - T.grav) / 0.8), off = t >= T.grav, adm = t >= T.admin;
    const b = new Builder('env'); shell(b, '#9aa0a8', null);
    for (let i = 0; i < 7; i++) b.part(null, `cloud${i}`, 'sphere', [2.2 + rnd(i) * 2, 1.1, 1.4], [-7 + i * 2.3, 2.2 + rnd(i + 5) * 3.2, -6 - rnd(i + 9) * 4], '#ffffff', { solid: false });
    const f = new Builder('chest');
    chest(f, [1.0, off ? g * 0.9 : 0, -0.7], 1, 1.9, 0, [0, off ? t * 0.7 : 0, off ? g * 0.6 : 0]);
    const checks: Check[] = off ? [] : [{ kind: 'rest', a: 'chestBase', b: 'floor' }];
    const hy = HEAD_Y + g * 0.7;
    const ui = new Builder('ui');
    coin(ui, [Math.cos(t * 2.2) * 0.75, hy - 0.2 + Math.sin(t * 3) * 0.15, Math.sin(t * 2.2) * 0.75], 0.24, t * 5);
    if (adm) {
      const k = easeOut((t - T.admin) / 0.2);
      ui.part(null, 'badge', 'plane', [0.75 * k, 0.75 * k, 1], [0, hy + 0.72, 0], '#fff', { tex: 'sym:ADMIN', emissive: 1, solid: false });
      ui.part(null, 'panel', 'plane', [1.0 * k, 0.7 * k, 1], [0.62, hy + 0.2, -0.9], '#fff', { tex: `panel:${off ? 2 : 1}`, emissive: 1, solid: false }, [0, -0.25, 0]);
    }
    for (let i = 0; i < 3; i++) bird(ui, `pg${i}`, [-1.1 + i * 0.5, off ? 0.4 + g * (0.8 + i * 0.4) + Math.sin(t * 2 + i) * 0.1 : 2.4 + i * 0.2, -0.9 + i * 0.3], t * (off ? 1.5 : 0) + i, t, i, '#c8ccd4');
    const you = pm([0, 0, 0], { expr: off ? 'joy' : adm ? 'happy' : 'side', pose: off ? { mode: 'fly', lift: g * 0.7, sway: Math.sin(t * 2) * 0.08, armL: [-2.8, -0.3], armR: [-2.8, 0.3] } : { mode: 'stand', armR: [adm ? -2.6 : 0, 0.2] } }, true);
    const suit = ch('suit0', SUITS[0], [-0.95, 0, -0.5], off ? { expr: 'shock', pose: { mode: 'fly', lift: g * 1.1, sway: 0.5 * g + Math.sin(t * 3) * 0.15, armL: [-1.6, -0.8], armR: [-1.6, 0.8] }, gaze: [0, 0, 0] } : { rotY: 0.6, gaze: [0, 1.2, 0] });
    return { cam: { pos: [0.25, 1.25 + g * 0.35, 4.3 + g * 0.6 - lt * 0.05], look: [0, 1.1 + g * 0.5, 0], fov: 40 }, warm: 0.8, blur: 0, bg: off ? '#ff8fd0' : '#7ec3ff', env: [b, f, ui], chars: [you, suit], checks, flash: off ? 0.6 * clamp(1 - (t - T.grav) / 0.12) : 0 };
  },
  meme(t, lt) {
    const b = new Builder('env'); shell(b, '#1c1f3a', null);
    const ui = new Builder('ui');
    // one card per beat after the internet finds out, two per beat once you are memed
    let n = 0;
    for (const bt of BEATS) {
      if (bt.t < T.net || bt.t >= T.sat || bt.t > t) continue;
      for (let j = 0; j < (bt.t >= T.memed ? 2 : 1); j++, n++) {
        const side = n % 2 ? 1 : -1, k = easeOut((t - bt.t) / 0.15);
        const pos: V3 = [side * (0.55 + rnd(n) * 0.75), 0.35 + rnd(n + 31) * 2.1, -0.9 + rnd(n + 77) * 1.3];
        ui.part(null, `card${n}`, 'plane', [0.5 * k, 0.5 * k, 1], [pos[0], pos[1] + Math.sin(t * 2 + n) * 0.03, pos[2]], '#fff', { tex: `meme:${n % 6}`, emissive: 1, solid: false }, [0, 0, (rnd(n + 13) - 0.5) * 0.5]);
      }
    }
    const you = pm([0, 0, 0], { expr: t >= T.alot ? 'joy' : t >= T.memed ? 'shock' : t >= T.net ? 'side' : 'neutral', pose: t >= T.alot ? UP : { mode: 'stand', head: [0, Math.sin(t * 4) * (t >= T.net ? 0.35 : 0), 0] } }, true);
    const k = ease(lt / 4.5);
    return { cam: { pos: lerp3([0.05, 1.15, 2.7], [0, 1.3, 4.9], k), look: [0, lerp(1.0, 1.2, k), 0], fov: 40 }, warm: 0.7, blur: 0, bg: '#14162b', env: [b, ui], chars: [you], checks: [] };
  },
  pres(t, lt) {
    const won = t >= T.win, pres = t >= T.pres, close = t >= T.arr;
    const b = new Builder('env'); shell(b, '#7cc36a', null);
    b.part(null, 'stage', 'box', [3.2, 0.4, 1.6], [0, 0.2, -0.4], '#c98b4f');
    b.part(null, 'podium', 'box', [0.5, 0.75, 0.3], [0, 0.775, 0.2], '#6b4a2f');
    for (const sx of [-1, 1]) b.part(null, `post${sx}`, 'box', [0.08, 3.0, 0.08], [sx * 1.45, 1.9, -1.1], '#ffffff', { solid: false });
    if (pres) b.part(null, 'banner', 'plane', [2.8, 0.7, 1], [0, 3.0, -1.1], '#fff', { tex: 'banner:MEME PRESIDENT', emissive: 1, solid: false });
    for (let i = 0; i < 5; i++) b.part(null, `cloud${i}`, 'sphere', [3, 1.3, 1.6], [-7 + i * 3.4, 4.5 + rnd(i) * 2.5, -9], '#fff3df', { solid: false });
    const fx = new Builder('fx');
    if (won) for (let i = 0; i < 70; i++) { // confetti, seeded, loops top to bottom
      const y = 4 - (((t - T.win) * (0.9 + rnd(i) * 0.6) + rnd(i + 3) * 4) % 4);
      fx.part(null, `conf${i}`, 'box', [0.07, 0.012, 0.1], [(rnd(i + 11) - 0.5) * 5, y, -1.2 + rnd(i + 21) * 4.5], ['#3d7bd9', '#ffffff', '#ffd60a'][i % 3], { solid: false, flat: true }, [t * 3 + i, i, t * 2]);
    }
    if (pres) for (let i = 0; i < 6; i++) { const a = t * 1.3 + (i / 6) * Math.PI * 2; bird(fx, `bd${i}`, [Math.cos(a) * 1.5, 2.3 + Math.sin(a * 2) * 0.15, -0.35 + Math.sin(a) * 1.0], -a, t, i); }
    const you = pm([0, 0.4, -0.35], { expr: won ? 'joy' : 'neutral', pose: won ? UP : { mode: 'stand' }, acc: { tie: '#3d7bd9', pirate: true, sash: pres ? '#ffd60a' : undefined }, fg: close }, true);
    const crowd = Array.from({ length: 12 }, (_, i) => {
      const pos: V3 = [-1.5 + (i % 4) * 1.0 + (rnd(i) - 0.5) * 0.2, 0, 2.6 + Math.floor(i / 4) * 0.9];
      const look = { ...LOOKS.kids[i % 5], top: ['#e85d75', '#f2b134', '#5b7cfa', '#9b5de5', '#00a6a6', '#ff7b54'][i % 6] };
      return won ? jumper(`crowd${i}`, look, pos, Math.PI, t, i, [0, 1.5, -0.35]) : ch(`crowd${i}`, look, pos, { rotY: Math.PI, gaze: [0, 1.5, -0.35] });
    });
    const hy = 0.4 + HEAD_Y;
    const cam: Cam = close ? faceCam(0, hy + 0.05, -0.35, (t - T.arr) * 0.06)
      : pres ? { pos: lerp3([0.4, 1.7, 2.2], [0, 3.8, 9.0], ease((t - T.pres) / 2.2)), look: [0, 1.7, -0.3], fov: 40 }
        : won ? { pos: [0.4, 1.6, 2.8 - easeOut((t - T.win) / 0.2) * 0.6], look: [0, 1.45, -0.35], fov: 40 }
          : { pos: [0, 3.4, 8.4 - lt * 0.15], look: [0, 1.3, -0.3], fov: 40 };
    return { cam, warm: 1, blur: close ? 8 : 0, bg: '#ffd9a0', env: [b, fx], chars: [you, ...crowd], checks: [], flash: pres ? 0.7 * clamp(1 - (t - T.pres) / 0.15) : 0 };
  },
  sun(t, lt) {
    const b = new Builder('env'); bedroom(b);
    const c = new Builder('coin');
    coin(c, [1.0, 0.5 + 0.13 * 0.12, -1.7], 0.26, 0.4, true);
    const look = t >= T.token && t < T.arr2;
    if (look) rays(c, [1.0, 0.56, -1.95], 1.1, t, 0.1);
    const patch = t >= T.arr2;
    const you = ch('you', LOOKS.you, [0, 0, 0], { fg: true, expr: patch ? 'side' : t >= T.dream ? 'happy' : t >= T.up ? 'shock' : 'neutral', acc: { patch } });
    const cam: Cam = look ? { pos: [1.55 - (t - T.token) * 0.08, 0.95, -0.55], look: [1.0, 0.55, -1.7], fov: 34 } : faceCam(0, HEAD_Y, 0, patch ? 0 : lt * 0.03);
    return { cam, warm: look ? 0.5 : 0.15, blur: look ? 0 : 9, bg: '#78818d', env: [b, c], chars: [you], checks: [{ kind: 'rest', a: 'coin', b: 'nightstand' }], flash: patch ? 0.6 * clamp(1 - (t - T.arr2) / 0.12) : 0 };
  },
};

export function world(t: number): World {
  let i = 0;
  while (i + 1 < SCENES.length && t >= SCENES[i + 1][1]) i++;
  const [id, start] = SCENES[i], end = SCENES[i + 1]?.[1] ?? LEN;
  const { env, ...w } = S[id](t, t - start, end);
  const parts: Part[] = [...env.flatMap((b) => b.done()), ...w.chars.flatMap((c) => buildChar(c, t).parts)];
  return { scene: id, t, ...w, parts };
}
export const titleAt = (t: number) => t < T.wake;
export const THUMB_T = T.pres + 0.5;
