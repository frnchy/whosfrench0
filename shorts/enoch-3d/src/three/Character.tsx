// Procedural stylised "vinyl figure" humans and angels: a rig of groups with eased joint angles.
import { useMemo } from "react";
import * as THREE from "three";
import type { Char, Kind } from "../story/common.ts";

type Look = { H: number; skin: string; robe: string; robe2: string; accent: string; hair: string; hairStyle: "long" | "short" | "curly" | "veil" | "bald"; beard?: string; iris: string; glowEyes?: boolean; wings?: string; build: number };
export const LOOKS: Record<Kind, Look> = {
  shem: { H: 2.45, skin: "#c99f7c", robe: "#ece6d6", robe2: "#d8cdb2", accent: "#c9a14a", hair: "#ebe8e2", hairStyle: "long", beard: "#e4e0d8", iris: "#ffcf6a", glowEyes: true, wings: "#f6f0e2", build: 1.12 },
  azazel: { H: 2.3, skin: "#b98563", robe: "#e2d9c6", robe2: "#8e2a22", accent: "#d0473a", hair: "#1c1411", hairStyle: "long", iris: "#ff7a3c", glowEyes: true, wings: "#efe7d6", build: 1.05 },
  ange: { H: 2.0, skin: "#ddb48f", robe: "#eef1f6", robe2: "#bcd3ea", accent: "#8fb6d9", hair: "#7a4a28", hairStyle: "curly", iris: "#9fd8ff", glowEyes: true, wings: "#fbfbfb", build: 0.95 },
  watcher: { H: 2.2, skin: "#c5966f", robe: "#e7e2d4", robe2: "#cfc3a5", accent: "#bfa05a", hair: "#3a2a1f", hairStyle: "short", iris: "#ffd88a", glowEyes: true, wings: "#f3eee2", build: 1 },
  woman: { H: 1.62, skin: "#a97a52", robe: "#b8743f", robe2: "#7c4a2a", accent: "#e3c88c", hair: "#1a1210", hairStyle: "veil", iris: "#2a1a10", build: 0.9 },
  villager: { H: 1.74, skin: "#9c6e48", robe: "#8a7656", robe2: "#5e4a33", accent: "#c9b07a", hair: "#1d140e", hairStyle: "short", beard: "#1d140e", iris: "#2a1a10", build: 1 },
  kasdeja: { H: 2.25, skin: "#b08263", robe: "#d7cbb2", robe2: "#4b3b6b", accent: "#9b7ad1", hair: "#2a1d18", hairStyle: "long", iris: "#c9a6ff", glowEyes: true, wings: "#e9e2d2", build: 1 },
  max: { H: 1.78, skin: "#c99a74", robe: "#2e3440", robe2: "#c0392b", accent: "#e5e7eb", hair: "#2b1d14", hairStyle: "curly", iris: "#3a2a1a", build: 0.95 },
  giant: { H: 1350, skin: "#a57656", robe: "#4b3a2a", robe2: "#2f241a", accent: "#7a5a3a", hair: "#1a120c", hairStyle: "long", beard: "#1a120c", iris: "#ffb347", glowEyes: true, build: 1.1 },
  raphael: { H: 2.35, skin: "#d2a983", robe: "#f4f6fb", robe2: "#3d6fb6", accent: "#e8c35a", hair: "#c9a15a", hairStyle: "long", iris: "#8fd3ff", glowEyes: true, wings: "#fbfbff", build: 1.05 },
  smith: { H: 1.8, skin: "#8f6342", robe: "#5b4634", robe2: "#3a2b1f", accent: "#b38450", hair: "#140d09", hairStyle: "short", beard: "#140d09", iris: "#2a1a10", build: 1.15 },
};

const mats = new Map<string, THREE.Material>();
const mat = (color: string, opts: { rough?: number; metal?: number; emissive?: string; ei?: number; side?: THREE.Side } = {}) => {
  const key = JSON.stringify([color, opts]);
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.55, metalness: opts.metal ?? 0, emissive: opts.emissive ?? "#000", emissiveIntensity: opts.ei ?? 0, side: opts.side ?? THREE.FrontSide }));
  return mats.get(key)!;
};

