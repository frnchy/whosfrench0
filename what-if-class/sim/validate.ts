// Contact/physics validator. Run: npx -y tsx sim/validate.ts  (exit 1 on any violation)
import * as THREE from 'three';
import { OBB } from 'three/examples/jsm/math/OBB.js';
import fs from 'node:fs';
import { world, FPS, TL, blinkTimes, BUTTONS, DIM, BOARD_Z, obbCorners, type Part, type World } from '../src/world';

const N = Math.round(TL.length * FPS);
const [F0, F1] = (process.env.RANGE ?? `0,${TL.length}`).split(',').map((x) => Math.round(+x * FPS));
const v: Record<string, string[]> = { interpenetration: [], handPhone: [], thumbTap: [], feet: [], seat: [], rest: [], gaze: [], blink: [], board: [] };
const stats = { frames: 0, taps: 0, handPhone: 0, seat: 0, rest: 0, feet: 0, pairs: 0 };
const flag = (k: string, f: number, msg: string) => { if (v[k].length < 40) v[k].push(`f${f} (${(f / FPS).toFixed(2)}s): ${msg}`); else if (v[k].length === 40) v[k].push('…more'); };

const dec = (p: Part) => { const M = new THREE.Matrix4().fromArray(p.m), pos = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(); M.decompose(pos, q, s); return { M, pos, q, s }; };
const obb = (p: Part, shrink: number) => {
  const { pos, q, s } = dec(p);
  const half = new THREE.Vector3(Math.max(s.x / 2 - shrink, 0), Math.max(s.y / 2 - shrink, 0), Math.max(s.z / 2 - shrink, 0));
  return { o: new OBB(pos, half, new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q))), r: half.length(), pos };
};
/** gap of a's lowest corner above b's top face, measured along b's up axis (metres), + whether a's centre is over b */
const restGap = (a: Part, b: Part) => {
  const { M, s } = dec(b), inv = M.clone().invert();
  const loc = obbCorners(a.m).map((c) => c.clone().applyMatrix4(inv));
  const gap = Math.min(...loc.map((c) => (c.y - 0.5) * s.y));
  const ac = new THREE.Vector3(a.m[12], a.m[13], a.m[14]).applyMatrix4(inv);
  return { gap, over: Math.abs(ac.x) <= 0.5 && Math.abs(ac.z) <= 0.5 };
};
const find = (w: World, key: string) => {
  const [o, id] = key.includes(':') ? key.split(':') : [null, key];
  return w.parts.find((p) => p.id === id && (o === null || p.owner === o));
};
const group = (owner: string) => (owner === 'env' || owner === 'envFg' ? 'env' : owner);

