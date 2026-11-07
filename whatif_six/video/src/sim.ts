// World simulation in REAL time T (seconds). Everything is precomputed and
// deterministic: the same frame always produces the same world.
import {clamp, rng, smooth} from './time';

export const G = 9.81;
export const MPH25 = 11.176; // 25 mph in m/s

// ---------------------------------------------------------------- layout --
// Avenue (7th Ave, one-way southbound = +z) spans x in [-8, 8].
// Cross street spans z in [-6, 6] (eastbound lane z=+3, westbound z=-3).
// North crosswalk (people crossing the avenue) spans z in [-10.25, -6.75].
export const AVE_HALF = 8;
export const ST_HALF = 6;
export const SIDEWALK = 6; // width
export const CW = {z0: -10.25, z1: -6.75};
export const LANES = [-5.25, -1.75, 1.75, 5.25];

// ------------------------------------------------------------- vehicles --
export const SHRINK_T = 0; // everyone turns 6
export const BACK_T = 5; // everyone turns back
export const AEB_T = 3.1; // SUV autobrake triggers
export const HIT_T = 4.25; // taxi rear-ends the SUV

type Motion = {t0: number; dt: number; x: Float64Array; v: Float64Array};
const T_MIN = -9, T_MAX = 30, DT = 1 / 600;

function simulate(v0: number, accel: (T: number, v: number) => number, impulses: [number, number][] = []): Motion {
  const n = Math.ceil((T_MAX - T_MIN) / DT) + 1;
  const x = new Float64Array(n), v = new Float64Array(n);
  let X = 0, V = v0;
  const i0 = Math.round(-T_MIN / DT);
  // integrate forward from T=0 and backward (constant speed before 0 unless accel says otherwise)
  for (let i = i0; i < n; i++) {
    const T = T_MIN + i * DT;
    for (const [ti, dv] of impulses) if (T <= ti && ti < T + DT) V = Math.max(0, V + dv);
    x[i] = X; v[i] = V;
    const a = accel(T, V);
    V = Math.max(0, V + a * DT);
    X += V * DT;
  }
  X = 0; V = v0;
  for (let i = i0 - 1; i >= 0; i--) {
    X -= V * DT;
    x[i] = X; v[i] = V;
  }
  return {t0: T_MIN, dt: DT, x, v};
}

export function sample(m: Motion, T: number) {
  const f = clamp((T - m.t0) / m.dt, 0, m.x.length - 1.001);
  const i = Math.floor(f), u = f - i;
  return {x: m.x[i] + (m.x[i + 1] - m.x[i]) * u, v: m.v[i] + (m.v[i + 1] - m.v[i]) * u};
}

// SUV: coasts (nobody on the pedals), autobrake at AEB_T, bumped at HIT_T, AEB holds.
const suvRaw = simulate(MPH25, (T, v) => {
  if (T < 0) return 0;
  if (T < AEB_T) return -0.3;
  if (T < HIT_T) return -7.5;
  return v > 0 ? -9 : 0;
}, [[HIT_T, 1.6]]);
// Old taxi: no autobrake, coasts into the SUV, nearly stops on impact.
const taxiRaw = simulate(9.0, (T, v) => {
  if (T < 0) return 0;
  if (T < HIT_T) return -0.3;
  return v > 0 ? -6 : 0;
}, [[HIT_T, -6.6]]);
// Bus on the cross street: coasts for 5 s; the adult driver brakes 0.4 s after the switch back.
const busRaw = simulate(MPH25, (T) => {
  if (T < 0) return 0;
  if (T < BACK_T + 0.4) return -0.35;
  return -3.0;
});
const coastCar = (v0: number) => simulate(v0, (T) => (T < 0 ? 0 : T < BACK_T + 0.5 ? -0.3 : -4));

export const SUV_LEN = 4.9, TAXI_LEN = 4.6, BUS_LEN = 12.2, CAR_LEN = 4.5;
export const SUV_STOP_FRONT = -11.6;
const suvEnd = sample(suvRaw, 20).x;
const suvOff = SUV_STOP_FRONT - suvEnd; // z of SUV front = raw + suvOff
const suvAtHit = sample(suvRaw, HIT_T).x + suvOff;
const taxiOff = suvAtHit - SUV_LEN - sample(taxiRaw, HIT_T).x;

