// Deterministic bake: every value the renderer draws, per frame, from real constants + the VO timeline.
// Run: node --experimental-strip-types sim/bake.ts   (writes sim/cache/sim.json and src/sim.json)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

export const C = {
  tropicalYear: 365.24219,      // days, mean tropical year (Astronomical Almanac / Meeus & Savoie 1992)
  enochYear: 364,               // days, 1 Enoch 72:32, 74:12, 82:6
  au: 149_597_870.7,            // km, IAU 2012 Resolution B2
  moonDist: 384_400,            // km, NASA mean Earth–Moon distance
  earthRadius: 6_371,           // km, NASA Earth fact sheet (volumetric mean)
  moonRadius: 1_737.4,          // km, NASA Moon fact sheet
  tilt: 23.44,                  // deg, NASA Earth fact sheet obliquity
  tsi: 1360.8,                  // W/m², Kopp & Lean 2011
  albedo: 0.306,                // NASA Earth fact sheet Bond albedo
  humanErf: 2.72,               // W/m², IPCC AR6 total anthropogenic ERF 1750–2019
};
const ratio = (C.enochYear / C.tropicalYear) ** (2 / 3);       // Kepler III: a ∝ T^(2/3)
export const D = {
  driftPerYear: C.tropicalYear - C.enochYear,                  // days the calendar runs ahead each year
  shiftKm: C.au * (1 - ratio),
  fluxGain: ratio ** -2 - 1,                                   // inverse-square law
  get dS() { return C.tsi * this.fluxGain; },
  get dF() { return (C.tsi * this.fluxGain * (1 - C.albedo)) / 4; },
  get yearsToSwap() { return C.tropicalYear / 2 / this.driftPerYear; },
};

const tl = JSON.parse(readFileSync(new URL("../plan/timeline.json", import.meta.url), "utf8"));
const E: Record<string, number> = tl.events;
const FPS = tl.fps, N = Math.round(tl.duration * FPS);

// scene layout (scene units)
export const WIDE = { orbitR: 9, sunR: 1.6, earthR: 0.8 };   // not to scale (labelled on screen)
const KM = 1 / C.earthRadius;   // LOCAL scene: distances true to scale (1 unit = one Earth radius); bodies drawn ×8
const earthLocalR = 8, moonLocalR = C.moonRadius / C.earthRadius * 8;

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const ramp = (t: number, a: number, b: number) => ease((t - a) / (b - a));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerp3 = (a: number[], b: number[], k: number) => a.map((v, i) => lerp(v, b[i], k));
type Key = { t: number; pos: number[]; target: number[]; up?: number[] };
const camPath = (keys: Key[], t: number) => {
  let i = 0; while (i < keys.length - 1 && t > keys[i + 1].t) i++;
  const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
  const k = a === b ? 0 : ramp(t, a.t, b.t);
  return { pos: lerp3(a.pos, b.pos, k), target: lerp3(a.target, b.target, k), up: lerp3(a.up ?? [0, 1, 0], b.up ?? [0, 1, 0], k) };
};

const theta0 = -Math.PI * 0.35;
const earthAngle = (f: number) => theta0 + (2 * Math.PI * f) / N;   // exactly one turn → last frame loops to first
const earthPos = (f: number) => [Math.cos(earthAngle(f)) * WIDE.orbitR, 0, Math.sin(earthAngle(f)) * WIDE.orbitR];

const scene = (t: number) => (t >= E.line7 && t < E.line9 ? "local" : "wide");

