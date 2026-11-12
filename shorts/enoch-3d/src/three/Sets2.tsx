// DESERT (Dudaël, episode 6) and COSMOS (Hénoch's journey, episode 7).
import { useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { radial, rng, Sky } from "./Sets";
import type { Fx } from "../story/common.ts";

// ---------- DESERT of Dudaël: dunes at night, an opening in the ground, rough rocks piled on it ----------
export const Desert: React.FC<{ fx: Fx; t: number }> = ({ fx, t }) => {
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => { scene.fog = new THREE.Fog("#141019", 40, 420); }, [scene]);
  const dunes = useMemo(() => { const r = rng(61); return Array.from({ length: 34 }, () => { const a = r() * 6.28, d = 45 + r() * 260; return [Math.cos(a) * d, Math.sin(a) * d, 20 + r() * 50, 4 + r() * 12]; }); }, []);
  const rocks = useMemo(() => { const r = rng(62); return Array.from({ length: 46 }, (_, i) => { const a = r() * 6.28, d = r() * 3.6; return [Math.cos(a) * d, Math.sin(a) * d, 0.7 + r() * 1.3, r() * 6.28, i / 46]; }); }, []);
  const ember = useMemo(() => radial([[0, "rgba(255,120,60,0.9)"], [0.4, "rgba(160,30,10,0.4)"], [1, "rgba(0,0,0,0)"]]), []);
  const pit = fx.pit ?? 0, dark = 1 - 0.75 * Math.min(1, Math.max(0, pit - 1));   // pit: 0 closed ground, 0→1 opens, 1→2 rocks cover it and the light dies
  return (
    <>
      <Sky tint="#08060d" moon={[300, 240, -500]} />
      <hemisphereLight args={["#7a6fb0", "#2a1a12", 0.75 * dark]} />
      <directionalLight position={[300, 240, -500]} intensity={1.5 * dark} color="#c9c0ff" />
      <directionalLight position={[-20, 30, 60]} intensity={0.5 * dark} color="#ffcfa0" />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1400, 1400]} /><meshStandardMaterial color="#9a7a55" roughness={1} /></mesh>
      {dunes.map(([x, z, w, h], i) => <mesh key={i} position={[x, -h * 0.35, z]} scale={[w, h, w * 0.7]}><sphereGeometry args={[1, 20, 12]} /><meshStandardMaterial color="#8f6f4c" roughness={1} /></mesh>)}
      {/* the opening */}
      {pit > 0 && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, -6]} scale={Math.min(1, pit)}><circleGeometry args={[4, 40]} /><meshBasicMaterial color="#020103" /></mesh>
          <sprite position={[0, 0.4, -6]} scale={[11 * Math.min(1, pit), 5 * Math.min(1, pit), 1]}><spriteMaterial map={ember} transparent opacity={0.7 * (1 - Math.min(1, Math.max(0, pit - 1)))} depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>
          <pointLight position={[0, 1.2, -6]} intensity={90 * (1 - Math.min(1, Math.max(0, pit - 1)))} distance={22} color="#ff5a2a" />
        </>
      )}
      {/* rough and jagged rocks dropped on the opening (1 Hénoch 10:5) */}
      {pit > 1 && rocks.map(([x, z, sz, rot, order], i) => {
        const k = Math.min(1, Math.max(0, (pit - 1 - order * 0.6) / 0.25)); if (k <= 0) return null;
        return <mesh key={i} position={[x, sz * 0.4 + (1 - k * k) * 40, -6 + z]} rotation={[rot, rot * 2, rot * 0.5 + (1 - k) * 3]} scale={sz}><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#4a423c" roughness={1} flatShading /></mesh>;
      })}
      <mesh visible={false}><boxGeometry /><meshBasicMaterial opacity={t * 0} transparent /></mesh>
    </>
  );
};

