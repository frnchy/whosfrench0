// Validator: blocks the render unless every baked frame is physically consistent. Exit code 1 on any violation.
// Run: node --experimental-strip-types sim/validate.ts   (writes sim/validate-report.md)
import { readFileSync, writeFileSync } from "node:fs";

const sim = JSON.parse(readFileSync(new URL("cache/sim.json", import.meta.url), "utf8"));
const { constants: C, derived: D, layout: L, frame: F, cuts } = sim;
const v: { frame: number | string; what: string; fix: string }[] = [];
const fail = (frame: number | string, what: string, fix: string) => v.push({ frame, what, fix });
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// 1. Physics constants and claims spoken in the VO
const aNew = C.au - D.shiftKm;
const keplerOld = C.tropicalYear ** 2 / C.au ** 3, keplerNew = C.enochYear ** 2 / aNew ** 3;
if (!near(keplerNew / keplerOld, 1, 1e-9)) fail("global", "Kepler's 3rd law (T²/a³) not conserved for the new orbit", "recompute shift from (T'/T)^(2/3)");
if (!near(D.shiftKm, 339_000, 1_000)) fail("global", `VO says 339,000 km, physics gives ${D.shiftKm.toFixed(0)} km`, "fix VO line 8");
if (!(D.shiftKm < C.moonDist && D.shiftKm / C.moonDist > 0.85)) fail("global", "'almost the distance to the Moon' not true", "reword VO");
if (!near(D.driftPerYear * 10, 12, 0.5)) fail("global", "VO 'twelve days in ten years' off", "fix VO line 4");
if (!near(D.yearsToSwap, 147, 0.5)) fail("global", "VO '147 years' to swap seasons off", "fix VO line 5");
if (!near(D.fluxGainPct, 0.5, 0.06)) fail("global", "VO 'half a percent' sunlight off", "fix VO line 10");
if (!near(D.dF / C.humanErf, 0.40, 0.03)) fail("global", "VO 'about forty percent' off", "fix VO line 10");

// 2. Per-frame kinematics: no teleports except at the two planned cuts, bodies never overlap, camera never inside a body
const dt = 1 / sim.fps;
const vOrbit = (2 * Math.PI * L.wide.orbitR) / (sim.frames * dt);      // scene units / s
for (let i = 0; i < F.length; i++) {
  const f = F[i], p = F[i - 1];
  if (f.scene === "wide") {
    if (!near(Math.hypot(f.earth[0], f.earth[2]), L.wide.orbitR, 1e-3)) fail(i, "Earth left its orbit radius", "check earthPos");
    if (dist(f.cam.pos, [0, 0, 0]) < L.wide.sunR * 1.05) fail(i, "camera inside the Sun", "move camera key");
    if (dist(f.cam.pos, f.earth) < L.wide.earthR * 1.05) fail(i, "camera inside Earth", "move camera key");
    if (L.wide.orbitR - L.wide.earthR <= L.wide.sunR) fail(i, "Earth overlaps the Sun", "layout");
  } else {
    const earth = [f.earthX, 0, 0];
    if (dist(f.cam.pos, earth) < L.local.earthR * 1.05) fail(i, "camera inside Earth (local)", "move camera key");
    if (!near(-f.earthX * D.kmPerUnitLocal, f.shiftKm, 1)) fail(i, "rendered shift ≠ physical shift", "check KM scale");
  }
  if (!p || cuts.includes(i)) continue;
  if (p.scene === f.scene && f.scene === "wide" && dist(f.earth, p.earth) > vOrbit * dt * 1.01) fail(i, "Earth teleported", "earthAngle must be continuous");
  const step = dist(f.cam.pos, p.cam.pos), reach = dist(p.cam.pos, p.cam.target);
  if (step > 0.1 * reach) fail(i, `camera jumped ${step.toFixed(2)} units (${((step / reach) * 100).toFixed(0)}% of its distance) outside a cut`, "add an in-between key");
  if (Math.abs(f.shiftKm - p.shiftKm) > 40_000) fail(i, "orbit shift moved > 40,000 km in one frame", "slow the ramp");
  if (f.years < p.years - 1e-6) fail(i, "calendar years ran backwards", "years ramp must be monotonic");
}
// 3. Drift marker is the real angle: 1.24219 days per year of a 365.24219-day orbit
for (const f of F) {
  const want = f.earthAngle + (f.years * D.driftPerYear / C.tropicalYear) * 2 * Math.PI;
  if (!near(f.markerAngle, want, 1e-4)) { fail(f.f, "calendar marker angle not physical", "recompute markerAngle"); break; }
}
// 4. Loop: last frame + 1 lands on frame 0 (Earth angle wraps, camera and state identical)
const first = F[0], last = F[F.length - 1];
const nextAngle = last.earthAngle + 2 * Math.PI / sim.frames;
const turns = (nextAngle - first.earthAngle) / (2 * Math.PI);
if (!near(turns, Math.round(turns), 1e-5)) fail("loop", "Earth angle does not wrap to frame 0", "one full turn over N frames");
const prevStep = dist(last.cam.pos, F[F.length - 2].cam.pos), loopStep = dist(first.cam.pos, last.cam.pos);
if (loopStep > prevStep * 1.5 + 1e-6 || dist(first.cam.target, last.cam.target) > dist(last.cam.target, F[F.length - 2].cam.target) * 1.5 + 1e-6)
  fail("loop", `camera jumps ${loopStep.toFixed(3)} units at the loop point (normal step ${prevStep.toFixed(3)})`, "end on the frame-0 camera path");
if (last.shiftKm !== first.shiftKm || !near(last.sunGain, first.sunGain, 1e-9)) fail("loop", "state differs at loop point", "reset ramps before the end");

const lines = [
  "# Validator report", "",
  `Frames checked: ${F.length} (${sim.fps} fps). Planned cuts at frames ${cuts.join(", ")}.`, "",
  "Checks: Kepler III for the 364-day orbit, every number spoken in the VO against the physics, Earth on its orbit every frame, " +
  "no teleports or camera jumps outside planned cuts, camera never inside the Sun/Earth, calendar marker at the physical drift angle, " +
  "rendered orbit shift equals physical shift, monotonic calendar years, clean loop to frame 0.", "",
  "Not applicable to this video (no people, vehicles or held objects on screen): hand/foot contact, seats, tires, gaze/blinks, ragdolls.", "",
  `**Violations: ${v.length}**`, "",
  ...(v.length ? ["| frame | problem | fix |", "|---|---|---|", ...v.map((x) => `| ${x.frame} | ${x.what} | ${x.fix} |`)] : ["None. Render unblocked."]),
  "", "## Derived values", "", "```json", JSON.stringify(D, null, 1), "```",
];
writeFileSync(new URL("validate-report.md", import.meta.url), lines.join("\n") + "\n");
console.log(`violations: ${v.length}`);
v.slice(0, 15).forEach((x) => console.log(x));
process.exit(v.length ? 1 : 0);
