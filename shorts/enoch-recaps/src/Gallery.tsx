import { useLoader, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { staticFile } from "remotion";
import sim from "./sim.json";

const G = sim.layout;
type Cam = { pos: number[]; target: number[]; fov: number };

// seeded PRNG: same scene every render
const rng = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

const radial = (stops: [number, string][]) => {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  stops.forEach(([o, col]) => grad.addColorStop(o, col));
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

const CameraRig: React.FC<{ cam: Cam }> = ({ cam }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.fov = cam.fov;
    camera.near = 0.05;
    camera.far = 400;
    camera.position.set(...(cam.pos as [number, number, number]));
    camera.lookAt(...(cam.target as [number, number, number]));
    camera.updateProjectionMatrix();
  }, [camera, cam]);
  return null;
};

// starfield on a far sphere: the "heavens" Hénoch is taken through
const Stars: React.FC = () => {
  const geo = useMemo(() => {
    const r = rng(7), n = 2400, p = new Float32Array(n * 3), c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = r() * 2 - 1, th = r() * Math.PI * 2, s = Math.sqrt(1 - u * u), R = 160;
      p.set([Math.cos(th) * s * R, Math.abs(u) * R * 0.9 + 4, Math.sin(th) * s * R - 20], i * 3);
      const w = 0.55 + r() * 0.45, warm = r() < 0.25;
      c.set(warm ? [w, w * 0.85, w * 0.6] : [w * 0.85, w * 0.9, w], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    return g;
  }, []);
  const dot = useMemo(() => radial([[0, "rgba(255,255,255,1)"], [0.3, "rgba(255,255,255,0.5)"], [1, "rgba(255,255,255,0)"]]), []);
  return <points geometry={geo}><pointsMaterial size={1.1} map={dot} vertexColors transparent depthWrite={false} fog={false} sizeAttenuation /></points>;
};

// embers rising through the hall; position is a pure function of time
const Embers: React.FC<{ t: number; T: number }> = ({ t, T }) => {
  const seeds = useMemo(() => { const r = rng(11); return Array.from({ length: 220 }, () => [r() * 9 - 4.5, r() * 7, -r() * 46 + 6, 0.25 + r() * 0.35, r() * 6.28]); }, []);
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(seeds.length * 3), 3)); return g; }, [seeds]);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  // whole numbers of rises and sways per loop, so the last frame flows into frame 0
  const w = (hz: number) => (Math.max(1, Math.round((hz * T) / (2 * Math.PI))) * 2 * Math.PI) / T;
  seeds.forEach(([x, y, z, v, ph], i) => {
    const rise = (Math.max(1, Math.round((v * T) / 7)) * 7) / T;
    pos.setXYZ(i, x + Math.sin(t * w(0.7) + ph) * 0.35, (y + t * rise) % 7, z + Math.cos(t * w(0.5) + ph) * 0.2);
  });
  pos.needsUpdate = true;
  const dot = useMemo(() => radial([[0, "rgba(255,220,160,1)"], [0.25, "rgba(255,140,40,0.7)"], [1, "rgba(255,80,0,0)"]]), []);
  return <points geometry={geo}><pointsMaterial size={0.09} map={dot} transparent depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation /></points>;
};

const Panel: React.FC<{ p: (typeof G.panels)[number]; tex: THREE.Texture; light: number }> = ({ p, tex, light }) => {
  const pool = useMemo(() => radial([[0, "rgba(255,190,110,0.55)"], [0.4, "rgba(255,150,70,0.18)"], [1, "rgba(0,0,0,0)"]]), []);
  const f = G.frame, W = G.panelW, H = G.panelH;
  const gold = <meshStandardMaterial color="#b48a3c" metalness={0.85} roughness={0.32} />;
  return (
    <group>
      {/* plinth: sits on the floor (y 0 → plinthH) */}
      <mesh position={[p.centre[0], G.plinthH / 2, p.centre[2]]} rotation={[0, p.yaw, 0]}>
        <boxGeometry args={[W + 0.5, G.plinthH, G.plinthD + 0.3]} />
        <meshStandardMaterial color="#3b3630" roughness={0.92} />
      </mesh>
      <group position={p.centre as [number, number, number]} rotation={[0, p.yaw, 0]}>
        <mesh>
          <planeGeometry args={[W, H]} />
          <meshBasicMaterial map={tex} toneMapped={false} color={new THREE.Color(light, light * 0.97, light * 0.93)} />
        </mesh>
        {/* gold frame */}
        <mesh position={[0, H / 2 + f / 2, 0.02]}><boxGeometry args={[W + 2 * f, f, 0.06]} />{gold}</mesh>
        <mesh position={[0, -H / 2 - f / 2, 0.02]}><boxGeometry args={[W + 2 * f, f, 0.06]} />{gold}</mesh>
        <mesh position={[W / 2 + f / 2, 0, 0.02]}><boxGeometry args={[f, H, 0.06]} />{gold}</mesh>
        <mesh position={[-W / 2 - f / 2, 0, 0.02]}><boxGeometry args={[f, H, 0.06]} />{gold}</mesh>
        <mesh position={[0, 0, -0.04]}><boxGeometry args={[W + 2 * f, H + 2 * f, 0.04]} /><meshStandardMaterial color="#14110e" roughness={0.9} /></mesh>
      </group>
      {/* warm pool of light on the floor, brighter for the panel being discussed */}
      <mesh position={[p.centre[0] + p.normal[0] * 1.2, 0.01, p.centre[2] + p.normal[2] * 1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, 5]} />
        <meshBasicMaterial map={pool} transparent opacity={0.35 + 0.65 * (light - 0.5) * 2} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <pointLight position={[p.centre[0] + p.normal[0] * 1.4, 3.6, p.centre[2] + p.normal[2] * 1.4]} color="#ffbf80" intensity={6 + 14 * (light - 0.5) * 2} distance={9} decay={2} />
    </group>
  );
};

export const Gallery: React.FC<{ ep: number; cam: Cam; light: number[]; t: number; T: number }> = ({ ep, cam, light, t, T }) => {
  const urls = useMemo(() => Array.from({ length: 8 }, (_, k) => staticFile(`stills/ep${ep}/0${k + 1}.jpg`)), [ep]);
  const tex = useLoader(THREE.TextureLoader, urls);
  tex.forEach((x) => { x.colorSpace = THREE.SRGBColorSpace; x.anisotropy = 8; });
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => { scene.fog = new THREE.Fog("#07070c", 14, 70); scene.background = new THREE.Color("#030308"); }, [scene]);
  return (
    <>
      <CameraRig cam={cam} />
      <ambientLight intensity={0.25} color="#8a90b0" />
      <hemisphereLight args={["#2a3050", "#0a0806", 0.35]} />
      <Stars />
      {/* polished stone floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -18]}>
        <planeGeometry args={[40, 120]} />
        <meshStandardMaterial color="#121016" roughness={0.38} metalness={0.25} />
      </mesh>
      {/* gold inlay rings mark the rotunda floor */}
      {[G.ringR - 1.6, G.ringR - 1.75, 1.2].map((r, k) => (
        <mesh key={k} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
          <ringGeometry args={[r, r + (k === 1 ? 0.03 : 0.06), 128]} />
          <meshBasicMaterial color="#c89b4a" transparent opacity={0.55} toneMapped={false} />
        </mesh>
      ))}
      {G.panels.map((p, k) => <Panel key={k} p={p} tex={tex[k]} light={light[k]} />)}
      <Embers t={t} T={T} />
    </>
  );
};
