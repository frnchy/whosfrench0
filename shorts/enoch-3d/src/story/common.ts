// Pure animation maths shared by the renderer and the validator (no React, no three.js).
export type V3 = [number, number, number];
export type Arm = [number, number, number]; // shoulder pitch (forward raise), shoulder roll (outward), elbow bend — radians
export type Pose = {
  lArm: Arm; rArm: Arm; head: [number, number]; lean: number; wings: number;
  mouth: number; blink: number; brow: number;   // brow: −1 angry … 0 neutral … +1 worried
  gaze: [number, number];                       // eye yaw/pitch inside the head
};
export type Kind = "shem" | "azazel" | "ange" | "watcher" | "woman" | "villager" | "kasdeja" | "smith" | "max" | "giant" | "raphael";
export type Char = { id: string; kind: Kind; pos: V3; yaw: number; pose: Pose; prop?: string };
export type Cam = { pos: V3; target: V3; fov: number };
export type SetName = "heaven" | "mountain" | "village" | "forge" | "city";
export type Fx = {
  streaks: number; lightning: number; shock: number; pillar: number; flash: number; crowdRaise: number; crowdLook: number;
  crowd: number; feathers: number; mountainGlow: number; sparks: number; forgeGlow: number;
  constellation: number; cries: number; fight: number; pillars?: number; storeLights?: number;
};
export type Frame = { t: number; shot: string; set: SetName; cam: Cam; chars: Char[]; fx: Fx };

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const ease = (x: number) => { const k = clamp01(x); return k * k * (3 - 2 * k); };
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const lerp3 = (a: number[], b: number[], k: number) => a.map((v, i) => lerp(v, b[i], k)) as V3;
export const ramp = (t: number, a: number, b: number) => ease((t - a) / (b - a));

export const NEUTRAL: Pose = { lArm: [0.05, 0.12, 0.25], rArm: [0.05, 0.12, 0.25], head: [0, 0], lean: 0, wings: 0.12, mouth: 0, blink: 0, brow: 0, gaze: [0, 0] };

// keyframed partial poses, eased between keys; values not given stay at the base pose
export type PoseKey = [number, Partial<Pose>];
export const posePath = (t: number, base: Pose, keys: PoseKey[]): Pose => {
  if (!keys.length) return base;
  const full = (p: Partial<Pose>): Pose => ({ ...base, ...p });
  let i = 0; while (i < keys.length - 1 && t > keys[i + 1][0]) i++;
  const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
  if (t <= a[0] || a === b) return full(a[1]);
  const k = ease((t - a[0]) / (b[0] - a[0])), A = full(a[1]), B = full(b[1]);
  const mix = (x: number[], y: number[]) => x.map((v, j) => lerp(v, y[j], k));
  return {
    lArm: mix(A.lArm, B.lArm) as Arm, rArm: mix(A.rArm, B.rArm) as Arm, head: mix(A.head, B.head) as [number, number],
    lean: lerp(A.lean, B.lean, k), wings: lerp(A.wings, B.wings, k), mouth: 0, blink: 0, brow: lerp(A.brow, B.brow, k), gaze: mix(A.gaze, B.gaze) as [number, number],
  };
};

// blinks: 5-frame closure, deterministic per character, never closer than 2.4 s
const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967295; };
export const BLINK_FRAMES = 5;
export const blinkAt = (id: string, f: number) => {
  const period = 84 + Math.round(hash(id) * 40), off = Math.round(hash(id + "o") * period);
  const ph = (f + off) % period;
  return ph < BLINK_FRAMES ? Math.sin((ph + 0.5) / BLINK_FRAMES * Math.PI) : 0;
};
// idle life: breathing sway, tiny head drift (pure function of time)
export const idle = (id: string, t: number, p: Pose): Pose => {
  const h = hash(id) * 6.28;
  return { ...p, lean: p.lean + Math.sin(t * 1.3 + h) * 0.012, head: [p.head[0] + Math.sin(t * 0.7 + h) * 0.03, p.head[1] + Math.sin(t * 0.9 + h * 2) * 0.02] };
};

// camera path: eased keys inside a shot; optional handheld shake (deterministic)
export type CamKey = [number, Cam];
export const camPath = (t: number, keys: CamKey[], shake = 0): Cam => {
  let i = 0; while (i < keys.length - 1 && t > keys[i + 1][0]) i++;
  const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
  const k = a === b || t <= a[0] ? 0 : ease((t - a[0]) / (b[0] - a[0]));
  const s = shake ? [Math.sin(t * 7.1) * 0.6 + Math.sin(t * 13.3) * 0.4, Math.sin(t * 8.7 + 1) * 0.6 + Math.sin(t * 11.9) * 0.4, 0] : [0, 0, 0];
  const target = lerp3(a[1].target, b[1].target, k).map((v, j) => v + s[j] * shake) as V3;
  return { pos: lerp3(a[1].pos, b[1].pos, k), target, fov: lerp(a[1].fov, b[1].fov, k) };
};

// ---------- ground heights (shared with the validator's contact checks) ----------
const n2 = (x: number, z: number) => {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const r = (a: number, b: number) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return lerp(lerp(r(xi, zi), r(xi + 1, zi), u), lerp(r(xi, zi + 1), r(xi + 1, zi + 1), u), v);
};
export const SUMMIT_Y = 48;
// Mount Hermon: a broad ridged massif, flattened summit plateau (r < 9) for the oath circle
export const hermonHeight = (x: number, z: number) => {
  const r = Math.hypot(x, z);
  let ridge = 0, amp = 1, f = 0.018;
  for (let o = 0; o < 4; o++) { ridge += (1 - Math.abs(n2(x * f + 3.1, z * f + 7.7) * 2 - 1)) * amp; amp *= 0.5; f *= 2.1; }
  const mass = SUMMIT_Y * Math.exp(-(r * r) / (2 * 40 * 40)) + ridge * 7 - 7;
  const plateau = clamp01((r - 9) / 8);
  return lerp(SUMMIT_Y, mass, ease(plateau));
};
export const groundAt = (set: SetName, x: number, z: number) => (set === "mountain" ? hermonHeight(x, z) : 0);
