// FORGE (episode 2): a mud-brick workshop at night: hearth, anvil, swords on a rack, sparks.
import { useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { radial, rng, Sky } from "./Sets";
import type { Fx } from "../story/common.ts";

export const Forge: React.FC<{ fx: Fx; t: number }> = ({ fx, t }) => {
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => { scene.fog = new THREE.Fog("#120a06", 12, 60); }, [scene]);
  const ember = useMemo(() => radial([[0, "rgba(255,240,190,1)"], [0.3, "rgba(255,140,40,0.8)"], [1, "rgba(255,60,0,0)"]]), []);
  const sparks = useMemo(() => { const r = rng(77); return Array.from({ length: 90 }, () => [r() * 6.28, 1.5 + r() * 3, r() * 2, r()]); }, []);
  const flicker = 1 + 0.15 * Math.sin(t * 17) + 0.1 * Math.sin(t * 29 + 1);
  const heat = 0.4 + fx.forgeGlow * 0.6;
  return (
    <>
      <Sky tint="#05070f" moon={[-300, 200, -500]} />
      <hemisphereLight args={["#40507a", "#1a0e08", 0.35]} />
      <pointLight position={[-1.6, 1.4, -1.2]} intensity={70 * heat * flicker} distance={14} color="#ff7a2a" />
      <pointLight position={[0.2, 2.6, 1.5]} intensity={12} distance={10} color="#ffd8a8" />
      <pointLight position={[3.0, 2.2, -1.6]} intensity={14} distance={5} color="#ffc890" />
      {/* floor and three walls of the workshop (open toward the camera) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[30, 30]} /><meshStandardMaterial color="#4a3526" roughness={1} /></mesh>
      <mesh position={[0, 2.5, -3.2]}><boxGeometry args={[9, 5, 0.3]} /><meshStandardMaterial color="#7d5c40" roughness={1} /></mesh>
      {[-1, 1].map((sd) => <mesh key={sd} position={[sd * 4.4, 2.5, 0]}><boxGeometry args={[0.3, 5, 6.6]} /><meshStandardMaterial color="#76563b" roughness={1} /></mesh>)}
      {/* hearth */}
      <mesh position={[-1.6, 0.5, -2.4]}><boxGeometry args={[1.6, 1.0, 1.2]} /><meshStandardMaterial color="#3a2a20" roughness={1} /></mesh>
      <mesh position={[-1.6, 1.02, -2.3]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.2, 0.8]} /><meshStandardMaterial color="#2a0a00" emissive="#ff5a10" emissiveIntensity={2.2 * heat * flicker} /></mesh>
      <sprite position={[-1.6, 1.35, -2.2]} scale={[2.2 * heat, 2.2 * heat, 1]}><spriteMaterial map={ember} transparent depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>
      {/* anvil on a stump */}
      <mesh position={[0.4, 0.3, -0.6]}><cylinderGeometry args={[0.32, 0.38, 0.6, 16]} /><meshStandardMaterial color="#5a3d26" roughness={1} /></mesh>
      <group position={[0.4, 0.72, -0.6]}>
        <mesh><boxGeometry args={[0.7, 0.22, 0.3]} /><meshStandardMaterial color="#3c3c40" metalness={0.85} roughness={0.35} /></mesh>
        <mesh position={[0.42, 0.04, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.1, 0.3, 12]} /><meshStandardMaterial color="#3c3c40" metalness={0.85} roughness={0.35} /></mesh>
        {/* glowing blade being hammered */}
        <mesh position={[0, 0.13, 0]} rotation={[0, 0.2, 0]}><boxGeometry args={[0.8, 0.02, 0.08]} /><meshStandardMaterial color="#331000" emissive="#ff6a1a" emissiveIntensity={1.5 * heat} /></mesh>
      </group>
      {/* weapon rack: swords and shields (1 Hénoch 8:1) */}
      {Array.from({ length: 5 }, (_, i) => (
        <group key={i} position={[2.4 + i * 0.32, 1.2, -2.9]} rotation={[0, 0, 0.05]}>
          <mesh><boxGeometry args={[0.06, 1.3, 0.015]} /><meshStandardMaterial color="#c9ccd2" metalness={0.6} roughness={0.25} emissive="#ff9a50" emissiveIntensity={0.18} /></mesh>
          <mesh position={[0, -0.6, 0]}><boxGeometry args={[0.24, 0.05, 0.04]} /><meshStandardMaterial color="#b08a3c" metalness={0.7} roughness={0.35} /></mesh>
        </group>
      ))}
      {[0, 1].map((i) => <mesh key={i} position={[-3.6, 1.6 + i * 1.1, -1.4 + i * 0.9]} rotation={[0, Math.PI / 2, 0]}><cylinderGeometry args={[0.45, 0.45, 0.06, 24]} /><meshStandardMaterial color="#8a6a3a" metalness={0.6} roughness={0.4} /></mesh>)}
      {/* sparks off the anvil on every hammer blow */}
      {fx.sparks > 0 && sparks.map(([a, v, d, ph], i) => {
        const age = (t * 2 + ph) % 1; const x = 0.4 + Math.cos(a) * v * age * 0.6, z = -0.6 + Math.sin(a) * v * age * 0.6, y = 0.85 + d * age - 2.5 * age * age;
        return y > 0 ? <sprite key={i} position={[x, y, z]} scale={[0.06, 0.06, 1]}><spriteMaterial map={ember} transparent opacity={(1 - age) * fx.sparks} depthWrite={false} blending={THREE.AdditiveBlending} /></sprite> : null;
      })}
    </>
  );
};
