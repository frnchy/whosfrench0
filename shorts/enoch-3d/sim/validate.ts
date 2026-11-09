// Validator: evaluates every frame of an episode and blocks the render on any violation (exit 1).
// Run: node --experimental-strip-types sim/validate.ts ep1   (writes sim/validate-report-ep1.md)
import { readFileSync, writeFileSync } from "node:fs";
import { groundAt, BLINK_FRAMES } from "../src/story/common.ts";
import type { Cam, Frame, V3 } from "../src/story/common.ts";
import { makeEp1 } from "../src/story/ep1.ts";

const EP = process.argv[2] ?? "ep1";
const rd = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const tl = rd(`../src/timeline_${EP}.json`), mouth = rd(`../src/mouth_${EP}.json`), script = rd(`../plan/${EP}/script.json`);
const research = readFileSync(new URL(`../plan/${EP}/research.md`, import.meta.url), "utf8");
const story: { frameAt: (f: number) => Frame; shots: [string, string, number, number][]; cuts: number[]; speakerOf: (k: number) => string; offscreen?: number[] } =
  EP === "ep1" ? makeEp1(tl, mouth) : EP === "ep2" ? (await import("../src/story/ep2.ts")).makeEp2(tl, mouth) : (await import("../src/story/ep3.ts")).makeEp3(tl, mouth);
const H: Record<string, number> = { max: 1.78, giant: 1350, raphael: 2.35, shem: 2.45, azazel: 2.3, ange: 2.0, watcher: 2.2, woman: 1.62, villager: 1.74, kasdeja: 2.25, smith: 1.8 };

const v: { frame: number | string; what: string }[] = [];
const fail = (frame: number | string, what: string) => v.push({ frame, what });
const sub = (a: number[], b: number[]) => a.map((x, i) => x - b[i]);
const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: number[]) => { const l = Math.hypot(...a); return a.map((x) => x / l); };
const dist = (a: number[], b: number[]) => Math.hypot(...sub(a, b));
const project = (cam: Cam, w: V3) => {
  const f = norm(sub(cam.target, cam.pos)), r = norm(cross(f, [0, 1, 0])), u = cross(r, f), d = sub(w, cam.pos), z = dot(d, f), k = 1 / Math.tan((cam.fov * Math.PI) / 360);
  return { x: (dot(d, r) / z) * k / (1080 / 1920), y: (dot(d, u) / z) * k, z };
};

// 0. script, sources, shot lengths
script.lines.forEach(([spk, text]: [string, string], k: number) => {
  if (tl.lines[k].text !== text.replace(/\[[^\]]*\]\s*/g, "") || tl.lines[k].speaker !== spk) fail(`line ${k + 1}`, "timeline line differs from the script");
});
if (!research.includes(script.ref)) fail("global", `chapter reference ${script.ref} missing from research.md`);
story.shots.forEach(([id, , a, b]) => { if (Math.min(b, tl.duration) - a < 0.9) fail(id, `shot shorter than 0.9 s (${(b - a).toFixed(2)})`); });

