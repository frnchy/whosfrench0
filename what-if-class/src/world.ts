// Pure scene description: world(t) -> camera + every part as a world matrix.
// The renderer draws exactly this, and sim/validate.ts checks exactly this.
import * as THREE from 'three';
import tl from '../plan/timeline.json';

export const FPS = 30;
export const TL = tl;
export type V3 = [number, number, number];
export type Kind = 'box' | 'sphere' | 'torus' | 'cone' | 'plane' | 'cyl';
export type Part = {
  id: string; owner: string; kind: Kind; m: number[]; color: string;
  tex?: string; emissive?: number; opacity?: number; fg?: boolean; solid?: boolean; flat?: boolean; add?: boolean;
};
export type Expr = 'neutral' | 'sad' | 'side' | 'happy' | 'joy' | 'shock' | 'cry';
export type Look = { skin: string; top: string; pants: string; shoe: string; hair: string; style: 'fringe' | 'bun' | 'spiky' | 'cap' | 'long'; glasses?: boolean };
export type Pose = { mode: 'stand' | 'sit' | 'air' | 'fly'; lift?: number; crouch?: number; lean?: number; head?: V3; armL?: [number, number]; armR?: [number, number]; sway?: number };
export type Thumb = { u: number; v: number; lift: number };
export type Hold = { item: 'phone' | 'paper' | 'chalk'; screen?: string; thumb?: Thumb };
export type Char = { id: string; look: Look; pos: V3; rotY: number; pose: Pose; expr: Expr; gaze: V3; fg?: boolean; hold?: Hold; halo?: boolean; blush?: boolean; acc?: { tie?: string; pirate?: boolean; patch?: boolean; sash?: string } };
export type Cam = { pos: V3; look: V3; fov: number; up?: V3 };
export type World = {
  scene: string; t: number; flash?: number; cam: Cam; warm: number; blur: number; bg: string; heaven?: boolean;
  parts: Part[]; chars: Char[]; checks: Check[];
};
// contact assertions the validator must verify (seat, desk, sill...)
export type Check = { kind: 'seat' | 'rest' | 'board'; a: string; b: string };

// ---------- helpers ----------
export const rnd = (s: number) => { const x = Math.sin(s * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ease = (x: number) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const lerp3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
export const mixHex = (a: string, b: string, k: number) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), k).getHexString();

type Line = (typeof tl.lines)[number];
const line = (n: number): Line => tl.lines[n - 1];
/** global time of the first word in line n starting with prefix */
export const ev = (n: number, prefix: string) => {
  const w = line(n).words.find((x) => x.w.toLowerCase().startsWith(prefix.toLowerCase()));
  if (!w) throw new Error(`no word ${prefix} in L${n}`);
  return w.start;
};
/** snap an action to the nearest hard beat within `win` seconds (so gags land on the music) */
export const onBeat = (t: number, win = 0.25) => {
  let best = t, d = win;
  for (const b of tl.beats) if (b.s >= 0.75 && Math.abs(b.t - t) <= d) { d = Math.abs(b.t - t); best = b.t; }
  return best;
};
export const sceneAt = (t: number) => tl.scenes.find((s) => t >= s.start && t < s.end) ?? tl.scenes[tl.scenes.length - 1];

/** counter value; -1 means infinity */
export const counterAt = (t: number) => {
  let v = 0, from = 0, at = 0;
  for (const [ct, cv] of tl.counter) { const bt = onBeat(ct); if (t >= bt) { from = v; v = cv; at = bt; } }
  return { value: v, from, since: t - at };
};

// ---------- blinks (seeded, every 2.4–5 s) ----------
const blinkCache: Record<string, number[]> = {};
export const blinkTimes = (id: string) => {
  if (blinkCache[id]) return blinkCache[id];
  let h = 0; for (const c of id) h = h * 31 + c.charCodeAt(0);
  const out: number[] = []; let t = 0.6 + rnd(h) * 1.5;
  while (t < tl.length + 6) { out.push(t); t += 2.4 + rnd(h + out.length) * 2.6; }
  return (blinkCache[id] = out);
};
export const blinking = (id: string, t: number) => blinkTimes(id).some((b) => t >= b && t < b + 0.12);

// ---------- builder ----------
export class Builder {
  metas: { o: THREE.Object3D; p: Omit<Part, 'm'>; size: V3 }[] = [];
  root = new THREE.Object3D();
  constructor(public owner: string, public fg = false) {}
  node(parent: THREE.Object3D | null, pos: V3, rot: V3 = [0, 0, 0], order: THREE.EulerOrder = 'XYZ') {
    const o = new THREE.Object3D(); o.position.set(...pos); o.rotation.set(rot[0], rot[1], rot[2], order);
    (parent ?? this.root).add(o); return o;
  }
  part(parent: THREE.Object3D | null, id: string, kind: Kind, size: V3, pos: V3, color: string, extra: Partial<Part> = {}, rot: V3 = [0, 0, 0]) {
    const o = this.node(parent, pos, rot);
    this.metas.push({ o, size, p: { id, owner: this.owner, kind, color, fg: this.fg, solid: kind === 'box', ...extra } });
    return o;
  }
  done(): Part[] {
    this.root.updateMatrixWorld(true);
    return this.metas.map(({ o, size, p }) => ({ ...p, m: o.matrixWorld.clone().multiply(new THREE.Matrix4().makeScale(...size)).toArray() }));
  }
}

// ---------- character rig ----------
export const DIM = { shoeH: 0.06, shin: 0.2, thigh: 0.2, legW: 0.13, torso: [0.4, 0.42, 0.24] as V3, head: 0.44, arm: [0.11, 0.34, 0.11] as V3, hand: [0.12, 0.11, 0.08] as V3, phone: [0.085, 0.17, 0.01] as V3, screen: [0.077, 0.16] };
export const BUTTONS: Record<string, [number, number, number, number]> = {
  // phone-frame rects [u0,v0,u1,v1] (metres)
  replay: [-0.033, -0.068, -0.005, -0.048],
  watch: [-0.03, 0.038, 0.03, 0.054],
};
const hipYFor = (p: Pose) => (p.mode === 'sit' ? DIM.shoeH + DIM.shin : DIM.shoeH + (DIM.shin + DIM.thigh) * Math.cos(p.crouch ?? 0));