// robe: a lathe profile, flared hem, with soft folds in the vertex positions
const robeGeo = (build: number) => {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 20; i++) { const y = (i / 20) * 0.58; const r = (0.175 - 0.06 * Math.pow(i / 20, 0.8)) * build + (i === 0 ? 0.004 : 0); pts.push(new THREE.Vector2(r, y)); }
  const g = new THREE.LatheGeometry(pts, 48);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), fold = 1 + 0.06 * Math.sin(a * 9) * (1 - y / 0.58);
    p.setX(i, x * fold); p.setZ(i, z * fold);
  }
  g.computeVertexNormals();
  return g;
};
// one feather-blade of a wing (rounded tapered shape)
const featherGeo = (() => {
  const s = new THREE.Shape(); s.moveTo(0, -0.02); s.quadraticCurveTo(0.08, 0.2, 0.03, 0.55); s.quadraticCurveTo(0, 0.62, -0.03, 0.55); s.quadraticCurveTo(-0.07, 0.2, 0, -0.02);
  return new THREE.ShapeGeometry(s, 8);
})();

const Wing: React.FC<{ side: 1 | -1; spread: number; color: string }> = ({ side, spread, color }) => {
  const m = mat(color, { rough: 0.8, emissive: color, ei: 0.08, side: THREE.DoubleSide });
  const m2 = mat(new THREE.Color(color).multiplyScalar(0.78).getStyle(), { rough: 0.85, side: THREE.DoubleSide });
  const n = 11;
  return (
    <group position={[side * 0.05, 0.76, -0.075]} rotation={[0.2, side * (0.65 - spread * 0.55), side * (0.2 + spread * 0.95)]} scale={0.85}>
      {Array.from({ length: n }, (_, i) => {
        const k = i / (n - 1), len = 0.32 + 0.42 * Math.sin(k * Math.PI * 0.9 + 0.2);
        return <mesh key={i} geometry={featherGeo} material={i % 2 ? m2 : m} position={[side * k * 0.42, k * 0.12, -k * 0.02]} rotation={[0, 0, side * (-0.15 - k * (0.9 + spread * 0.5))]} scale={[1, len, 1]} />;
      })}
    </group>
  );
};

const Arm: React.FC<{ side: 1 | -1; a: [number, number, number]; skin: THREE.Material; sleeve: THREE.Material; build: number; hold?: string }> = ({ side, a, skin, sleeve, build, hold }) => (
  <group position={[side * 0.1 * build, 0.775, 0]} rotation={[-a[0], 0, side * a[1]]}>
    <mesh position={[0, -0.085, 0]} material={sleeve}><capsuleGeometry args={[0.025 * build, 0.12, 6, 12]} /></mesh>
    <group position={[0, -0.175, 0]} rotation={[-a[2], 0, 0]}>
      <mesh position={[0, -0.075, 0]} material={sleeve}><capsuleGeometry args={[0.021 * build, 0.11, 6, 12]} /></mesh>
      <mesh position={[0, -0.165, 0.005]} material={skin} scale={[1, 1.25, 0.8]}><sphereGeometry args={[0.028, 16, 12]} /></mesh>
      {hold === "hammer" && <group position={[0, -0.17, 0]}><mesh material={mat("#5a3b22")} position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.009, 0.009, 0.22, 8]} /></mesh><mesh material={mat("#4a4a50", { metal: 0.85, rough: 0.35 })} position={[0, 0, 0.21]}><boxGeometry args={[0.045, 0.08, 0.04]} /></mesh></group>}
      {hold === "sword" && <group position={[0, -0.17, 0]}><mesh material={mat("#d4d7de", { metal: 0.95, rough: 0.2 })} position={[0, -0.28, 0]}><boxGeometry args={[0.022, 0.5, 0.006]} /></mesh><mesh material={mat("#b08a3c", { metal: 0.7, rough: 0.35 })} position={[0, -0.03, 0]}><boxGeometry args={[0.1, 0.014, 0.02]} /></mesh></group>}
      {hold === "phone" && <group position={[0, -0.19, 0.012]} rotation={[0.2, 0, 0]}><mesh material={mat("#111")}><boxGeometry args={[0.04, 0.075, 0.005]} /></mesh><mesh material={mat("#000", { emissive: "#9fd8ff", ei: 1.4 })} position={[0, 0, 0.0028]}><planeGeometry args={[0.035, 0.068]} /></mesh></group>}
      {hold === "chains" && [0, 1, 2, 3, 4, 5].map((i) => <mesh key={i} material={mat("#c9ccd2", { metal: 0.9, rough: 0.3 })} position={[0, -0.19 - i * 0.028, 0.01]} rotation={[0, i % 2 ? Math.PI / 2 : 0, 0]}><torusGeometry args={[0.012, 0.0035, 6, 14]} /></mesh>)}
      {hold === "bracelet" && <mesh material={mat("#e0b34a", { metal: 0.9, rough: 0.25, emissive: "#ffcc55", ei: 0.35 })} position={[0, -0.14, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.026, 0.006, 8, 24]} /></mesh>}
      {hold === "gems" && ["#ff3b6b", "#3bd1ff", "#7dff6a", "#ffd23b"].map((c, i) => <mesh key={c} material={mat(c, { emissive: c, ei: 2.2, rough: 0.1 })} position={[Math.cos(i * 1.6) * 0.022, -0.185 - (i % 2) * 0.01, 0.03 + Math.sin(i * 1.6) * 0.012]}><octahedronGeometry args={[0.013]} /></mesh>)}
    </group>
  </group>
);

