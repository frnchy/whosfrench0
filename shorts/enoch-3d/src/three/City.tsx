// CITY (what-if episode): a modern street at night — towers with lit windows, a supermarket, streetlights,
// Hermon glowing on the horizon, and the four archangels' pillars of light.
import { useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Constellation, Cries, radial, rng, Sky } from "./Sets";
import type { Fx } from "../story/common.ts";

const windowsTex = (seed: number) => {
  const c = document.createElement("canvas"); c.width = 64; c.height = 256;
  const g = c.getContext("2d")!, r = rng(seed);
  g.fillStyle = "#14161f"; g.fillRect(0, 0, 64, 256);
  for (let y = 4; y < 256; y += 10) for (let x = 4; x < 64; x += 10) {
    const lit = r() < 0.45; g.fillStyle = lit ? (r() < 0.7 ? "#ffd89a" : "#9fd0ff") : "#1d212c"; g.fillRect(x, y, 6, 6);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
};
const signTex = () => {
  const c = document.createElement("canvas"); c.width = 512; c.height = 96;
  const g = c.getContext("2d")!; g.fillStyle = "#0b3d1f"; g.fillRect(0, 0, 512, 96);
  g.font = "bold 62px sans-serif"; g.fillStyle = "#e9ffe9"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("SUPERMARCHÉ", 256, 50);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};

export const City: React.FC<{ fx: Fx; t: number }> = ({ fx, t }) => {
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => { scene.fog = new THREE.Fog("#0d1222", 120, 3200); }, [scene]);
  const texs = useMemo(() => [1, 2, 3].map(windowsTex), []);
  const sign = useMemo(signTex, []);
  const towers = useMemo(() => {
    const r = rng(41), out: number[][] = [];
    for (let i = 0; i < 40; i++) {
      const side = i % 2 ? 1 : -1, x = side * (14 + r() * 40), z = -10 - r() * 260;
      out.push([x, z, 8 + r() * 10, 20 + r() * 70, 8 + r() * 10, Math.floor(r() * 3)]);
    }
    return out;
  }, []);
  const glow = useMemo(() => radial([[0, "rgba(255,220,150,0.95)"], [0.25, "rgba(255,160,70,0.4)"], [1, "rgba(0,0,0,0)"]]), []);
  const beam = useMemo(() => radial([[0, "rgba(255,250,230,1)"], [0.4, "rgba(255,240,200,0.5)"], [1, "rgba(0,0,0,0)"]]), []);
  const lights = fx.storeLights ?? 1;
  const pillar = fx.pillars ?? 0;
  const PILLARS: [number, number][] = [[0.95, -0.5], [-30, -60], [35, -90], [-12, -150]];
  return (
    <>
      <Sky tint="#070a16" moon={[-300, 260, -600]} />
      <hemisphereLight args={["#5f72b0", "#1a1410", 0.6 + pillar * 1.2]} />
      <directionalLight position={[-300, 260, -600]} intensity={0.6} color="#b9c8ff" />
      <directionalLight position={[20, 25, 60]} intensity={0.45} color="#c9d4ff" />
      <directionalLight position={[300, 500, 400]} intensity={1.1} color="#ffd2a8" />
      {/* street, sidewalks, lane markings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -300]}><planeGeometry args={[2000, 2000]} /><meshStandardMaterial color="#2a2c33" roughness={0.9} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -150]}><planeGeometry args={[12, 400]} /><meshStandardMaterial color="#1b1d22" roughness={0.6} metalness={0.2} /></mesh>
      {Array.from({ length: 30 }, (_, i) => <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 5 - i * 12]}><planeGeometry args={[0.25, 4]} /><meshBasicMaterial color="#d9c27a" /></mesh>)}
      {towers.map(([x, z, w, h, d, k], i) => (
        <mesh key={i} position={[x, h / 2, z]}><boxGeometry args={[w, h, d]} /><meshStandardMaterial color="#1a1d27" emissive="#ffffff" emissiveMap={texs[k]} emissiveIntensity={0.9 * lights} roughness={0.8} /></mesh>
      ))}
      {/* the supermarket */}
      <group position={[-11, 0, -18]} rotation={[0, 0.5, 0]}>
        <mesh position={[0, 3, 0]}><boxGeometry args={[16, 6, 10]} /><meshStandardMaterial color="#3a3f4a" roughness={0.8} /></mesh>
        <mesh position={[0, 6.6, 5.06]}><planeGeometry args={[9, 1.7]} /><meshBasicMaterial map={sign} color={new THREE.Color(lights, lights, lights)} toneMapped={false} /></mesh>
        <mesh position={[0, 1.6, 5.02]}><planeGeometry args={[12, 3]} /><meshStandardMaterial color="#0d1015" emissive="#fff3d0" emissiveIntensity={1.2 * lights} /></mesh>
      </group>
      {[-6, 6].map((x) => [0, -20, -40, -60].map((z) => (
        <group key={`${x}${z}`} position={[x, 0, z]}>
          <mesh position={[0, 3, 0]}><cylinderGeometry args={[0.08, 0.1, 6, 8]} /><meshStandardMaterial color="#444" metalness={0.6} /></mesh>
          <mesh position={[0, 6, 0]}><sphereGeometry args={[0.25, 12, 8]} /><meshBasicMaterial color={lights > 0.5 ? "#ffd9a0" : "#333"} /></mesh>
          {lights > 0.5 && <pointLight position={[0, 5.8, 0]} intensity={30 * lights} distance={14} color="#ffc98a" />}
        </group>
      )))}
      {/* Hermon on the horizon, glowing where the 200 landed */}
      <mesh position={[60, 0, -1200]}><coneGeometry args={[420, 330, 9]} /><meshStandardMaterial color="#1a2033" roughness={1} emissive="#ffb060" emissiveIntensity={(fx.mountainGlow ?? 0) * 0.06} /></mesh>
      {fx.mountainGlow > 0 && <sprite position={[60, 360, -1190]} scale={[500, 500, 1]}><spriteMaterial map={glow} transparent opacity={0.8} depthWrite={false} fog={false} blending={THREE.AdditiveBlending} /></sprite>}
      {fx.constellation > 0 && <Constellation k={fx.constellation} />}
      {fx.cries > 0 && <Cries t={t} k={fx.cries} />}
      {fx.fight > 0 && <pointLight position={[2, 3, -6]} intensity={(60 + 40 * Math.sin(t * 19)) * fx.fight} distance={30} color="#ff5a1a" />}
      {/* four archangels arrive as pillars of light */}
      {pillar > 0 && PILLARS.map(([x, z], i) => {
        const k = Math.min(1, Math.max(0, pillar * 1.6 - i * 0.2));
        return k > 0 ? (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, 400 - 400 * k + 200, 0]}><cylinderGeometry args={[1.4, 2.4, 400, 24, 1, true]} /><meshBasicMaterial color="#fff2cc" transparent opacity={0.55 * k} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} /></mesh>
            <sprite position={[0, 1.5, 0]} scale={[12 * k, 12 * k, 1]}><spriteMaterial map={beam} transparent depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>
            <pointLight position={[0, 3, 0]} intensity={300 * k} distance={40} color="#fff0cc" />
          </group>
        ) : null;
      })}
    </>
  );
};