export function buildChar(c: Char, t: number) {
  const b = new Builder(c.id, c.fg);
  const p = c.pose, L = c.look;
  const lift = p.lift ?? 0;
  const root = b.node(null, [c.pos[0], c.pos[1] + lift, c.pos[2]], [0, c.rotY, p.sway ?? 0], 'YXZ');
  const hipY = hipYFor(p);
  const hips = b.node(root, [0, hipY, 0]);
  // legs
  for (const s of [-1, 1]) {
    const a = p.mode === 'sit' ? Math.PI / 2 : p.crouch ?? 0;
    const thigh = b.node(hips, [s * 0.1, 0, 0], [-a, 0, 0]);
    b.part(thigh, `thigh${s}`, 'box', [DIM.legW, DIM.thigh + 0.02, DIM.legW], [0, -DIM.thigh / 2, 0], L.pants);
    const knee = b.node(thigh, [0, -DIM.thigh, 0], [p.mode === 'sit' ? Math.PI / 2 : 2 * a, 0, 0]);
    b.part(knee, `shin${s}`, 'box', [DIM.legW, DIM.shin, DIM.legW], [0, -DIM.shin / 2, 0], L.pants);
    const ankle = b.node(knee, [0, -DIM.shin, 0], [p.mode === 'sit' ? 0 : -a, 0, 0]);
    b.part(ankle, `shoe${s}`, 'box', [0.15, DIM.shoeH, 0.22], [0, -DIM.shoeH / 2, 0.03], L.shoe);
  }
  // spine / torso
  const spine = b.node(hips, [0, 0, 0], [p.lean ?? 0, 0, 0]);
  b.part(spine, 'torso', 'box', DIM.torso, [0, DIM.torso[1] / 2, 0], L.top);
  b.part(spine, 'hood', 'box', [0.3, 0.1, 0.06], [0, 0.38, -0.14], mixHex(L.top, '#000000', 0.15));
  // head
  const h = p.head ?? [0, 0, 0];
  const neck = b.node(spine, [0, DIM.torso[1], 0], h, 'YXZ');
  const head = b.node(neck, [0, DIM.head / 2, 0]);
  b.part(head, 'head', 'box', [DIM.head, DIM.head, DIM.head], [0, 0, 0], L.skin);
  // gaze -> pupil offset in head space
  root.updateMatrixWorld(true);
  const local = new THREE.Vector3(...c.gaze).applyMatrix4(head.matrixWorld.clone().invert()).normalize();
  const gx = Math.round(clamp(local.x / 0.45, -1, 1)), gy = local.y > 0.3 ? -1 : local.y < -0.3 ? 1 : 0;
  const blink = blinking(c.id, t) ? 1 : 0;
  b.part(head, 'face', 'plane', [0.4, 0.4, 1], [0, 0, DIM.head / 2 + 0.002], L.skin,
    { tex: `face:${c.expr}:${gx}:${gy}:${blink}:${L.glasses ? 1 : 0}:${c.blush ? 1 : 0}:${L.skin}:${c.acc?.pirate || c.acc?.patch ? 1 : 0}`, solid: false });
  const H = DIM.head / 2;
  b.part(head, 'hairTop', 'box', [0.46, 0.08, 0.46], [0, H + 0.02, 0], L.hair);
  if (L.style !== 'cap') b.part(head, 'hairBack', 'box', [0.46, L.style === 'long' ? 0.5 : 0.26, 0.07], [0, L.style === 'long' ? -0.04 : 0.09, -H - 0.01], L.hair);
  if (L.style === 'fringe') b.part(head, 'fringe', 'box', [0.34, 0.07, 0.05], [0.05, H - 0.03, H + 0.01], L.hair, {}, [0, 0, -0.12]);
  if (L.style === 'bun') b.part(head, 'bun', 'sphere', [0.17, 0.17, 0.17], [0, H + 0.1, -0.1], L.hair);
  if (L.style === 'spiky') for (let i = 0; i < 3; i++) b.part(head, `spike${i}`, 'box', [0.1, 0.12, 0.1], [-0.13 + i * 0.13, H + 0.1, 0.02], L.hair, {}, [0.2, 0, (i - 1) * 0.4]);
  if (L.style === 'cap') { b.part(head, 'cap', 'box', [0.47, 0.1, 0.47], [0, H + 0.03, 0], L.hair); b.part(head, 'brim', 'box', [0.4, 0.03, 0.16], [0, H - 0.01, H + 0.07], L.hair); }
  if (L.style === 'long') for (const s of [-1, 1]) b.part(head, `side${s}`, 'box', [0.06, 0.36, 0.4], [s * (H + 0.02), 0.02, -0.03], L.hair);
  if (c.halo) b.part(head, 'halo', 'torus', [0.42, 0.42, 0.42], [0, H + 0.16, 0], '#ffd60a', { emissive: 1.4, solid: false }, [Math.PI / 2, 0, 0]);
  const A = c.acc ?? {};
  if (A.tie) { b.part(spine, 'shirt', 'box', [0.13, 0.3, 0.02], [0, 0.27, 0.115], '#ffffff', { solid: false }); b.part(spine, 'tie', 'box', [0.05, 0.24, 0.02], [0, 0.25, 0.128], A.tie, { solid: false }); }
  if (A.sash) b.part(spine, 'sash', 'box', [0.1, 0.56, 0.02], [0, 0.21, 0.14], A.sash, { solid: false }, [0, 0, 0.72]);
  if (A.pirate) {
    b.part(head, 'hatBrim', 'box', [0.62, 0.05, 0.56], [0, H + 0.085, 0], '#17171c');
    b.part(head, 'hatCrown', 'box', [0.42, 0.2, 0.34], [0, H + 0.2, 0], '#17171c');
    b.part(head, 'hatSkull', 'plane', [0.17, 0.17, 1], [0, H + 0.2, 0.172], '#fff', { tex: 'skull', solid: false });
  }
  // arms (right arm is -x: character faces +z)
  const hands: Record<string, THREE.Object3D> = {};
  for (const [s, ang, nm] of [[-1, p.armR ?? [0, 0], 'R'], [1, p.armL ?? [0, 0], 'L']] as const) {
    const sh = b.node(spine, [s * 0.255, 0.36, 0], [ang[0], ang[1], 0], 'YXZ');
    b.part(sh, `arm${nm}`, 'box', DIM.arm, [0, -DIM.arm[1] / 2, 0], L.top);
    const hand = b.part(sh, `hand${nm}`, 'box', DIM.hand, [0, -DIM.arm[1] - DIM.hand[1] / 2 + 0.005, 0], L.skin);
    hands[nm] = hand;
    if (!(nm === 'R' && c.hold?.item === 'phone')) b.part(hand, `thumb${nm}`, 'box', [0.035, 0.06, 0.04], [-s * 0.07, 0.01, 0.015], L.skin);
  }
  // held items sit flush on the palm (+z face of the right hand)
  const hold = c.hold;
  if (hold) {
    const hr = hands.R, pz = DIM.hand[2] / 2;
    if (hold.item === 'phone') {
      const ph = b.node(hr, [0, -0.03, pz + DIM.phone[2] / 2], [0, 0, Math.PI]);
      b.metas.push({ o: ph, size: DIM.phone, p: { id: 'phone', owner: c.id, kind: 'box', color: '#1d1f27', fg: c.fg, solid: true } });
      const scr = b.node(ph, [0, 0, DIM.phone[2] / 2 + 0.0008]);
      b.metas.push({ o: scr, size: [DIM.screen[0], DIM.screen[1], 1], p: { id: 'screen', owner: c.id, kind: 'plane', color: '#000', tex: hold.screen, emissive: 1, fg: c.fg, solid: false } });
      // stretchy mitten thumb: from the phone's edge (over the hand) to its target, lying on the glass + lift
      const th = hold.thumb ?? { u: 0.034, v: -0.07, lift: 0 };
      const bx = 0.05, by = -0.045, dx = th.u - bx, dy = th.v - by;
      const len = Math.hypot(dx, dy) + 0.02, ang = Math.atan2(dy, dx);
      const tn = b.node(ph, [(bx + th.u) / 2 + Math.cos(ang) * 0.01, (by + th.v) / 2 + Math.sin(ang) * 0.01, DIM.phone[2] / 2 + th.lift + 0.0125], [0, 0, ang]);
      b.metas.push({ o: tn, size: [len, 0.032, 0.025], p: { id: 'thumbR', owner: c.id, kind: 'box', color: L.skin, fg: c.fg, solid: false } });
      // tip marker (zero-size) so the validator knows exactly where the thumb tip is
      const tip = b.node(ph, [th.u, th.v, DIM.phone[2] / 2 + th.lift]);
      b.metas.push({ o: tip, size: [0.001, 0.001, 0.001], p: { id: 'thumbTip', owner: c.id, kind: 'box', color: L.skin, fg: c.fg, solid: false, opacity: 0 } });
    } else if (hold.item === 'paper') {
      const pp = b.node(hr, [0, -0.1, pz + 0.002], [0, 0, Math.PI]);
      b.metas.push({ o: pp, size: [0.21, 0.28, 0.004], p: { id: 'paper', owner: c.id, kind: 'box', color: '#fbfaf3', fg: c.fg, solid: false } });
      const pl = b.node(pp, [0, 0, 0.0025]);
      b.metas.push({ o: pl, size: [0.2, 0.27, 1], p: { id: 'paperFace', owner: c.id, kind: 'plane', color: '#fff', tex: 'paper', fg: c.fg, solid: false } });
      b.part(hr, 'thumbR', 'box', [0.035, 0.06, 0.03], [0.07, -0.02, pz + 0.004 + 0.015], L.skin);
    } else {
      b.part(hr, 'chalk', 'box', [0.025, 0.09, 0.025], [0, -0.06, pz + 0.0125], '#f4f1e8', { solid: false });
    }
  }
  const parts = b.done();
  return { parts, hipY, head };
}

