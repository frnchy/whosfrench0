// Deterministic bake: gallery layout + per-frame camera for all 8 recaps, keyed to the VO timeline.
// Run: node --experimental-strip-types sim/bake.ts   (writes sim/cache/sim.json and src/sim.json)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const tl = JSON.parse(readFileSync(new URL("../src/timeline.json", import.meta.url), "utf8"));
const FPS = tl.fps;

// ---------- gallery layout (units ≈ metres): a rotunda, 8 panels on a ring facing its centre ----------
export const G = {
  ringR: 6.5,
  panelH: 3.2, panelW: 3.2 * 752 / 1344,          // stills are 752×1344
  plinthH: 0.75, plinthD: 0.5, frame: 0.07,
  closeFov: 42, wideFov: 55, dNear: 5.0, dFar: 5.6, dWide: 12,
};
export const panels = Array.from({ length: 8 }, (_, i) => {
  const th = (i * Math.PI) / 4;                                 // clockwise around the ring, panel 1 straight ahead (−z)
  const normal = [-Math.sin(th), 0, Math.cos(th)];              // faces the centre of the rotunda
  const centre = [G.ringR * Math.sin(th), G.plinthH + G.panelH / 2, -G.ringR * Math.cos(th)];
  return { i, th, normal, centre, yaw: Math.atan2(normal[0], normal[2]) };
});
// wide: from across the rotunda, looking at panel 1 (frame 0 and the last frames → loop)
const WIDE = { pos: [0, 3.3, -G.ringR + G.dWide], target: [0, 2.0, -G.ringR], fov: G.wideFov };

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerp3 = (a: number[], b: number[], k: number) => a.map((v, i) => lerp(v, b[i], k));
const close = (p: (typeof panels)[number], d: number) => ({ pos: p.centre.map((c, j) => c + p.normal[j] * d + (j === 1 ? 0.08 : 0)), target: p.centre, fov: G.closeFov });

type Pose = { pos: number[]; target: number[]; fov: number };
type Key = { t: number; pose: Pose };
const path = (keys: Key[], t: number): Pose => {
  let i = 0; while (i < keys.length - 2 && t > keys[i + 1].t) i++;
  const a = keys[i], b = keys[i + 1], k = ease((t - a.t) / (b.t - a.t));
  return { pos: lerp3(a.pose.pos, b.pose.pos, k), target: lerp3(a.pose.target, b.pose.target, k), fov: lerp(a.pose.fov, b.pose.fov, k) };
};

const out = { fps: FPS, layout: { ...G, panels, wide: WIDE }, episodes: [] as unknown[] };
for (const ep of tl.episodes) {
  const L = ep.lines, N = ep.frames, T = N / FPS;
  // hold window per panel: panel k is framed for the core of line k (line 1 = the push-in toward panel 1);
  // panel 8 stays up through the closing question, then the camera returns to the wide pose
  const first = L.map((l: { words: { start: number }[] }) => l.words[0].start), last = L.map((l: { words: { end: number }[] }) => l.words[l.words.length - 1].end);
  const arrive: number[] = [], leave: number[] = [];
  L.forEach((_: unknown, k: number) => {
    if (k === 0) { arrive.push(Math.max(1.5, last[0])); leave.push(arrive[0] + 0.15); return; }
    arrive.push(Math.max(first[k] + 0.35, leave[k - 1] + 0.7))   // ≥0.7 s pan between neighbours;
    leave.push(k < 7 ? Math.max(arrive[k] + 0.5, last[k] - 0.35) : ep.questionAt + 1.2);
  });
  const keys: Key[] = [{ t: 0, pose: WIDE }, { t: 0.25, pose: WIDE }];
  panels.forEach((p, k) => { keys.push({ t: arrive[k], pose: close(p, G.dFar) }, { t: leave[k], pose: close(p, G.dNear) }); });
  keys.push({ t: T - 0.45, pose: WIDE }, { t: T + 1, pose: WIDE });   // last frames hold frame 0's pose → clean loop
  const frames = [];
  for (let f = 0; f < N; f++) {
    const t = f / FPS, cam = path(keys, t);
    // which panel is lit: 1 inside its hold window, fading across transitions; all at 0.55 in the wide shots
    const light = panels.map((_, k) => {
      const inK = ease((t - (arrive[k] - 0.5)) / 0.5) * (1 - ease((t - leave[k]) / 0.5));
      return +(0.5 + 0.5 * inK).toFixed(4);
    });
    frames.push({ f, cam: { pos: cam.pos.map((v) => +v.toFixed(4)), target: cam.target.map((v) => +v.toFixed(4)), fov: +cam.fov.toFixed(3) }, light });
  }
  out.episodes.push({ n: ep.n, frames: N, arrive, leave, frame: frames });
}
mkdirSync(new URL("cache/", import.meta.url), { recursive: true });
writeFileSync(new URL("cache/sim.json", import.meta.url), JSON.stringify(out));
writeFileSync(new URL("../src/sim.json", import.meta.url), JSON.stringify(out));
console.log(`baked ${tl.episodes.map((e: { frames: number }) => e.frames).join(", ")} frames`);