// ---------- COSMOS: four stations far apart in the dark (fog hides the others) ----------
// wall of crystal + tongues of fire at z=-60 · throne and rivers of fire at z=-300 · seven mountains at x=+400 · seven bound stars at x=-400
export const STATIONS = { wall: [0, 0, 0], throne: [0, 0, -300], mountains: [400, 0, 0], stars: [-400, 0, 0] } as const;
export const Cosmos: React.FC<{ fx: Fx; t: number }> = ({ fx, t }) => {
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => { scene.fog = new THREE.Fog("#05060f", 30, 170); }, [scene]);
  const flame = useMemo(() => radial([[0, "rgba(255,245,200,1)"], [0.3, "rgba(255,150,40,0.85)"], [0.7, "rgba(200,40,0,0.3)"], [1, "rgba(0,0,0,0)"]]), []);
  const star = useMemo(() => radial([[0, "rgba(255,255,255,1)"], [0.2, "rgba(255,200,120,0.9)"], [0.6, "rgba(255,90,20,0.35)"], [1, "rgba(0,0,0,0)"]]), []);
  const flick = (i: number) => 1 + 0.18 * Math.sin(t * 9 + i * 1.7) + 0.1 * Math.sin(t * 17 + i);
  const gems = ["#e84a5f", "#f2c14e", "#4fb0c6", "#7bd389", "#b388eb", "#f08a4b", "#e8e8f0"];
  const glory = fx.glory ?? 0;
  return (
    <>
      <Sky tint="#04050c" moon={[2000, 1500, -3000]} />
      <hemisphereLight args={["#8fa0e0", "#1a1626", 0.7]} />
      <directionalLight position={[40, 80, 60]} intensity={0.9} color="#cfd8ff" />
      {/* a floor of dark glass under everything */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[3000, 3000]} /><meshStandardMaterial color="#141a2e" roughness={0.25} metalness={0.5} /></mesh>
      {/* 1 — the wall of crystal, ringed with tongues of fire (14:9) */}
      <group position={[0, 0, -60]}>
        {Array.from({ length: 15 }, (_, i) => <mesh key={i} position={[(i - 7) * 5, 14 + (i % 3) * 3, 0]} rotation={[0, 0, (i % 2 ? 1 : -1) * 0.06]}><boxGeometry args={[4.6, 28 + (i % 3) * 6, 2]} /><meshStandardMaterial color="#bfe6ff" roughness={0.05} metalness={0.3} transparent opacity={0.55} emissive="#7fc8ff" emissiveIntensity={0.35} /></mesh>)}
        {Array.from({ length: 16 }, (_, i) => <sprite key={i} position={[(i - 7.5) * 4.8, 2.4 * flick(i), 2.5]} scale={[4 * flick(i), 7 * flick(i), 1]}><spriteMaterial map={flame} transparent depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>)}
        <pointLight position={[0, 4, 8]} intensity={500} distance={60} color="#ff9a40" />
      </group>
      {/* 2 — the lofty throne; streams of flaming fire come from beneath it (14:18–19) */}
      <group position={[0, 0, -300]}>
        {[0, 1, 2, 3, 4].map((i) => <mesh key={i} position={[0, 1 + i * 2, -40 - i * 4]}><boxGeometry args={[46 - i * 7, 2, 30 - i * 4]} /><meshStandardMaterial color="#dfe9ff" roughness={0.1} metalness={0.4} emissive="#9fc0ff" emissiveIntensity={0.25} /></mesh>)}
        <mesh position={[0, 17, -58]}><boxGeometry args={[12, 16, 8]} /><meshStandardMaterial color="#f4f7ff" roughness={0.1} emissive="#ffffff" emissiveIntensity={0.6 + glory} /></mesh>
        <sprite position={[0, 26, -54]} scale={[70 + 40 * glory, 70 + 40 * glory, 1]}><spriteMaterial map={star} transparent opacity={0.9} depthWrite={false} fog={false} blending={THREE.AdditiveBlending} /></sprite>
        {[-1, 0, 1].map((k) => Array.from({ length: 14 }, (_, i) => <sprite key={`${k}${i}`} position={[k * (4 + i * 1.6), 0.6, -24 + i * 4.2 + ((t * 6 + i) % 4.2)]} scale={[5 * flick(i + k), 2.6, 1]}><spriteMaterial map={flame} transparent depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>))}
        <pointLight position={[0, 6, -10]} intensity={900} distance={90} color="#ffb060" />
        <pointLight position={[0, 30, -50]} intensity={2500 * (0.5 + glory)} distance={160} color="#ffffff" />
      </group>
      {/* 3 — seven mountains of magnificent stones (18:6–8, 24:2) */}
      <group position={[400, 0, 0]}>
        {gems.map((c, i) => <mesh key={c} position={[(i - 3) * 17, 14 + (i === 3 ? 10 : (i % 2) * 4), -70 - Math.abs(i - 3) * 6]}><coneGeometry args={[11, 28 + (i === 3 ? 20 : (i % 2) * 8), 6]} /><meshStandardMaterial color={c} roughness={0.15} metalness={0.4} flatShading emissive={c} emissiveIntensity={0.35} /></mesh>)}
        <pointLight position={[0, 20, -30]} intensity={1200} distance={120} color="#ffe6c0" />
      </group>
      {/* 4 — seven stars bound together, like great burning mountains (18:13–16, 21:3–6) */}
      <group position={[-400, 0, 0]}>
        {Array.from({ length: 7 }, (_, i) => {
          const x = (i - 3) * 13, y = 12 + (i % 2) * 6, z = -60 - Math.abs(i - 3) * 5;
          return (
            <group key={i}>
              <sprite position={[x + Math.sin(t * 2 + i) * 0.5, y, z]} scale={[16 * flick(i), 16 * flick(i), 1]}><spriteMaterial map={star} transparent depthWrite={false} fog={false} blending={THREE.AdditiveBlending} /></sprite>
              <mesh position={[x, y / 2, z]}><cylinderGeometry args={[0.18, 0.18, y, 6]} /><meshStandardMaterial color="#3a3a44" metalness={0.9} roughness={0.4} /></mesh>
              <mesh position={[x, 0.3, z]}><boxGeometry args={[2, 0.6, 2]} /><meshStandardMaterial color="#2a2a33" metalness={0.8} roughness={0.5} /></mesh>
            </group>
          );
        })}
        <pointLight position={[0, 14, -40]} intensity={1500} distance={130} color="#ff7a30" />
      </group>
    </>
  );
};