// ---------- looks (identical in every shot) ----------
export const LOOKS = {
  you: { skin: '#e9b48a', top: '#2bb3a3', pants: '#2f3a56', shoe: '#f2f2f2', hair: '#3b2416', style: 'fringe' } as Look,
  teacher: { skin: '#8d5a3b', top: '#7b4fa8', pants: '#3a3340', shoe: '#5a2d1c', hair: '#c9c6c2', style: 'bun', glasses: true } as Look,
  t2: { skin: '#f0c8a8', top: '#3f8f4f', pants: '#2d2d33', shoe: '#222', hair: '#7a4a24', style: 'long', glasses: true } as Look,
  t3: { skin: '#c68d64', top: '#e0743a', pants: '#3a3340', shoe: '#333', hair: '#1c1c1c', style: 'cap' } as Look,
  kids: [
    { skin: '#f3c9a5', top: '#e85d75', pants: '#30364d', shoe: '#fff', hair: '#d9a23a', style: 'long' },
    { skin: '#7a4b31', top: '#f2b134', pants: '#273043', shoe: '#e33', hair: '#141414', style: 'spiky' },
    { skin: '#d8a07a', top: '#5b7cfa', pants: '#3b3b3b', shoe: '#fff', hair: '#5a3a22', style: 'cap' },
    { skin: '#ffd9bd', top: '#9b5de5', pants: '#2b2d42', shoe: '#ff9f1c', hair: '#c0392b', style: 'fringe' },
    { skin: '#a8714c', top: '#00a6a6', pants: '#3d3d3d', shoe: '#fff', hair: '#2a1a10', style: 'bun' },
  ] as Look[],
};

// ---------- props ----------
const DESK_TOP = 0.54, SEAT_TOP = 0.195;
function desk(b: Builder, id: string, x: number, z: number, warm: number) {
  const wood = mixHex('#8a8f98', '#c98b4f', warm);
  b.part(null, `${id}_top`, 'box', [0.8, 0.04, 0.45], [x, DESK_TOP - 0.02, z + 0.62], wood);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.part(null, `${id}_leg${sx}${sz}`, 'box', [0.04, DESK_TOP - 0.04, 0.04], [x + sx * 0.36, (DESK_TOP - 0.04) / 2, z + 0.62 + sz * 0.19], '#5d6066');
}
function stool(b: Builder, id: string, x: number, z: number) {
  b.part(null, `${id}_seat`, 'box', [0.3, 0.04, 0.3], [x, SEAT_TOP - 0.02, z - 0.03], '#d65a3a');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.part(null, `${id}_l${sx}${sz}`, 'box', [0.03, SEAT_TOP - 0.04, 0.03], [x + sx * 0.12, (SEAT_TOP - 0.04) / 2, z - 0.03 + sz * 0.12], '#55585e');
}
export const BOARD_Z = 3.62;
function room(b: Builder, warm: number, board: string) {
  const wall = mixHex('#8d97a3', '#f3c98f', warm), floor = mixHex('#6d7178', '#b9773f', warm);
  b.part(null, 'floor', 'box', [8, 0.1, 8], [0, -0.05, 0.3], floor, { flat: true, solid: false });
  b.part(null, 'wallFront', 'box', [8, 3.2, 0.1], [0, 1.6, 3.72], wall, { flat: true });
  b.part(null, 'wallBack', 'box', [8, 3.2, 0.1], [0, 1.6, -3.0], wall, { flat: true });
  // window wall x=-3.2 with two openings (z -2..-0.6 and 0.4..1.8, y 0.9..2.3)
  const W = -3.2;
  b.part(null, 'wwLow', 'box', [0.1, 0.9, 6.8], [W, 0.45, 0.35], wall, { flat: true });
  b.part(null, 'wwHigh', 'box', [0.1, 0.9, 6.8], [W, 2.75, 0.35], wall, { flat: true });
  for (const [z0, z1, k] of [[-3.05, -2, 0], [-0.6, 0.4, 1], [1.8, 3.75, 2]]) b.part(null, `wwCol${k}`, 'box', [0.1, 1.4, z1 - z0], [W, 1.6, (z0 + z1) / 2], wall, { flat: true });
  b.part(null, 'sill', 'box', [0.3, 0.05, 6.8], [W + 0.12, 0.925, 0.35], mixHex('#9aa0a8', '#fff2df', warm), { flat: true });
  for (const [zc, k] of [[-1.3, 0], [1.1, 1]]) b.part(null, `glass${k}`, 'box', [0.02, 1.4, 1.4], [W - 0.02, 1.6, zc], mixHex('#9fb4c8', '#bfe8ff', warm), { opacity: 0.25, solid: false, flat: true });
  // door wall x=+3.2 with opening z 1.6..2.6, y 0..2.2
  b.part(null, 'dwA', 'box', [0.1, 3.2, 4.65], [3.2, 1.6, -0.675], wall, { flat: true });
  b.part(null, 'dwB', 'box', [0.1, 3.2, 1.15], [3.2, 1.6, 3.175], wall, { flat: true });
  b.part(null, 'dwTop', 'box', [0.1, 1.0, 1.0], [3.2, 2.7, 2.1], wall, { flat: true });
  b.part(null, 'doorFrame', 'box', [0.14, 0.08, 1.12], [3.2, 2.24, 2.1], '#6b4a2f', { flat: true });
  // board on front wall
  b.part(null, 'boardFrame', 'box', [2.6, 1.3, 0.06], [0, 1.65, 3.65], '#6b4a2f', { flat: true });
  b.part(null, 'board', 'plane', [2.4, 1.1, 1], [0, 1.65, BOARD_Z], '#2c4a3a', { tex: `board:${board}`, solid: false }, [0, Math.PI, 0]);
  // back wall: clock + posters
  b.part(null, 'clock', 'cyl', [0.4, 0.04, 0.4], [0, 2.4, -2.94], '#ffffff', { solid: false }, [Math.PI / 2, 0, 0]);
  const posters = ['#e85d75', '#5b7cfa', '#f2b134', '#3f8f4f'];
  posters.forEach((c, i) => b.part(null, `poster${i}`, 'box', [0.6, 0.8, 0.02], [-2.4 + i * 1.6 + (i > 1 ? 0.3 : 0), 1.7, -2.94], mixHex('#8a8f98', c, 0.3 + warm * 0.7), { flat: true, solid: false }));
  // outside: ground + trees seen through the window
  b.part(null, 'outside', 'box', [14, 0.1, 20], [-10.5, -0.05, 0], mixHex('#6f7f6f', '#7cc36a', warm), { flat: true, solid: false });
  for (let i = 0; i < 4; i++) {
    b.part(null, `tree${i}`, 'sphere', [1.6, 1.6, 1.6], [-7 - i * 0.7, 2 + rnd(i) * 0.6, -3 + i * 2.2], mixHex('#5f735f', '#4caf50', warm), { solid: false });
    b.part(null, `trunk${i}`, 'box', [0.25, 1.4, 0.25], [-7 - i * 0.7, 0.7, -3 + i * 2.2], '#6b4a2f', { solid: false });
  }
}

