// Validator: blocks the render unless every baked frame of every recap is consistent. Exit code 1 on any violation.
// Run: node --experimental-strip-types sim/validate.ts   (writes sim/validate-report.md)
import { readFileSync, writeFileSync } from "node:fs";

const sim = JSON.parse(readFileSync(new URL("cache/sim.json", import.meta.url), "utf8"));
const tl = JSON.parse(readFileSync(new URL("../src/timeline.json", import.meta.url), "utf8"));
const scripts = JSON.parse(readFileSync(new URL("../plan/scripts.json", import.meta.url), "utf8"));
const research = readFileSync(new URL("../plan/research.md", import.meta.url), "utf8");
const G = sim.layout, P = G.panels;
const v: { ep: number | string; frame: number | string; what: string; fix: string }[] = [];
const fail = (ep: number | string, frame: number | string, what: string, fix: string) => v.push({ ep, frame, what, fix });
const sub = (a: number[], b: number[]) => a.map((x, i) => x - b[i]);
const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: number[]) => { const l = Math.hypot(...a); return a.map((x) => x / l); };
const dist = (a: number[], b: number[]) => Math.hypot(...sub(a, b));
const ASPECT = 1080 / 1920;

// panel corners in world space (frame included)
const corners = (p: (typeof P)[number]) => {
  const right = [p.normal[2], 0, -p.normal[0]];          // horizontal, perpendicular to the normal
  const hw = G.panelW / 2 + G.frame, hh = G.panelH / 2 + G.frame;
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => [p.centre[0] + right[0] * hw * sx, p.centre[1] + hh * sy, p.centre[2] + right[2] * hw * sx]);
};
const project = (cam: { pos: number[]; target: number[]; fov: number }, w: number[]) => {
  const f = norm(sub(cam.target, cam.pos)), r = norm(cross(f, [0, 1, 0])), u = cross(r, f);
  const d = sub(w, cam.pos), z = dot(d, f), k = 1 / Math.tan((cam.fov * Math.PI) / 360);
  return { x: (dot(d, r) / z) * k / ASPECT, y: (dot(d, u) / z) * k, z };   // NDC, ±1 = frame edge
};

// 1. Static geometry: everything stands on something
for (const p of P) {
  const panelBottom = p.centre[1] - G.panelH / 2;
  if (Math.abs(panelBottom - G.plinthH) > 1e-6) fail("layout", p.i, "panel does not sit on its plinth", "centre.y = plinthH + panelH/2");
  if (G.plinthH <= 0) fail("layout", p.i, "plinth not on the floor", "plinth spans y 0 → plinthH");
  for (const q of P) if (q.i > p.i && dist(p.centre, q.centre) < G.panelW + 0.5) fail("layout", `${p.i}/${q.i}`, "panels overlap", "increase spacing");
  if (Math.abs(Math.hypot(...p.normal) - 1) > 1e-9) fail("layout", p.i, "panel normal not unit length", "normalise");
}