let prev: World | null = null;
for (let f = F0; f < Math.min(F1, N); f++) {
  const w = world(f / FPS); stats.frames++;
  const cut = !prev || prev.scene !== w.scene || new THREE.Vector3(...prev.cam.pos).distanceTo(new THREE.Vector3(...w.cam.pos)) > 0.25;
  // 1) interpenetration > 2 cm between different objects (shrink every box 1 cm per side)
  const solids = w.parts.filter((p) => p.solid && p.kind === 'box').map((p) => ({ p, ...obb(p, 0.01) }));
  for (let i = 0; i < solids.length; i++) for (let j = i + 1; j < solids.length; j++) {
    const A = solids[i], B = solids[j];
    if (group(A.p.owner) === group(B.p.owner)) continue;
    if (A.pos.distanceTo(B.pos) > A.r + B.r) continue;
    stats.pairs++;
    if (A.o.intersectsOBB(B.o)) flag('interpenetration', f, `${A.p.owner}:${A.p.id} × ${B.p.owner}:${B.p.id}`);
  }
  for (const c of w.chars) {
    const own = w.parts.filter((p) => p.owner === c.id);
    const P = (id: string) => own.find((p) => p.id === id);
    // 2) gaze target on every face
    if (!c.gaze || c.gaze.some((x) => !Number.isFinite(x))) flag('gaze', f, `${c.id} has no gaze target`);
    // 3) feet planted (stand/sit): every shoe bottom corner within 2 cm of the floor, no sliding between frames
    if (c.pose.mode === 'stand' || (c.pose.mode === 'sit' && !(c.pose.lift ?? 0))) {
      for (const s of ['shoe-1', 'shoe1']) {
        const sh = P(s)!; stats.feet++;
        const ys = obbCorners(sh.m).map((p) => p.y).sort((a, b) => a - b).slice(0, 4);
        if (Math.abs(ys[0] - c.pos[1]) > 0.02 || ys[3] - ys[0] > 0.02) flag('feet', f, `${c.id}.${s} bottom y=${ys[0].toFixed(3)}..${ys[3].toFixed(3)}`);
        const pc = prev && !cut ? prev.parts.find((p) => p.owner === c.id && p.id === s) : null;
        const pch = prev?.chars.find((x) => x.id === c.id);
        if (pc && pch && pch.pose.mode === c.pose.mode && !(pch.pose.lift ?? 0)) {
          const d = Math.hypot(sh.m[12] - pc.m[12], sh.m[14] - pc.m[14]);
          if (d > 0.002) flag('feet', f, `${c.id}.${s} slid ${(d * 1000).toFixed(1)} mm`);
        }
      }
    }
    // 4) hand–phone contact ≤ 2 mm (phone back flush on the palm), thumb taps match highlighted key
    if (c.hold?.item === 'phone') {
      stats.handPhone++;
      const hand = P('handR')!, phone = P('phone')!;
      const { M: PM, s: ps } = dec(phone);
      const back = new THREE.Vector3(0, 0, -0.5).applyMatrix4(PM);
      const hinv = new THREE.Matrix4().fromArray(hand.m).invert();
      const lb = back.clone().applyMatrix4(hinv);
      const gap = (lb.z - 0.5) * DIM.hand[2];
      if (Math.abs(gap) > 0.002 || Math.abs(lb.x) > 0.5 || Math.abs(lb.y) > 1.5) flag('handPhone', f, `gap ${(gap * 1000).toFixed(2)} mm`);
      const tip = new THREE.Vector3(P('thumbTip')!.m[12], P('thumbTip')!.m[13], P('thumbTip')!.m[14]).applyMatrix4(PM.clone().invert());
      const u = tip.x * ps.x, vv = tip.y * ps.y, lift = (tip.z - 0.5) * ps.z;
      if (lift < -0.0005) flag('thumbTap', f, `thumb inside the glass (${(lift * 1000).toFixed(2)} mm)`);
      const geo = lift <= 0.002 ? Object.keys(BUTTONS).find((k) => { const r = BUTTONS[k]; return u >= r[0] && u <= r[2] && vv >= r[1] && vv <= r[3]; }) ?? null : null;
      const shown = (P('screen')!.tex ?? '').split(':')[3];
      if ((geo ?? '-') !== shown) flag('thumbTap', f, `thumb on ${geo ?? 'nothing'} but screen highlights ${shown}`);
      if (geo && !(prev?.parts.find((p) => p.owner === c.id && p.id === 'screen')?.tex ?? '').split(':')[3]?.startsWith(geo)) stats.taps++;
    }
  }
  // 5) explicit contacts: seats (≤1 cm), resting objects (≤1 cm), chalk on board (≤2 mm)
  for (const k of w.checks) {
    if (k.kind === 'seat') {
      const seat = find(w, k.b)!; stats.seat++;
      for (const s of ['thigh-1', 'thigh1']) {
        const th = find(w, `${k.a}:${s}`)!, r = restGap(th, seat);
        if (Math.abs(r.gap) > 0.01 || !r.over) flag('seat', f, `${k.a}.${s} gap ${(r.gap * 100).toFixed(1)} cm over=${r.over}`);
      }
    } else if (k.kind === 'rest') {
      const a = find(w, k.a), b = find(w, k.b); stats.rest++;
      if (!a || !b) { flag('rest', f, `missing ${k.a}/${k.b}`); continue; }
      const r = restGap(a, b);
      if (Math.abs(r.gap) > 0.01 || !r.over) flag('rest', f, `${k.a} on ${k.b}: gap ${(r.gap * 100).toFixed(1)} cm over=${r.over}`);
    }
  }
  const t = w.chars.find((c) => c.id === 'teacher');
  if (t && t.hold?.item === 'chalk' && t.rotY === 0 && (t.pose.armR?.[0] ?? 0) < -1.5) {
    const ch = w.parts.find((p) => p.owner === 'teacher' && p.id === 'chalk')!;
    const z = Math.max(...obbCorners(ch.m).map((p) => p.z));
    if (Math.abs(z - BOARD_Z) > 0.002) flag('board', f, `chalk ${((z - BOARD_Z) * 1000).toFixed(1)} mm from board`);
  }
  prev = w;
}
// 6) blinks at least every 6 s for every face that appears
const ids = new Set<string>(); for (let f = 0; f < N; f += 15) world(f / FPS).chars.forEach((c) => ids.add(c.id));
for (const id of ids) {
  const b = [0, ...blinkTimes(id).filter((x) => x <= TL.length), TL.length];
  for (let i = 1; i < b.length; i++) if (b[i] - b[i - 1] > 6) flag('blink', 0, `${id} gap ${(b[i] - b[i - 1]).toFixed(2)} s`);
}

const total = Object.values(v).reduce((a, x) => a + x.filter((s) => s !== '…more').length, 0);
const md = [`# Validator report`, ``, `Frames checked: ${stats.frames} (${TL.length}s @ ${FPS}fps)  `, `Box pairs tested for interpenetration: ${stats.pairs}  `, `Hand–phone frames: ${stats.handPhone} · thumb taps detected: ${stats.taps} · foot checks: ${stats.feet} · seat checks: ${stats.seat} · rest checks: ${stats.rest}`, ``,
  `| Rule | Threshold | Violations |`, `|---|---|---|`,
  ...[['interpenetration', 'no overlap > 2 cm'], ['handPhone', 'palm ↔ phone back ≤ 2 mm'], ['thumbTap', 'thumb contact ⇔ same key highlighted, same frame'], ['feet', 'shoe bottoms ≤ 2 cm from floor, no slide > 2 mm/frame'], ['seat', 'thigh ↔ seat ≤ 1 cm'], ['rest', 'resting objects ≤ 1 cm'], ['board', 'chalk ↔ board ≤ 2 mm'], ['gaze', 'gaze target on every face'], ['blink', 'blink at least every 6 s']].map(([k, d]) => `| ${k} | ${d} | ${v[k].filter((s) => s !== '…more').length} |`),
  ``, `**Total violations: ${total}**`, ``, ...Object.entries(v).filter(([, x]) => x.length).flatMap(([k, x]) => [`## ${k}`, ...x.map((s) => `- ${s}`), ``])].join('\n');
fs.writeFileSync('sim/validate-report.md', md + '\n');
console.log(md.split('\n').slice(0, 20).join('\n'));
for (const [k, x] of Object.entries(v)) if (x.length) console.log(`\n${k}:\n  ` + x.slice(0, 8).join('\n  '));
process.exit(total ? 1 : 0);