// student desks: [x, z] of each seat; "you" at the origin
const SEATS: [number, number][] = [[-1.3, 0], [1.3, 0], [-1.3, -1.6], [0, -1.6], [1.3, -1.6]];

// ---------- poses ----------
const PHONE_ARM: [number, number] = [-1.75, 0.35];
const sitBase = (o: Partial<Pose> = {}): Pose => ({ mode: 'sit', lean: 0.12, head: [0.42, 0, 0], armR: PHONE_ARM, armL: [-0.15, 0], ...o });

/** solve the left arm pitch so the hand rests exactly on the desk top */
function restLeftHand(c: Char, t: number): Char {
  let lo = -2.4, hi = -0.5;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const cc = { ...c, pose: { ...c.pose, armL: [mid, c.pose.armL?.[1] ?? 0] as [number, number] } };
    const hand = buildChar(cc, t).parts.find((p) => p.id === 'handL')!;
    const minY = obbMinY(hand.m);
    if (minY > DESK_TOP) lo = mid; else hi = mid; // more negative pitch raises the hand
  }
  return { ...c, pose: { ...c.pose, armL: [(lo + hi) / 2, c.pose.armL?.[1] ?? 0] } };
}
export function obbCorners(m: number[]) {
  const M = new THREE.Matrix4().fromArray(m), out: THREE.Vector3[] = [];
  for (const x of [-0.5, 0.5]) for (const y of [-0.5, 0.5]) for (const z of [-0.5, 0.5]) out.push(new THREE.Vector3(x, y, z).applyMatrix4(M));
  return out;
}
const obbMinY = (m: number[]) => Math.min(...obbCorners(m).map((v) => v.y));
export const center = (m: number[]): V3 => [m[12], m[13], m[14]];

// teacher at the board: slide her along z until the chalk tip touches the board
function teacherAtBoard(t: number, writing: number, warm: number): Char {
  const yaw = -0.15 + Math.sin(t * 9) * 0.12 * writing; // writing strokes swing sideways; feet stay planted
  let c: Char = { id: 'teacher', look: LOOKS.teacher, pos: [1.0, 0, 3.2], rotY: 0, pose: { mode: 'stand', armR: [writing > 0 ? -2.0 : -0.2, yaw], armL: [0.05, 0], head: [-0.15, 0, 0] }, expr: warm > 0.5 ? 'happy' : 'neutral', gaze: [0.4, 1.8, BOARD_Z], hold: { item: 'chalk' } };
  if (writing > 0) {
    // solve the arm pitch so the chalk tip touches the board (z decreases as the arm rises past horizontal)
    let lo = -2.9, hi = -1.6;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      const cc = { ...c, pose: { ...c.pose, armR: [mid, yaw] as [number, number] } };
      const z = Math.max(...obbCorners(buildChar(cc, t).parts.find((p) => p.id === 'chalk')!.m).map((v) => v.z));
      if (z > BOARD_Z) hi = mid; else lo = mid;
    }
    c = { ...c, pose: { ...c.pose, armR: [hi, yaw] } };
  }
  return c;
}

export function bird(b: Builder, id: string, pos: V3, heading: number, t: number, phase: number, color = '#fdfdfd') {
  const r = b.node(null, pos, [0, heading, 0]);
  b.part(r, `${id}_body`, 'box', [0.1, 0.09, 0.18], [0, 0, 0], color, { solid: false });
  b.part(r, `${id}_head`, 'box', [0.08, 0.08, 0.08], [0, 0.05, 0.1], color, { solid: false });
  b.part(r, `${id}_beak`, 'box', [0.03, 0.03, 0.05], [0, 0.04, 0.16], '#ff9f1c', { solid: false });
  const flap = Math.sin(t * 22 + phase) * 0.7;
  for (const s of [-1, 1]) { const w = b.node(r, [s * 0.05, 0.02, 0], [0, 0, s * flap]); b.part(w, `${id}_w${s}`, 'box', [0.16, 0.02, 0.1], [s * 0.08, 0, 0], color, { solid: false }); }
}

// ---------- the reel on the phone ----------
export type PhoneUI = { mode: 'reel' | 'notif' | 'down'; replays: number; pressed: string | null; t: number; warm: number };
export const phoneTex = (u: PhoneUI) => `phone:${u.mode}:${u.replays}:${u.pressed ?? '-'}:${u.t.toFixed(2)}`;
const inRect = (th: Thumb, r: [number, number, number, number]) => th.u >= r[0] && th.u <= r[2] && th.v >= r[1] && th.v <= r[3];
export const pressedBy = (th: Thumb) => (th.lift <= 0.002 ? Object.keys(BUTTONS).find((k) => inRect(th, BUTTONS[k])) ?? null : null);
const REST: Thumb = { u: 0.036, v: -0.075, lift: 0 }; // resting on the glass edge
const btnCenter = (k: string): [number, number] => { const r = BUTTONS[k]; return [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2]; };
/** thumb path for taps on `button` at times `taps` (contact frames centred on each beat) */
function thumbFor(t: number, taps: number[], button: string): Thumb {
  for (const tb of taps) {
    const k = (t - tb) * FPS; // frames relative to the tap
    if (k < -7 || k > 9) continue;
    const [bu, bv] = btnCenter(button);
    if (k >= -1 && k <= 2) return { u: bu, v: bv, lift: 0 };
    const travel = k < -1 ? ease((k + 7) / 6) : 1 - ease((k - 2) / 7);
    return { u: lerp(REST.u, bu, travel), v: lerp(REST.v, bv, travel), lift: 0.012 * Math.sin(Math.PI * travel) };
  }
  return REST;
}