const F: Frame[] = Array.from({ length: tl.frames }, (_, f) => story.frameAt(f));
const blinkState: Record<string, { closed: number; lastStart: number }> = {};
const speakFrames: Record<number, { on: number; total: number; open: number }> = {};
for (let i = 0; i < F.length; i++) {
  const fr = F[i], p = F[i - 1], t = i / tl.fps;
  // 1. contact: every figure stands on the ground of its set; no two figures overlap
  for (const c of fr.chars) {
    const g = groundAt(fr.set, c.pos[0], c.pos[2]);
    if (Math.abs(c.pos[1] - g) > 0.02) fail(i, `${c.id} feet ${(c.pos[1] - g).toFixed(2)} m off the ground`);
    for (const d of fr.chars) if (d.id > c.id && Math.hypot(c.pos[0] - d.pos[0], c.pos[2] - d.pos[2]) < 0.5) fail(i, `${c.id} and ${d.id} overlap`);
    // camera never inside a body
    const h = H[c.kind], dx = Math.hypot(fr.cam.pos[0] - c.pos[0], fr.cam.pos[2] - c.pos[2]);
    if (dx < 0.22 * h && fr.cam.pos[1] > c.pos[1] && fr.cam.pos[1] < c.pos[1] + h * 1.05) fail(i, `camera inside ${c.id}`);
    // blinks: 5-frame closures at least 2.4 s apart
    const b = (blinkState[c.id] ??= { closed: 0, lastStart: -999 });
    if (c.pose.blink > 0) { if (b.closed === 0) { if (i - b.lastStart < 72 && b.lastStart > 0) fail(i, `${c.id} blinked again after ${((i - b.lastStart) / 30).toFixed(1)} s`); b.lastStart = i; } b.closed++; if (b.closed > BLINK_FRAMES) fail(i, `${c.id} eyes closed > ${BLINK_FRAMES} frames`); } else b.closed = 0;
    // lips move only on that character's lines (the 200 share the chorus)
    const line = tl.lines.find((l: { start: number; duration: number }) => t >= l.start && t < l.start + l.duration);
    const mine = line && (story.speakerOf(line.id) === c.id.replace(/^c_/, "") || (line.speaker === "CHOEUR" && c.id.startsWith("c_")));
    if (c.pose.mouth > 0.05 && !mine) fail(i, `${c.id} mouth moves while not speaking`);
  }
  if (fr.cam.pos[1] < groundAt(fr.set, fr.cam.pos[0], fr.cam.pos[2]) + 0.25) fail(i, "camera below the ground");
  // 2. the speaker is on screen and lip-syncing during their line
  const line = tl.lines.find((l: { start: number; duration: number; words: { start: number; end: number }[] }) => t >= l.words[0].start && t <= l.words[l.words.length - 1].end);
  if (line && line.speaker !== "HÉNOCH" && !(story.offscreen ?? []).includes(line.id)) {
    const id = story.speakerOf(line.id), cand = fr.chars.filter((c) => (line.speaker === "CHOEUR" ? c.id.startsWith("c_") : c.id.replace(/^c_/, "") === id));
    const s = (speakFrames[line.id] ??= { on: 0, total: 0, open: 0 }); s.total++;
    const vis = cand.some((c) => { const pp = project(fr.cam, [c.pos[0], c.pos[1] + H[c.kind] * 0.92, c.pos[2]]); return pp.z > 0 && Math.abs(pp.x) < 0.95 && Math.abs(pp.y) < 0.95; });
    if (vis) s.on++;
    if (cand.some((c) => c.pose.mouth > 0.15)) s.open++;
  }
  // 3. continuity inside a shot; cuts only at planned shot boundaries
  if (p && p.shot === fr.shot) {
    const step = dist(fr.cam.pos, p.cam.pos), reach = dist(p.cam.pos, p.cam.target);
    if (step > 0.12 * reach) fail(i, `camera jumped ${step.toFixed(2)} m (${((step / reach) * 100).toFixed(0)}% of its distance) inside ${fr.shot}`);
    if (Math.abs(fr.cam.fov - p.cam.fov) > 1) fail(i, "zoom jumped");
  }
  if (p && p.shot !== fr.shot && !story.cuts.includes(i)) fail(i, "unplanned cut");
}
for (const [id, s] of Object.entries(speakFrames)) {
  if (s.on / s.total < 0.7) fail(`line ${id}`, `speaker on screen only ${((s.on / s.total) * 100).toFixed(0)}% of the line`);
  if (s.open / s.total < 0.3) fail(`line ${id}`, `speaker's mouth open only ${((s.open / s.total) * 100).toFixed(0)}% of the line`);
}
// 4. loop: last frame flows into frame 0
const a = F[0].cam, z = F[F.length - 1].cam;
if (dist(a.pos, z.pos) > 1e-3 || dist(a.target, z.target) > 1e-3 || Math.abs(a.fov - z.fov) > 1e-3 || F[0].set !== F[F.length - 1].set) fail("loop", "last frame does not match frame 0");

const out = [
  `# Validator report — ${EP}`, "", `Frames checked: ${F.length} (30 fps), ${story.shots.length} shots, cuts at frames ${story.cuts.join(", ")}.`, "",
  "Checks: every line matches the script and its speaker; chapter reference sourced; shots ≥ 0.9 s; feet on the ground of their set (terrain height on Hermon) every frame; " +
  "no overlapping figures; camera never inside a body or under the ground; blinks last 5 frames and are ≥ 2.4 s apart; lips move only on the character's own lines; " +
  "each spoken line's speaker is on screen ≥ 70% of the line with the mouth open ≥ 30% of it; no camera jump > 12% of its distance or zoom jump inside a shot; cuts only where planned; last frame loops to frame 0.", "",
  "Not applicable: vehicles/tires, seats, ragdolls (no one falls; the Watchers' descent is shown as light, not bodies).", "",
  `**Violations: ${v.length}**`, "",
  ...(v.length ? ["| frame | problem |", "|---|---|", ...v.slice(0, 200).map((x) => `| ${x.frame} | ${x.what} |`)] : ["None. Render unblocked."]),
];
writeFileSync(new URL(`validate-report-${EP}.md`, import.meta.url), out.join("\n") + "\n");
const kinds: Record<string, number> = {}; v.forEach((x) => { const k = x.what.replace(/[\d.-]+/g, "#"); kinds[k] = (kinds[k] ?? 0) + 1; });
console.log(`violations: ${v.length}`); Object.entries(kinds).slice(0, 25).forEach(([k, n]) => console.log(n, k, "first:", v.find((x) => x.what.replace(/[\d.-]+/g, "#") === k)!.frame));
process.exit(v.length ? 1 : 0);