const Head: React.FC<{ L: Look; c: Char }> = ({ L, c }) => {
  const p = c.pose, skin = mat(L.skin, { rough: 0.5 }), dark = mat("#1a0e0a", { rough: 0.8 });
  const iris = L.glowEyes ? mat(L.iris, { emissive: L.iris, ei: 1.6 }) : mat(L.iris, { rough: 0.3 });
  const white = mat("#e9e2d6", { rough: 0.3 }), lid = skin, hair = mat(L.hair, { rough: 0.75 });
  const browY = 0.032, browTilt = p.brow * 0.35;
  return (
    <group position={[0, 0.915, 0]} rotation={[-p.head[1], p.head[0], 0]} scale={1.22}>
      <mesh material={skin} scale={[0.06, 0.077, 0.066]}><sphereGeometry args={[1, 32, 24]} /></mesh>
      {/* jaw/chin volume */}
      <mesh material={skin} position={[0, -0.04, 0.012]} scale={[0.045, 0.04, 0.05]}><sphereGeometry args={[1, 24, 16]} /></mesh>
      <mesh material={skin} position={[0, -0.002, 0.066]} rotation={[0.25, 0, 0]}><coneGeometry args={[0.011, 0.03, 12]} /></mesh>
      {[-1, 1].map((sd) => (
        <group key={sd} position={[sd * 0.022, 0.012, 0.054]}>
          <mesh material={white}><sphereGeometry args={[0.0105, 16, 12]} /></mesh>
          <mesh material={iris} position={[Math.sin(p.gaze[0]) * 0.005, Math.sin(p.gaze[1]) * 0.005, 0.009]}><circleGeometry args={[0.0076, 20]} /></mesh>
          <mesh material={dark} position={[Math.sin(p.gaze[0]) * 0.005, Math.sin(p.gaze[1]) * 0.005, 0.0093]}><circleGeometry args={[0.0034, 14]} /></mesh>
          {/* eyelid closes over the eye when blinking */}
          <mesh material={lid} rotation={[-Math.PI / 2 + (1 - p.blink) * -0.95, 0, 0]} scale={[1.08, 1.08, 1.08]}><sphereGeometry args={[0.0108, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
          <mesh material={dark} position={[0, browY - 0.012 + Math.max(0, p.brow) * 0.002, 0.008]} rotation={[0, 0, sd * browTilt]}><boxGeometry args={[0.026, 0.006, 0.007]} /></mesh>
        </group>
      ))}
      {[-1, 1].map((sd) => <mesh key={"ear" + sd} material={skin} position={[sd * 0.06, 0.0, -0.004]} scale={[0.008, 0.018, 0.013]}><sphereGeometry args={[1, 12, 8]} /></mesh>)}
      {/* mouth: opens with the voice */}
      <mesh material={mat("#3a1410", { rough: 0.9 })} position={[0, -0.036, 0.057]} scale={[1, 0.18 + p.mouth * 0.95, 1]}><circleGeometry args={[0.0145, 24]} /></mesh>
      <mesh material={mat("#a85d4c")} position={[0, -0.036 + 0.004 + p.mouth * 0.006, 0.0575]} scale={[1, 0.25, 1]}><circleGeometry args={[0.0145, 24, 0, Math.PI]} /></mesh>
      {L.hairStyle !== "bald" && L.hairStyle !== "veil" && (
        <mesh material={hair} position={[0, 0.018, -0.008]} scale={[0.066, 0.075, 0.07]}><sphereGeometry args={[1, 28, 18, 0, Math.PI * 2, 0, L.hairStyle === "curly" ? 1.75 : 1.6]} /></mesh>
      )}
      {L.hairStyle === "long" && <mesh material={hair} position={[0, -0.06, -0.045]} scale={[0.06, 0.11, 0.035]}><sphereGeometry args={[1, 20, 14]} /></mesh>}
      {L.hairStyle === "curly" && [0, 1, 2, 3, 4, 5, 6].map((i) => <mesh key={i} material={hair} position={[Math.cos(i * 0.9) * 0.05, 0.055 + (i % 2) * 0.012, Math.sin(i * 0.9) * 0.04 - 0.01]}><sphereGeometry args={[0.022, 12, 10]} /></mesh>)}
      {L.hairStyle === "veil" && <mesh material={mat(L.robe2, { rough: 0.8 })} position={[0, 0.01, -0.012]} scale={[0.075, 0.09, 0.08]}><sphereGeometry args={[1, 24, 16, 0, Math.PI * 2, 0, 2.0]} /></mesh>}
      {L.beard && <mesh material={mat(L.beard, { rough: 0.8 })} position={[0, -0.07, 0.028]} rotation={[0.25, 0, 0]} scale={[1, 1, 0.7]}><coneGeometry args={[0.042, L.H > 2.4 ? 0.13 : 0.06, 16]} /></mesh>}
    </group>
  );
};

export const Character: React.FC<{ c: Char }> = ({ c }) => {
  const L = LOOKS[c.kind], p = c.pose, b = L.build;
  const robe = useMemo(() => robeGeo(b), [b]);
  const skin = mat(L.skin, { rough: 0.5 }), cloth = mat(L.robe, { rough: 0.75 }), cloth2 = mat(L.robe2, { rough: 0.7 });
  const gold = mat(L.accent, { rough: 0.35, metal: 0.6 });
  return (
    <group position={c.pos} rotation={[0, c.yaw, 0]} scale={L.H}>
      {/* feet on the ground (y = 0 of the character) */}
      {[-1, 1].map((sd) => <mesh key={sd} material={mat("#3b2a1e", { rough: 0.8 })} position={[sd * 0.045, 0.012, 0.035]} scale={[0.032, 0.012, 0.06]}><sphereGeometry args={[1, 12, 8]} /></mesh>)}
      <mesh geometry={robe} material={cloth} />
      <group rotation={[p.lean, 0, 0]}>
        <mesh material={cloth2} position={[0, 0.56, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.112 * b, 0.014, 10, 32]} /></mesh>
        <mesh material={cloth} position={[0, 0.68, 0]} scale={[0.82 * b, 1, 0.62 * b]}><capsuleGeometry args={[0.095, 0.15, 8, 20]} /></mesh>
        {/* sash across the chest */}
        <mesh material={cloth2} position={[0, 0.69, 0.005]} rotation={[0, 0, 0.7]} scale={[1, 1, b * 0.8]}><torusGeometry args={[0.1 * b, 0.012, 8, 32, Math.PI]} /></mesh>
        {(c.kind === "shem" || c.kind === "azazel") && [-1, 1].map((sd) => <mesh key={sd} material={gold} position={[sd * 0.095 * b, 0.775, 0]} scale={[1, 0.55, 1]}><sphereGeometry args={[0.038, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>)}
        <mesh material={skin} position={[0, 0.83, 0]}><cylinderGeometry args={[0.026, 0.03, 0.05, 14]} /></mesh>
        <Arm side={-1} a={p.lArm} skin={skin} sleeve={cloth} build={b} hold={c.prop === "bracelet" ? "bracelet" : undefined} />
        <Arm side={1} a={p.rArm} skin={skin} sleeve={cloth} build={b} hold={c.prop === "hammer" || c.prop === "sword" || c.prop === "gems" || c.prop === "phone" || c.prop === "chains" ? c.prop : undefined} />
        <Head L={L} c={c} />
        {L.wings && <mesh material={mat(L.robe2, { rough: 0.8, side: THREE.DoubleSide })} position={[0, 0.42, 0]}><cylinderGeometry args={[0.1 * b, 0.2 * b, 0.76, 40, 1, true, Math.PI * 0.32, Math.PI * 1.36]} /></mesh>}
        {L.wings && <><Wing side={-1} spread={p.wings} color={L.wings} /><Wing side={1} spread={p.wings} color={L.wings} /></>}
        {c.prop === "jar" && <mesh material={mat("#a9643a", { rough: 0.8 })} position={[-0.17, 0.98, 0.0]} scale={[1, 1.1, 1]}><sphereGeometry args={[0.065, 16, 12]} /></mesh>}
      </group>
    </group>
  );
};