// ---------- scenes ----------
function classroom(t: number, o: {
  warm: number; board: string; you: Partial<Char> & { pose: Pose }; youFg?: boolean; teacher?: Char | null; extra?: (b: Builder) => void; kids?: 'sit' | 'cheer'; phoneOnDesk?: boolean;
}) {
  const env = new Builder('env');
  room(env, o.warm, o.board);
  const fgB = new Builder('envFg', true);
  desk(o.youFg ? fgB : env, 'deskYou', 0, 0, o.warm);
  stool(o.youFg ? fgB : env, 'stoolYou', 0, 0);
  const chars: Char[] = [];
  let you: Char = { id: 'you', look: LOOKS.you, pos: [0, 0, 0], rotY: 0, expr: 'neutral', gaze: [0, 1.65, BOARD_Z], fg: true, ...o.you };
  if (you.pose.mode === 'sit' && you.pose.armL && you.pose.armL[0] < -0.4) you = restLeftHand(you, t);
  chars.push(you);
  const checks: Check[] = [];
  if (you.pose.mode === 'sit') checks.push({ kind: 'seat', a: 'you', b: 'stoolYou_seat' });
  if (you.pose.mode === 'sit' && you.pose.armL && you.pose.armL[0] < -0.4) checks.push({ kind: 'rest', a: 'you:handL', b: 'deskYou_top' });
  if (o.phoneOnDesk) {
    const ph = (o.youFg ? fgB : env).part(null, 'phoneDesk', 'box', [DIM.phone[0], DIM.phone[2], DIM.phone[1]], [0.22, DESK_TOP + DIM.phone[2] / 2, 0.55], '#1d1f27');
    void ph; checks.push({ kind: 'rest', a: 'phoneDesk', b: 'deskYou_top' });
  }
  SEATS.forEach(([x, z], i) => {
    desk(env, `desk${i}`, x, z, o.warm);
    if (o.kids === 'cheer') {
      // stand beside the desk and jump: crouch -> air -> land, seeded phase
      const per = 0.93, ph = (t + rnd(i + 3) * per) % per, f = ph / per;
      let pose: Pose;
      if (f < 0.25) pose = { mode: 'stand', crouch: Math.sin((f / 0.25) * Math.PI) * 0.6, armL: [-2.9, -0.3], armR: [-2.9, 0.3] };
      else if (f < 0.75) { const k = (f - 0.25) / 0.5; pose = { mode: 'air', lift: 4 * k * (1 - k) * 0.35, crouch: 0.15, armL: [-3.0, -0.3], armR: [-3.0, 0.3] }; }
      else pose = { mode: 'stand', crouch: Math.sin(((f - 0.75) / 0.25) * Math.PI) * 0.35, armL: [-2.7, -0.3], armR: [-2.7, 0.3] };
      chars.push({ id: `kid${i}`, look: LOOKS.kids[i], pos: [x + (x < 0 ? -0.62 : 0.62) * (x === 0 ? 0 : 1) + (x === 0 ? 0.62 : 0), 0, z + 0.3], rotY: 0, pose, expr: 'joy', gaze: [0, 0.9, 0] });
    } else {
      stool(env, `stool${i}`, x, z);
      chars.push({ id: `kid${i}`, look: LOOKS.kids[i], pos: [x, 0, z], rotY: 0, pose: { mode: 'sit', lean: 0.05, head: [0.05 + 0.05 * Math.sin(t * 0.7 + i), 0.1 * Math.sin(t * 0.5 + i * 2), 0], armL: [-0.6, 0], armR: [-0.6, 0] }, expr: o.warm > 0.4 ? 'happy' : 'neutral', gaze: [0, 1.65, BOARD_Z] });
      checks.push({ kind: 'seat', a: `kid${i}`, b: `stool${i}_seat` });
    }
  });
  const fixed = chars.map((c) => (c.id.startsWith('kid') && c.pose.mode === 'sit' ? restLeftHandKid(c, t) : c));
  if (o.teacher !== null) fixed.push(o.teacher ?? teacherAtBoard(t, 1, o.warm));
  o.extra?.(env);
  return { parts: [...env.done(), ...fgB.done()], chars: fixed, checks };
}
// classmates rest both hands on their desks
function restLeftHandKid(c: Char, t: number): Char {
  let out = restLeftHand(c, t);
  // mirror the solved pitch to the right arm (symmetric rig)
  out = { ...out, pose: { ...out.pose, armR: [out.pose.armL![0], 0] } };
  return out;
}