export type Vehicle = {
  id: string;
  kind: 'suv' | 'taxi' | 'bus' | 'car' | 'truck';
  color: string;
  len: number;
  axis: 'x' | 'z';
  dir: 1 | -1;
  lane: number; // fixed coordinate on the other axis
  front: (T: number) => number; // front position along axis
  speed: (T: number) => number;
  aeb?: boolean;
};

function mk(id: string, kind: Vehicle['kind'], color: string, len: number, axis: 'x' | 'z', dir: 1 | -1, lane: number, m: Motion, off: number, extra: Partial<Vehicle> = {}): Vehicle {
  return {
    id, kind, color, len, axis, dir, lane,
    front: (T) => off + dir * sample(m, T).x,
    speed: (T) => sample(m, T).v,
    ...extra,
  };
}

const busOff = -40;
export const VEHICLES: Vehicle[] = [
  mk('suv', 'suv', '#2f4f7a', SUV_LEN, 'z', 1, -1.75, suvRaw, suvOff, {aeb: true}),
  mk('taxi', 'taxi', '#f2c230', TAXI_LEN, 'z', 1, -1.75, taxiRaw, taxiOff),
  mk('bus', 'bus', '#2d6fb8', BUS_LEN, 'x', 1, 3.0, busRaw, busOff),
  mk('c1', 'car', '#c8ccd2', CAR_LEN, 'x', 1, 3.0, coastCar(MPH25), -20),
  mk('c2', 'taxi', '#f2c230', TAXI_LEN, 'x', -1, -3.0, coastCar(MPH25), 26),
  mk('c3', 'car', '#8e2b2b', CAR_LEN, 'x', -1, -3.0, coastCar(MPH25), 92),
  mk('c4', 'car', '#3b3f45', CAR_LEN, 'z', 1, 1.75, coastCar(MPH25), 24),
  mk('c5', 'taxi', '#f2c230', TAXI_LEN, 'z', 1, 5.25, coastCar(MPH25), 40),
  mk('c6', 'car', '#e6e6e6', CAR_LEN, 'z', 1, 1.75, coastCar(4.5), -78),
  mk('c7', 'taxi', '#f2c230', TAXI_LEN, 'z', 1, 5.25, coastCar(4.0), -86),
  mk('c8', 'car', '#556b4a', CAR_LEN, 'x', 1, 3.0, coastCar(MPH25), -75),
  mk('truck', 'truck', '#d9d4c7', 7.5, 'z', 1, -5.25, simulate(0, () => 0), -30),
];
export const vehicle = (id: string) => VEHICLES.find((v) => v.id === id)!;

// position of a vehicle's centre and its heading angle (around y)
export function vehiclePose(v: Vehicle, T: number) {
  const f = v.front(T);
  const c = f - (v.dir * v.len) / 2;
  const pos: [number, number, number] = v.axis === 'z' ? [v.lane, 0, c] : [c, 0, v.lane];
  // model faces +z; rotate for direction
  const rotY = v.axis === 'z' ? (v.dir === 1 ? 0 : Math.PI) : v.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
  return {pos, rotY, front: f};
}

// ------------------------------------------------------------- people ----
export type Person = {
  id: number;
  // walking line
  px: number; pz: number; // position at T=0
  dx: number; dz: number; // unit direction
  speed: number; // adult walking speed m/s (0 = standing)
  height: number; // adult height (m)
  kidHeight: number; // height at age 6
  male: boolean;
  shirt: string; pants: string; skin: string; hair: string; shoe: string;
  item: null | 'cup' | 'bag' | 'phone';
  dropT: number;
  phase: number;
  facing: number; // for standing people
};

const SKINS = ['#f1c7a5', '#e0ac85', '#c68863', '#a0694a', '#7a4b33', '#f5d6bf'];
const HAIRS = ['#2b2018', '#4a3020', '#1a1a1a', '#7a5a3a', '#b08850', '#5a5a5a'];
const SHIRTS = ['#e8e8e8', '#2e3a4f', '#b03a3a', '#3a6ea5', '#f0c75e', '#4f7d5a', '#7a4f8f', '#f28c50', '#222222', '#9fb8c8', '#d96c8a', '#ffffff'];
const PANTS = ['#2a3348', '#1e1e1e', '#4a4a52', '#6b5a45', '#33475b', '#c9b99a'];
const SHOES = ['#f2f2f2', '#1a1a1a', '#6b4a2f', '#c43c3c'];