// 2. Per episode: timing, framing, camera
for (const ep of tl.episodes) {
  const S = sim.episodes.find((e: { n: number }) => e.n === ep.n), F = S.frame;
  const src = scripts.episodes.find((e: { n: number }) => e.n === ep.n);
  if (F.length !== ep.frames || Math.abs(ep.frames / 30 - ep.duration) > 0.05) fail(ep.n, "global", "frame count ≠ timeline duration", "re-bake");
  if (!research.includes(ep.ref)) fail(ep.n, "global", `chapter reference "${ep.ref}" missing from research.md`, "source it");
  ep.lines.forEach((l: { id: number; start: number; duration: number; text: string; speaker: string; words: { start: number; end: number }[] }, k: number) => {
    const want = src.lines[k][1].replace(/\[[^\]]*\]\s*/g, "");
    if (l.text !== want || l.speaker !== src.lines[k][0]) fail(ep.n, `line ${l.id}`, "line text/speaker differs from the script", "rebuild timeline");
    const nx = ep.lines[k + 1];
    if (nx && nx.start < l.start + l.duration) fail(ep.n, `line ${l.id}`, "VO lines overlap", "increase GAP");
    l.words.forEach((w, j) => {
      if (w.end < w.start || w.start < l.start - 0.05 || w.end > l.start + l.duration + 0.05) fail(ep.n, `line ${l.id}`, "word timing outside its audio", "check Scribe offsets");
      if (j && w.start < l.words[j - 1].start) fail(ep.n, `line ${l.id}`, "word timings not monotonic", "check Scribe offsets");
    });
  });
  for (let i = 0; i < F.length; i++) {
    const fr = F[i], cam = fr.cam, t = i / 30;
    if (cam.pos[1] < 0.4) fail(ep.n, i, "camera below/at floor level", "raise key");
    for (const p of P) {   // never inside or behind a panel/plinth slab
      const d = sub(cam.pos, p.centre), along = dot(d, p.normal), lateral = Math.hypot(d[0] - p.normal[0] * along, d[2] - p.normal[2] * along);
      if (Math.abs(along) < 0.4 && lateral < G.panelW / 2 + 0.4 && cam.pos[1] < p.centre[1] + G.panelH / 2 + 0.3) fail(ep.n, i, `camera inside panel ${p.i + 1}`, "move key");
    }
    // the panel of the line being spoken is framed: in shot, facing us, filling 60–95 % of the height, centred
    const k = S.arrive.findIndex((a: number, j: number) => t >= a && t <= S.leave[j]);
    if (k >= 0) {
      const pts = corners(P[k]).map((c) => project(cam, c));
      const ys = pts.map((p) => p.y), xs = pts.map((p) => p.x);
      const fill = (Math.max(...ys) - Math.min(...ys)) / 2, cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
      if (pts.some((p) => p.z <= 0 || Math.abs(p.x) > 1 || Math.abs(p.y) > 1)) fail(ep.n, i, `panel ${k + 1} cut off by the frame edge`, "pull camera back");
      if (fill < 0.6 || fill > 0.95) fail(ep.n, i, `panel ${k + 1} fills ${(fill * 100).toFixed(0)}% of frame height`, "adjust dNear/dFar");
      if (Math.abs(cx) > 0.08 || Math.abs(cy) > 0.08) fail(ep.n, i, `panel ${k + 1} off-centre (${cx.toFixed(2)}, ${cy.toFixed(2)})`, "aim at panel centre");
      if (dot(sub(cam.pos, P[k].centre), P[k].normal) <= 0) fail(ep.n, i, `looking at the back of panel ${k + 1}`, "camera on the normal side");
      if (fr.light.indexOf(Math.max(...fr.light)) !== k) fail(ep.n, i, `lit panel ≠ panel ${k + 1} being discussed`, "check light ramps");
    }
    const lineNow = ep.lines.findIndex((l: { words: { start: number; end: number }[] }) => t >= l.words[0].start + 0.6 && t <= l.words[l.words.length - 1].end - 0.5);   // core of the line
    if (lineNow >= 0 && k !== lineNow && !(k < 0 && lineNow === 0)) fail(ep.n, i, `line ${lineNow + 1} plays while panel ${k + 1} is framed`, "move hold windows");
    const p = F[i - 1];
    if (!p) continue;
    const step = dist(cam.pos, p.cam.pos), reach = dist(p.cam.pos, p.cam.target);
    if (step > 0.1 * reach) fail(ep.n, i, `camera jumped ${step.toFixed(2)} (${((step / reach) * 100).toFixed(0)}% of its distance)`, "longer transition");
    if (Math.abs(cam.fov - p.cam.fov) > 0.6) fail(ep.n, i, "zoom jumped", "slower fov change");
  }
  // 3. Loop: last frame → frame 0 is no bigger a step than a normal frame
  const first = F[0].cam, last = F[F.length - 1].cam, prev = F[F.length - 2].cam;
  if (dist(first.pos, last.pos) > dist(last.pos, prev.pos) * 1.5 + 1e-3 || dist(first.target, last.target) > 1e-3 || Math.abs(first.fov - last.fov) > 1e-3)
    fail(ep.n, "loop", "camera differs between the last frame and frame 0", "end on the wide pose");
  if (F[0].light.join() !== F[F.length - 1].light.join()) fail(ep.n, "loop", "panel lighting differs at the loop point", "reset lights before the end");
}

const lines = [
  "# Validator report", "",
  `Episodes: ${tl.episodes.length}. Frames checked: ${sim.episodes.reduce((s: number, e: { frames: number }) => s + e.frames, 0)} (30 fps).`, "",
  "Checks: panels sit on plinths and plinths on the floor, no overlapping panels; every VO line matches the script and its speaker, lines never overlap, " +
  "word timings sit inside their audio and are monotonic; the camera is never under the floor or inside a panel, never jumps more than 10% of its distance per frame, " +
  "never zooms more than 0.6° per frame; while a line plays, its panel is the one framed, lit, facing the camera, uncropped, centred and filling 60–95% of the height; " +
  "each chapter reference appears in research.md; the last frame loops to frame 0 (camera and lights).", "",
  "Not applicable (no people, vehicles or held objects are animated; characters exist only inside the stills): hand/foot contact, seats, tires, gaze/blinks, ragdolls.", "",
  `**Violations: ${v.length}**`, "",
  ...(v.length ? ["| ep | frame | problem | fix |", "|---|---|---|---|", ...v.slice(0, 200).map((x) => `| ${x.ep} | ${x.frame} | ${x.what} | ${x.fix} |`)] : ["None. Render unblocked."]),
];
writeFileSync(new URL("validate-report.md", import.meta.url), lines.join("\n") + "\n");
console.log(`violations: ${v.length}`);
const kinds: Record<string, number> = {};
v.forEach((x) => { const key = `ep${x.ep}: ${x.what.replace(/[\d.]+/g, "#")}`; kinds[key] = (kinds[key] ?? 0) + 1; });
Object.entries(kinds).slice(0, 30).forEach(([k, n]) => console.log(n, k, "first frame", v.find((x) => `ep${x.ep}: ${x.what.replace(/[\d.]+/g, "#")}` === k)!.frame));
process.exit(v.length ? 1 : 0);