const SCENES: Record<string, (t: number, lt: number, s: { start: number; end: number }) => Omit<World, 'scene' | 't'>> = {
  face(t, lt) {
    const tap = 0; void tap;
    const c = classroom(t, { warm: 0.15, board: 'sad', youFg: true, you: { pose: sitBase({ armL: [-1.2, 0] }), hold: { item: 'phone', screen: phoneTex({ mode: 'reel', replays: 1, pressed: null, t, warm: 0 }) }, expr: 'neutral' } });
    const youHead = headCenter(c);
    const phone = cp(c.chars[0], 'screen', t);
    c.chars[0] = { ...c.chars[0], gaze: center(phone.m) };
    const push = lt * 0.04;
    return { cam: { pos: [youHead[0] + 0.05, youHead[1] + 0.02, youHead[2] + 2.0 - push], look: [youHead[0], youHead[1] - 0.12, youHead[2]], fov: 40 }, warm: 0.15, blur: 9, bg: '#7d8794', ...rebuild(c, t) };
  },
  phone(t, lt, s) {
    const taps = [4.76, 6.629, 8.51].map((x) => onBeat(x)).filter((x) => x > s.start && x < s.end);
    const th = thumbFor(t, taps, 'replay');
    const replays = 1 + taps.filter((x) => t >= x - 1 / FPS).length;
    const ui: PhoneUI = { mode: 'reel', replays, pressed: pressedBy(th), t: t - (taps.filter((x) => t >= x).pop() ?? s.start), warm: 0 };
    const c = classroom(t, { warm: 0.1, board: 'sad', youFg: true, you: { pose: sitBase({ armL: [-1.2, 0] }), hold: { item: 'phone', screen: phoneTex(ui), thumb: th }, expr: 'side' } });
    const phone = cp(c.chars[0], 'screen', t);
    c.chars[0] = { ...c.chars[0], gaze: center(phone.m), expr: 'neutral' };
    const pc = center(phone.m);
    // over the right shoulder, clear of the head, looking down onto the glass; slow drift in
    const d = 1 - lt * 0.012;
    const cam: V3 = [pc[0] - 0.5 * d, pc[1] + 0.38 * d, pc[2] - 0.12 * d];
    const PM = new THREE.Matrix4().fromArray(phone.m), up = new THREE.Vector3().setFromMatrixColumn(PM, 1).normalize();
    return { cam: { pos: cam, look: [pc[0], pc[1] - 0.01, pc[2]], fov: 27, up: [up.x, up.y, up.z] }, warm: 0.1, blur: 10, bg: '#6f7884', ...rebuild(c, t) };
  },
  sad(t, lt) {
    const c = classroom(t, { warm: 0, board: 'sad', you: { pose: sitBase({ lean: 0.18, head: [0.42, 0, 0.08], armL: [-1.1, 0], armR: [-1.95, 0.35] }), hold: { item: 'phone', screen: phoneTex({ mode: 'reel', replays: 4, pressed: null, t, warm: 0 }) }, expr: 'sad' } });
    c.chars[0] = { ...c.chars[0], gaze: center(cp(c.chars[0], 'screen', t).m) };
    const k = ease(lt / 2.8);
    return { cam: { pos: lerp3([1.2, 0.85, 2.6], [0.5, 0.75, 1.7], k), look: [0, 0.82, 0.1], fov: 40 }, warm: 0, blur: 5, bg: '#666e78', ...rebuild(c, t) };
  },
  whatif(t, lt, s) {
    const flip = onBeat(ev(7, 'attention'));
    const w = t >= flip ? 1 : 0;
    const c = classroom(t, { warm: w * 0.6, board: w ? 'half' : 'sad', youFg: true, you: { pose: sitBase({ head: w ? [-0.08, 0, 0] : [0.35, -0.25, 0], armL: [-1.2, 0] }), hold: { item: 'phone', screen: phoneTex({ mode: 'reel', replays: 4, pressed: null, t, warm: 0 }) }, expr: w ? 'shock' : 'side' } });
    c.chars[0] = { ...c.chars[0], gaze: [0.6, 1.6, BOARD_Z] };
    const hc = headCenter(c);
    // snap zoom at the start, another snap on the flip
    const z = t < flip ? 2.4 - easeOut(lt / 0.25) * 0.6 - lt * 0.05 : 1.75 - easeOut((t - flip) / 0.2) * 0.3;
    void s;
    return { cam: { pos: [hc[0] - 0.15, hc[1] + 0.03, hc[2] + z], look: [hc[0], hc[1] - 0.03, hc[2]], fov: 40 }, warm: w * 0.6, blur: 10, bg: w ? '#d9a679' : '#6f7884', ...rebuild(c, t) };
  },
  esc1(t, lt) {
    const fr = onBeat(ev(9, 'fraction')), an = onBeat(ev(10, 'another'));
    const board = t >= an ? 'threeq' : t >= fr ? 'half' : 'blank';
    // tiny seated hop on "fraction": anticipation, 8 frames up, land
    const hk = (t - fr) * FPS;
    const hop = hk >= 0 && hk < 8 ? Math.sin((hk / 8) * Math.PI) * 0.06 : 0;
    const c = classroom(t, { warm: 0.55, board, phoneOnDesk: true, you: { pose: sitBase({ head: [-0.12, 0, 0], armL: [-1.2, 0], lift: hop }), expr: t >= fr ? 'happy' : 'neutral' }, teacher: teacherAtBoard(t, 1, 0.55) });
    const y0 = c.chars[0];
    c.chars[0] = { ...y0, pose: { ...y0.pose, armR: [y0.pose.armL![0], 0] } };
    if (hop > 0) c.checks = c.checks.filter((k) => !k.a.startsWith('you'));
    // shot A: your face looking up; shot B (on "fraction"): over your shoulder at the board
    const hc = headCenter(c);
    const cam: Cam = t < fr ? { pos: [hc[0] + 0.3, hc[1] - 0.1, hc[2] + 1.9 - lt * 0.06], look: [hc[0], hc[1] + 0.02, hc[2]], fov: 40 } : { pos: lerp3([0.35, 1.2, -1.0], [0.3, 1.15, -0.75], ease((t - fr) / 5)), look: [-0.15, 1.25, 3.6], fov: 40 };
    return { cam, warm: 0.55, blur: t < fr ? 8 : 3, bg: '#e2b07d', ...rebuild(c, t) };
  },
  esc2(t, lt, s) {
    const cry = onBeat(ev(12, 'never')), door = line(13).start;
    const raise = ease((t - s.start) / 0.3);
    const youPose = sitBase({ head: [-0.15, 0, 0], armL: [-1.2, 0], armR: [-1.2, 0] });
    const teacher: Char = t < cry ? teacherAtBoard(t, 1, 0.75) : { id: 'teacher', look: LOOKS.teacher, pos: [0.7, 0, 2.6], rotY: Math.PI, pose: { mode: 'stand', armR: [-0.4, 0], armL: [-0.9, 0.5], head: [0.05, 0, 0.1 * Math.sin(t * 3)] }, expr: 'cry', blush: true, gaze: [0, 1.2, 0], hold: { item: 'chalk' } };
    if (t < cry) { teacher.pose = { ...teacher.pose, head: [0, 0.9 * ease((t - s.start - 0.4) / 0.25), 0] }; teacher.gaze = [0, 1.2, 0]; teacher.expr = 'shock'; }
    const c = classroom(t, { warm: 0.75, board: 'threeq', phoneOnDesk: true, you: { pose: youPose, expr: 'happy' }, teacher });
    const extras: Char[] = [];
    if (t >= door) {
      const pk = ease((t - door) / 0.3);
      extras.push({ id: 't2', look: LOOKS.t2, pos: [2.85, 0, 1.95], rotY: -Math.PI / 2, pose: { mode: 'stand', lean: 0.25 * pk, armL: [-0.2, 0], armR: [-0.2, 0] }, expr: 'shock', gaze: [0, 1.2, 0] });
      extras.push({ id: 't3', look: LOOKS.t3, pos: [2.7, 0, 2.62], rotY: -Math.PI / 2, pose: { mode: 'stand', lean: 0.18 * pk, armL: [-0.2, 0], armR: [-0.2, 0] }, expr: 'joy', gaze: [0, 1.2, 0] });
    }
    c.chars.push(...extras);
    // hand goes up from where it rests on the desk (no sweep through the desk)
    const y0 = c.chars[0];
    c.chars[0] = { ...y0, pose: { ...y0.pose, armR: [lerp(y0.pose.armL![0], -3.05, raise), -0.05] } };
    let cam: Cam;
    if (t < cry) cam = { pos: lerp3([1.6, 1.0, 2.2], [1.3, 1.0, 1.9], lt / 2), look: [0, 1.0, 0.3], fov: 34 };
    else if (t < door) { const tc = [0.7, 1.15, 2.6]; cam = { pos: [tc[0] - 0.2, tc[1] + 0.05, tc[2] - 1.5 + (t - cry) * 0.05], look: [tc[0], tc[1], tc[2]], fov: 40 }; }
    else cam = { pos: [0.6, 1.3, 0.2], look: [3.1, 1.1, 2.1], fov: 30 };
    return { cam, warm: 0.75, blur: t >= cry && t < door ? 7 : 3, bg: '#f0bd84', ...rebuild(c, t) };
  },
  esc3(t, lt, s) {
    const cheer = line(15).start, birds = line(16).start, why = line(17).start;
    const shot = t < cheer ? 'test' : t < birds ? 'cheer' : t < why ? 'birds' : 'why';
    const youPaper: Partial<Char> & { pose: Pose } = { pose: sitBase({ head: [0.3, 0, 0], armL: [-1.2, 0] }), hold: { item: 'paper' }, expr: 'joy' };
    const youStand: Partial<Char> & { pose: Pose } = { pos: [0.62, 0, 0.3], pose: { mode: 'stand', armL: [-2.9, -0.3], armR: [-2.9, 0.3] }, expr: 'joy' };
    const c = classroom(t, {
      warm: 1, board: 'star', kids: shot === 'test' ? 'sit' : 'cheer', you: shot === 'why' ? { pose: sitBase({ head: [0, 0, 0], armL: [-1.2, 0], armR: [-1.2, 0] }), expr: 'neutral' } : shot === 'test' ? youPaper : youStand,
      phoneOnDesk: true, youFg: shot === 'test' || shot === 'why',
      teacher: { id: 'teacher', look: LOOKS.teacher, pos: [0.9, 0, 2.6], rotY: Math.PI, pose: { mode: 'stand', armL: [-2.9, -0.3], armR: [-2.9, 0.3] }, expr: 'joy', blush: true, gaze: [0, 1.2, 0], hold: { item: 'chalk' } },
      extra: (b) => {
        // flowers bloom on the sill; pots sit on the sill top
        const bloom = easeOut((t - birds) / 0.6);
        for (let i = 0; i < 6; i++) {
          const z = -1.9 + i * 0.75 + (i > 2 ? 0.3 : 0), x = -3.05;
          b.part(null, `pot${i}`, 'box', [0.12, 0.12, 0.12], [x, 0.95 + 0.06, z], '#c0583a');
          if (bloom > 0) b.part(null, `flower${i}`, 'sphere', [0.16 * bloom, 0.16 * bloom, 0.16 * bloom], [x, 1.07 + 0.12 * bloom, z], ['#ff5d8f', '#ffd60a', '#ff9f1c'][i % 3], { solid: false });
        }
        // the school outside cheers (only visible through the window)
        for (let i = 0; i < 14; i++) void i;
        if (t >= birds) for (let i = 0; i < 9; i++) {
          const a = (t - birds) * 1.6 + (i / 9) * Math.PI * 2, r = 1.1 + 0.3 * Math.sin(i);
          const enter = easeOut((t - birds - i * 0.06) / 1.0);
          const p: V3 = [lerp(-6, Math.cos(a) * r - 0.4, enter), lerp(2.6, 2.2 + 0.15 * Math.sin(a * 2 + i), enter), lerp(-0.5, Math.sin(a) * r + 0.6, enter)];
          bird(b, `bird${i}`, p, -a, t, i);
        }
      },
    });
    // outdoor crowd (seeded jumpers)
    if (shot !== 'test') for (let i = 0; i < 12; i++) {
      const per = 0.8 + rnd(i) * 0.3, f = ((t + rnd(i + 9)) % per) / per;
      const pose: Pose = f < 0.2 ? { mode: 'stand', crouch: Math.sin((f / 0.2) * Math.PI) * 0.5, armL: [-2.9, 0], armR: [-2.9, 0] } : f < 0.8 ? { mode: 'air', lift: 4 * ((f - 0.2) / 0.6) * (1 - (f - 0.2) / 0.6) * 0.4, armL: [-3, 0], armR: [-3, 0] } : { mode: 'stand', crouch: Math.sin(((f - 0.8) / 0.2) * Math.PI) * 0.3, armL: [-2.8, 0], armR: [-2.8, 0] };
      c.chars.push({ id: `crowd${i}`, look: { ...LOOKS.kids[i % 5], top: ['#e85d75', '#f2b134', '#5b7cfa', '#9b5de5', '#00a6a6', '#ff7b54'][i % 6] }, pos: [-4.8 - (i % 4) * 0.9, 0, -2.6 + Math.floor(i / 4) * 1.6 + rnd(i) * 0.6], rotY: Math.PI / 2, pose, expr: 'joy', gaze: [-3.2, 1.6, 0] });
    }
    // bird lands on your head for "nobody knows why"
    const extra: Part[] = [];
    let cam: Cam;
    if (shot === 'test') {
      const paper = c.parts.find((p) => p.id === 'paperFace');
      const youParts = buildChar(c.chars[0], t).parts, pf = youParts.find((p) => p.id === 'paperFace')!;
      void paper;
      const pc = center(pf.m), M = new THREE.Matrix4().fromArray(pf.m), n = new THREE.Vector3().setFromMatrixColumn(M, 2).normalize();
      const d = 0.62 - easeOut((t - s.start) / 0.2) * 0.12;
      cam = { pos: [pc[0] + n.x * d - 0.1, pc[1] + n.y * d, pc[2] + n.z * d], look: pc, fov: 34 };
    } else if (shot === 'cheer') cam = { pos: lerp3([2.4, 1.6, 2.9], [2.1, 1.5, 2.6], (t - cheer) / 2), look: [-0.8, 0.9, -0.3], fov: 42 };
    else if (shot === 'birds') cam = { pos: [1.6, 1.2, 2.6], look: [-0.9, 1.6, 0.2], fov: 44 };
    else {
      const hc = headCenter(c);
      const ht = new THREE.Matrix4().fromArray(cp(c.chars[0], 'hairTop', t).m), q = new THREE.Quaternion(), pos = new THREE.Vector3(), sc = new THREE.Vector3();
      ht.decompose(pos, q, sc);
      pos.add(new THREE.Vector3(0, sc.y / 2 + 0.045, 0).applyQuaternion(q));
      const b = new Builder('perch');
      const land = easeOut((t - why) / 0.3);
      b.root.position.copy(pos);
      b.root.quaternion.copy(q);
      bird(b, 'perch', [0, (1 - land) * 0.6, 0], 0.6, land < 1 ? t : 0, 0, '#7ec8e3');
      extra.push(...b.done());
      if (land >= 1) c.checks.push({ kind: 'rest', a: 'perch_body', b: 'you:hairTop' });
      cam = { pos: [hc[0] + 0.25, hc[1] + 0.12, hc[2] + 1.9 - (t - why) * 0.08], look: [hc[0], hc[1] + 0.05, hc[2]], fov: 40 };
    }
    const r = rebuild(c, t);
    return { cam, warm: 1, blur: shot === 'test' ? 8 : shot === 'why' ? 9 : 2, bg: '#ffc98a', ...r, parts: [...r.parts, ...extra] };
  },
  peak(t, lt, s) {
    const b = new Builder('heaven');
    const asc = line(21).start;
    // cloud floor + puffs (seeded)
    for (let i = 0; i < 26; i++) {
      const a = rnd(i) * Math.PI * 2, r = 3.8 + rnd(i + 40) * 6, sz = 1.4 + rnd(i + 80) * 2.4;
      b.part(null, `cloud${i}`, 'sphere', [sz * 1.6, sz, sz * 1.3], [Math.cos(a) * r, -2.6 + rnd(i + 7) * 1.4 + (i % 3) * 0.4, Math.sin(a) * r - 2], i % 2 ? '#ffd9b0' : '#ffe9cf', { solid: false });
    }
    for (let i = 0; i < 7; i++) b.part(null, `ray${i}`, 'cone', [1.2, 14, 1.2], [-3 + i, 6, -3 - (i % 3)], '#fff4c2', { opacity: 0.14, solid: false, add: true }, [0, 0, (i - 3) * 0.06]);
    b.part(null, 'sun', 'sphere', [3, 3, 3], [0, 9, -10], '#fff1b8', { emissive: 2, solid: false });
    const rise = ease((t - s.start) / (s.end - s.start)) * 1.6 + ease((t - asc) / 3) * 1.8;
    const y = rise, sway = Math.sin(t * 1.6) * 0.05;
    const you: Char = { id: 'you', look: LOOKS.you, pos: [0, 0, 0], rotY: Math.sin(t * 0.9) * 0.15, pose: { mode: 'fly', lift: y, armL: [-2.75, -0.25], armR: [-2.75, 0.25], head: [-0.25, 0, 0], sway }, expr: 'joy', gaze: [0, 9, -10], halo: true, fg: true };
    const hc: V3 = [0, y + 1.1, 0];
    for (let i = 0; i < 8; i++) { const a = t * 1.3 + (i / 8) * Math.PI * 2; bird(b, `hb${i}`, [Math.cos(a) * 1.3, hc[1] + 0.3 + Math.sin(a * 2) * 0.1, Math.sin(a) * 1.3], -a, t, i); }
    // floating knowledge: symbols pop in on "math" / "physics" and keep orbiting
    const mt = onBeat(ev(19, 'math')), pt = onBeat(ev(19, 'physics'));
    const syms = [['½', mt], ['π', mt], ['x²', mt], ['E=mc²', pt], ['F=ma', pt], ['∑', pt], ['A+', s.start]] as const;
    // crane: hold close, then pull way back on the beat after "ascend" to reveal the whole sky
    const pull = ease((t - onBeat(asc + 1.6, 0.4)) / 1.4);
    const cam: Cam = { pos: [0.9 - lt * 0.03 + pull * 0.6, hc[1] - 0.2 - (t > asc ? ease((t - asc) / 3) * 0.6 : 0) - pull * 1.2, 3.3 - lt * 0.05 + pull * 4.5], look: [0, hc[1] - 0.25 + pull * 0.3, 0], fov: 38 };
    const camV = new THREE.Vector3(...cam.pos);
    syms.forEach(([txt, at], i) => {
      const k = easeOut((t - at) / 0.25); if (k <= 0) return;
      const a = t * 0.4 + (i / syms.length) * Math.PI * 2;
      const o = b.node(null, [Math.cos(a) * 1.1, hc[1] + 0.5 + Math.sin(a * 1.5) * 0.4, Math.sin(a) * 0.9 - 0.3]);
      o.lookAt(camV);
      b.metas.push({ o, size: [0.5 * k, 0.5 * k, 1], p: { id: `sym${i}`, owner: 'heaven', kind: 'plane', color: '#fff', tex: `sym:${txt}`, solid: false, emissive: 1 } });
    });
    // the dog on its couch drifts past (it is still falling off)
    const dt = onBeat(ev(20, 'why'));
    if (t >= dt) {
      const k = (t - dt) / 3;
      const cp = b.node(null, [lerp(-2.6, 2.4, k), hc[1] - 0.9 + Math.sin(k * 6) * 0.1, -0.9], [0, 0.5, 0.15]);
      b.part(cp, 'couchSeat', 'box', [0.9, 0.18, 0.4], [0, 0, 0], '#a0522d', { solid: false });
      b.part(cp, 'couchBack', 'box', [0.9, 0.3, 0.1], [0, 0.22, -0.16], '#8b4513', { solid: false });
      const dog = b.node(cp, [0.15 + k * 0.4, 0.25 - k * 0.2, 0.05], [0, 0, -k * 4]);
      b.part(dog, 'dogBody', 'box', [0.3, 0.14, 0.14], [0, 0, 0], '#f5deb3', { solid: false });
      b.part(dog, 'dogHead', 'box', [0.13, 0.13, 0.13], [0.18, 0.06, 0], '#f5deb3', { solid: false });
      b.part(dog, 'dogEar', 'box', [0.05, 0.08, 0.13], [0.15, 0.13, 0], '#8b5a2b', { solid: false });
    }
    return { cam, warm: 1, blur: 4, bg: '#ffcf9e', heaven: true, parts: [...b.done(), ...buildChar(you, t).parts], chars: [you], checks: [] };
  },
  twist(t, lt, s) {
    const notif = onBeat(line(23).start - 1.2, 0.5);
    const mode = t >= notif ? 'notif' : 'reel';
    const th: Thumb = t >= notif ? { u: lerp(REST.u, 0, ease((t - notif) / 0.6)), v: lerp(REST.v, 0.046, ease((t - notif) / 0.6)), lift: lerp(0, 0.012, ease((t - notif) / 0.3)) } : REST;
    const c = classroom(t, { warm: 0, board: 'sad', youFg: true, you: { pose: sitBase({ armL: [-1.2, 0] }), hold: { item: 'phone', screen: phoneTex({ mode, replays: 4, pressed: pressedBy(th), t: t - notif, warm: 0 }), thumb: th }, expr: t >= notif ? 'side' : 'neutral' } });
    c.chars[0] = { ...c.chars[0], gaze: t >= notif ? [0, 1.0, 3] : center(cp(c.chars[0], 'screen', t).m) };
    if (t >= notif) c.chars[0].gaze = [0.1, 1.0, 3];
    const hc = headCenter(c);
    // ends on the exact frame-1 framing so the loop is seamless
    const k = ease((t - (s.end - 1.2)) / 1.2);
    const z = lerp(1.6, 2.0, k);
    return { cam: { pos: [hc[0] + 0.05, hc[1] + 0.02, hc[2] + z], look: [hc[0], hc[1] - 0.12, hc[2]], fov: 40 }, warm: 0, blur: 9, bg: '#6f7884', ...rebuild(c, t) };
  },
};

const cp = (ch: Char, id: string, t: number) => buildChar(ch, t).parts.find((p) => p.id === id)!;
function headCenter(c: { chars: Char[] }): V3 {
  const h = buildChar(c.chars[0], 0).parts.find((p) => p.id === 'head')!;
  return center(h.m);
}
/** env parts + every character's parts */
function rebuild(c: { parts: Part[]; chars: Char[]; checks: Check[] }, t: number) {
  return { parts: [...c.parts, ...c.chars.flatMap((ch) => buildChar(ch, t).parts)], chars: c.chars, checks: c.checks };
}

export function world(t: number): World {
  const s = sceneAt(t);
  const w = SCENES[s.id](t, t - s.start, s);
  return { scene: s.id, t, ...w };
}