function makePeople(): Person[] {
  const r = rng(6);
  const pick = <X,>(a: X[]) => a[Math.floor(r() * a.length)];
  const out: Person[] = [];
  const add = (px: number, pz: number, dx: number, dz: number, speed: number, facing = 0) => {
    const male = r() < 0.5;
    const height = male ? 1.75 + (r() - 0.5) * 0.14 : 1.61 + (r() - 0.5) * 0.12;
    const kidHeight = 1.155 + (r() - 0.5) * 0.09;
    const it = r();
    out.push({
      id: out.length, px, pz, dx, dz, speed, height, kidHeight, male,
      shirt: pick(SHIRTS), pants: pick(PANTS), skin: pick(SKINS), hair: pick(HAIRS), shoe: pick(SHOES),
      item: it < 0.16 ? 'cup' : it < 0.3 ? 'bag' : it < 0.4 ? 'phone' : null,
      dropT: 0.22 + r() * 0.5,
      phase: r() * Math.PI * 2,
      facing,
    });
  };
  // a) crossing the avenue on the north crosswalk (walk signal), dense near the camera
  for (let i = 0; i < 30; i++) {
    const dir = i % 2 === 0 ? 1 : -1;
    add(-7 + r() * 14, CW.z0 + 0.45 + r() * 2.6, dir, 0, 1.2 + r() * 0.3);
  }
  // b) avenue sidewalks (x in ±[8.6,13.4]) on the north and south blocks
  const seg = (lo: number, hi: number, dir: number, sp: number) => {
    // keep the walker inside [lo,hi] for T in [-8, 1]
    const a = dir > 0 ? lo + 8 * sp + 0.5 : lo + 0.5 + 1.2;
    const b = dir > 0 ? hi - 1.2 : hi - 8 * sp - 0.5;
    return a + r() * Math.max(0.1, b - a);
  };
  for (let i = 0; i < 70; i++) {
    const east = r() < 0.5;
    const north = r() < 0.6;
    const dir = r() < 0.5 ? 1 : -1;
    const sp = 1.2 + r() * 0.3;
    const x = (east ? 1 : -1) * (8.7 + r() * 4.6);
    const z = north ? seg(-90, -11, dir, sp) : seg(11, 70, dir, sp);
    add(x, z, 0, dir, sp);
  }
  // c) cross-street sidewalks
  for (let i = 0; i < 40; i++) {
    const south = r() < 0.5;
    const east = r() < 0.5;
    const dir = r() < 0.5 ? 1 : -1;
    const sp = 1.2 + r() * 0.3;
    const z = (south ? 1 : -1) * (6.7 + r() * 4.6);
    const x = east ? seg(14.5, 90, dir, sp) : seg(-90, -14.5, dir, sp);
    add(x, z, dir, 0, sp);
  }
  // d) waiting at the corners to cross the cross street (don't-walk)
  const corners: [number, number, number][] = [[10.5, -7.6, Math.PI], [-10.5, -7.6, Math.PI], [10.5, 7.6, 0], [-10.5, 7.6, 0]];
  for (const [cx, cz, f] of corners)
    for (let i = 0; i < 6; i++) add(cx + (r() - 0.5) * 3.5, cz + Math.sign(cz) * r() * 2.2, 0, 0, 0, f + (r() - 0.5) * 0.6);
  return out;
}
export const PEOPLE = makePeople();

// --- per-person state at real time T
export const shrinkAmount = (T: number) => smooth(T / 0.15) * (1 - smooth((T - BACK_T) / 0.08));
export const PANTS_DROP_T = 0.12;
export const SHOE_OFF_T = 0.1;
const STOP_END = 0.8;

// distance walked since T=0 (negative before)
export function walked(p: Person, T: number) {
  const v = p.speed;
  if (T <= PANTS_DROP_T) return v * T;
  const d0 = v * PANTS_DROP_T;
  const tt = Math.min(T, STOP_END) - PANTS_DROP_T;
  const L = STOP_END - PANTS_DROP_T;
  return d0 + v * (tt - (tt * tt) / (2 * L)); // linear slow-down to a stop
}
export function speedNow(p: Person, T: number) {
  if (T <= PANTS_DROP_T) return p.speed;
  return p.speed * clamp(1 - (T - PANTS_DROP_T) / (STOP_END - PANTS_DROP_T));
}
export function personPos(p: Person, T: number): [number, number] {
  const d = walked(p, T);
  return [p.px + p.dx * d, p.pz + p.dz * d];
}