const frames = [];
for (let f = 0; f < N; f++) {
  const t = f / FPS;
  const ep = earthPos(f);
  const years = t < E.ten - 0.4 ? 0 : t < E.y147 ? 10 * ramp(t, E.ten - 0.4, E.twelve + 0.3) : lerp(10, 147, ramp(t, E.y147, E.winter));
  const driftDays = years * D.driftPerYear;
  const shift = t < E.line9 ? ramp(t, E.closer - 0.3, E.km + 1.2) * D.shiftKm : 0;   // km toward the Sun (local scene only)
  const sunGain = 1 + D.fluxGain * ramp(t, E.half, E.half + 1.2) * (1 - ramp(t, E.fix, E.fix + 1.5));
  let cam;
  if (scene(t) === "wide") {
    const dir = ep.map((v) => v / WIDE.orbitR);
    const perp = [-dir[2], 0, dir[0]];
    // chase cam: Earth big in the foreground, Sun behind it; Earth-relative, so the loop closes with the orbit
    // three-quarter, sun-side camera: Earth's day side faces us (phase angle ~74°), Sun in the same shot
    // poses from sim/frame_solver.py: Sun upper-centre, half-lit Earth lower-centre (phase ≈130°: bright limb)
    const at = (d: number, p: number, y: number) => [dir[0] * d + perp[0] * p, y, dir[2] * d + perp[2] * p];
    const chase = { pos: at(14.5, 3, 6), target: at(6, 0, 1) };
    const sunShot = { pos: at(14.5, 3, 6), target: at(3, -1, -1) };
    cam = camPath([
      { t: 0, ...chase },
      { t: E.line4 - 0.6, ...chase },
      { t: E.line4 + 2.6, pos: [0, 46, 7], target: [0, 0, 0.6] },
      { t: E.line6, pos: [0, 46, 7], target: [0, 0, 0.6] },
      { t: E.line7 - 0.05, pos: [ep[0] * 1.32, 1.2, ep[2] * 1.32], target: ep },
      { t: E.line9, ...sunShot },
      { t: E.line11, pos: at(14, 1.5, 6), target: at(7.5, 0.5, 1.5) },
      { t: E.line12 + 0.6, ...chase },
      { t: tl.duration, ...chase },
    ], t);
  } else {
    cam = camPath([
      { t: E.line7, pos: [10, 5, 30], target: [0, 0, 0] },
      { t: E.closer - 1.6, pos: [6, 3, 24], target: [0, 0, 0] },
      { t: E.closer + 0.4, pos: [-8, 70, 8], target: [-8, 0, 0], up: [-0.7, 0, -0.7] },
      { t: E.km + 0.8, pos: [-30, 215, 0.01], target: [-30, 0, 0], up: [-1, 0, 0] },
      { t: E.line9, pos: [-30, 215, 0.01], target: [-30, 0, 0], up: [-1, 0, 0] },
    ], t);
  }
  frames.push({
    f, t: +t.toFixed(4), scene: scene(t), earth: ep.map((v) => +v.toFixed(5)), earthAngle: +earthAngle(f).toFixed(6),
    years: +years.toFixed(4), driftDays: +driftDays.toFixed(4),
    markerAngle: +(earthAngle(f) + (driftDays / C.tropicalYear) * 2 * Math.PI).toFixed(6),
    shiftKm: +shift.toFixed(1), earthX: +(-shift * KM).toFixed(5), sunGain: +sunGain.toFixed(6),
    cam: { pos: cam.pos.map((v: number) => +v.toFixed(4)), target: cam.target.map((v: number) => +v.toFixed(4)), up: cam.up.map((v: number) => +v.toFixed(4)) },
  });
}
const out = {
  fps: FPS, frames: N, constants: C,
  derived: { driftPerYear: D.driftPerYear, shiftKm: D.shiftKm, fluxGainPct: D.fluxGain * 100, dS: D.dS, dF: D.dF, pctOfHuman: (D.dF / C.humanErf) * 100, yearsToSwap: D.yearsToSwap, kmPerUnitLocal: 1 / KM },
  layout: { wide: WIDE, local: { earthR: earthLocalR, moonR: moonLocalR, moonOrbit: C.moonDist * KM, shift: D.shiftKm * KM, bodyScale: 8 } },
  cuts: [Math.round(E.line7 * FPS), Math.round(E.line9 * FPS)],
  frame: frames,
};
mkdirSync(new URL("cache/", import.meta.url), { recursive: true });
writeFileSync(new URL("cache/sim.json", import.meta.url), JSON.stringify(out));
writeFileSync(new URL("../src/sim.json", import.meta.url), JSON.stringify(out));
console.log(`baked ${N} frames`, out.derived);
