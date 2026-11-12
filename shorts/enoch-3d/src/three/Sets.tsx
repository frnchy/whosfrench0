import { useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { hermonHeight, SUMMIT_Y } from "../story/common.ts";
import type { Cam, Fx } from "../story/common.ts";

export const rng = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const canvasTex = (draw: (g: CanvasRenderingContext2D, s: number) => void, size = 256) => {
  const c = document.createElement("canvas"); c.width = c.height = size; draw(c.getContext("2d")!, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};
export const radial = (stops: [number, string][]) => canvasTex((g, s) => { const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); stops.forEach(([o, c]) => gr.addColorStop(o, c)); g.fillStyle = gr; g.fillRect(0, 0, s, s); });
// soft puff for clouds, with lumpy edges
const puffTex = () => canvasTex((g, s) => {
  const r = rng(5);
  for (let i = 0; i < 26; i++) {
    const x = s / 2 + (r() - 0.5) * s * 0.5, y = s / 2 + (r() - 0.5) * s * 0.3, rad = s * (0.12 + r() * 0.2);
    const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, s, s);
  }
});

export const CameraRig: React.FC<{ cam: Cam }> = ({ cam }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.fov = cam.fov; camera.near = 0.03; camera.far = 3000;
    camera.position.set(...cam.pos); camera.lookAt(...cam.target); camera.updateProjectionMatrix();
  }, [camera, cam]);
  return null;
};

export const Sky: React.FC<{ tint?: string; moon?: [number, number, number] }> = ({ tint = "#060914", moon = [-120, 260, 420] }) => {
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => { scene.background = new THREE.Color(tint); }, [scene, tint]);
  const geo = useMemo(() => {
    const r = rng(9), n = 3500, p = new Float32Array(n * 3), c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = r() * 1.6 - 0.6, th = r() * 6.283, s = Math.sqrt(1 - u * u), R = 1500;
      p.set([Math.cos(th) * s * R, u * R, Math.sin(th) * s * R], i * 3);
      const w = 0.45 + r() * 0.55, warm = r() < 0.2; c.set(warm ? [w, w * 0.85, w * 0.65] : [w * 0.85, w * 0.92, w], i * 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); g.setAttribute("color", new THREE.BufferAttribute(c, 3)); return g;
  }, []);
  const dot = useMemo(() => radial([[0, "#fff"], [0.3, "rgba(255,255,255,0.5)"], [1, "rgba(255,255,255,0)"]]), []);
  const glow = useMemo(() => radial([[0, "rgba(220,230,255,0.9)"], [0.15, "rgba(170,190,255,0.35)"], [1, "rgba(0,0,0,0)"]]), []);
  return (
    <>
      <points geometry={geo}><pointsMaterial size={7} map={dot} vertexColors transparent depthWrite={false} fog={false} sizeAttenuation /></points>
      <mesh position={moon}><sphereGeometry args={[22, 32, 24]} /><meshBasicMaterial color="#f2efe4" fog={false} /></mesh>
      <sprite position={moon} scale={[260, 260, 1]}><spriteMaterial map={glow} transparent depthWrite={false} fog={false} blending={THREE.AdditiveBlending} /></sprite>
    </>
  );
};

// ---------- HEAVEN: a sea of moonlit clouds; an opening at +z shows the Earth's lamps far below ----------
export const Heaven: React.FC<{ fx: Fx; t: number }> = ({ fx, t }) => {
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => { scene.fog = new THREE.Fog("#0b1224", 30, 220); }, [scene]);
  const puff = useMemo(puffTex, []);
  const puffs = useMemo(() => {
    const r = rng(21), out: [number, number, number, number, number][] = [];
    for (let i = 0; i < 520; i++) {
      const x = (r() - 0.5) * 260, z = (r() - 0.5) * 260 - 30;
      if (z > 3 && z < 70 && Math.abs(x) < 26 + (z - 3) * 0.6) continue;   // the opening in front of the Watchers
      out.push([x, 0.1 + r() * 0.5, z, 2.5 + r() * 4, r()]);
    }
    return out;
  }, []);
  const lamps = useMemo(() => {
    const r = rng(33), n = 900, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const cl = Math.floor(r() * 9); const cx = (cl % 3 - 1) * 70, cz = 60 + Math.floor(cl / 3) * 45; p.set([cx + (r() - 0.5) * 40, -180, cz + (r() - 0.5) * 30], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); return g;
  }, []);
  const lampTex = useMemo(() => radial([[0, "rgba(255,210,140,1)"], [0.3, "rgba(255,150,60,0.5)"], [1, "rgba(0,0,0,0)"]]), []);
  const feathers = useMemo(() => { const r = rng(44); return Array.from({ length: 40 }, () => [(r() - 0.5) * 30, r() * 6, -r() * 30, r() * 6.28]); }, []);
  return (
    <>
      <Sky />
      <hemisphereLight args={["#9fb4ff", "#1a1f33", 0.55]} />
      <directionalLight position={[-60, 120, 160]} intensity={1.3} color="#cfdcff" />
      <directionalLight position={[20, 30, -80]} intensity={2.4} color="#8fb0ff" />
      <pointLight position={[0, -4, 10]} intensity={60} distance={30} color="#ffb070" />  {/* warm light rising from the Earth's lamps */}
      <ambientLight intensity={0.12 + fx.flash * 2.5} color="#ffffff" />
      {/* the cloud floor the Watchers stand on (opaque except the opening) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -60]}><planeGeometry args={[400, 126]} /><meshStandardMaterial color="#8e9cc2" roughness={1} /></mesh>
      {[-1, 1].map((sd) => <mesh key={sd} rotation={[-Math.PI / 2, 0, 0]} position={[sd * 135, -0.02, 60]}><planeGeometry args={[190, 120]} /><meshStandardMaterial color="#8e9cc2" roughness={1} /></mesh>)}
      {puffs.map(([x, y, z, sz, ph], i) => (
        <sprite key={i} position={[x + Math.sin(t * 0.05 + ph * 6) * 1.5, y, z]} scale={[sz * 2.2, sz * 0.6, 1]}>
          <spriteMaterial map={puff} color="#b9c6e6" transparent depthWrite={false} opacity={0.55} />
        </sprite>
      ))}
      <points geometry={lamps}><pointsMaterial size={2.4 + 3 * (fx.blood ?? 0)} color={fx.blood ? "#ff2a1a" : "#ffffff"} map={lampTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation fog={false} /></points>
      {fx.crowd > 0 && <Crowd t={t} raise={fx.crowdRaise} look={fx.crowdLook} />}
      {(fx.blood ?? 0) > 0 && <pointLight position={[0, -6, 14]} intensity={160 * (fx.blood ?? 0)} distance={40} color="#ff2a1a" />}
      {(fx.glory ?? 0) > 0 && <><sprite position={[0, 26, -70]} scale={[90 * (fx.glory ?? 0), 90 * (fx.glory ?? 0), 1]}><spriteMaterial map={lampTex} color="#ffffff" transparent opacity={0.95} depthWrite={false} fog={false} blending={THREE.AdditiveBlending} /></sprite><pointLight position={[0, 14, -30]} intensity={900 * (fx.glory ?? 0)} distance={90} color="#fff4d8" /></>}
      {fx.feathers > 0 && feathers.map(([x, y, z, ph], i) => (
        <mesh key={i} position={[x + Math.sin(t * 0.6 + ph) * 0.8, (y - t * 0.25 + 60) % 6 + 0.2, z]} rotation={[t * 0.7 + ph, ph, Math.sin(t + ph)]}>
          <planeGeometry args={[0.08, 0.32]} /><meshStandardMaterial color="#fffaf0" emissive="#fff4dd" emissiveIntensity={0.6} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </>
  );
};

// ---------- crowd of Watchers (instanced): body, head, glowing eyes that turn, wings ----------
export const Crowd: React.FC<{ t: number; raise: number; look: number; ring?: { r: number; y: (x: number, z: number) => number; n: number } }> = ({ t, raise, look, ring }) => {
  const spots = useMemo(() => {
    const r = rng(3), out: { p: THREE.Vector3; yaw: number; s: number }[] = [];
    if (ring) {
      for (let i = 0; i < ring.n; i++) { const a = (i / ring.n) * Math.PI * 2, rr = ring.r + (i % 3) * 1.6 + r() * 0.6; const x = Math.sin(a) * rr, z = Math.cos(a) * rr; out.push({ p: new THREE.Vector3(x, ring.y(x, z), z), yaw: Math.atan2(-x, -z), s: 2.1 + r() * 0.25 }); }
    } else {
      for (let row = 0; row < 12; row++) for (let i = 0; i < 17; i++) {
        const x = (i - 8) * 2.6 + (row % 2) * 1.3 + (r() - 0.5) * 0.5, z = -4.2 - row * 2.1 + (r() - 0.5) * 0.4;
        if (Math.abs(x) < 3.4 && z > -6) continue;   // leave room for the named characters
        out.push({ p: new THREE.Vector3(x, 0, z), yaw: (r() - 0.5) * 0.2, s: 2.05 + r() * 0.3 });
      }
    }
    return out;
  }, [ring]);
  const robe = useMemo(() => { const g = new THREE.CylinderGeometry(0.1, 0.18, 0.6, 16, 1, true); g.translate(0, 0.3, 0); return g; }, []);
  const body = useMemo(() => { const g = new THREE.CapsuleGeometry(0.095, 0.15, 6, 14); g.translate(0, 0.68, 0); return g; }, []);
  const headG = useMemo(() => { const g = new THREE.SphereGeometry(0.068, 18, 14); g.translate(0, 0.9, 0); return g; }, []);
  const eyeG = useMemo(() => new THREE.SphereGeometry(0.011, 8, 6), []);
  const wingG = useMemo(() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(0.35, 0.25, 0.55, 0.05); s.quadraticCurveTo(0.35, -0.15, 0.25, -0.5); s.quadraticCurveTo(0.1, -0.3, 0, 0); return new THREE.ShapeGeometry(s, 6); }, []);
  const armG = useMemo(() => { const g = new THREE.CapsuleGeometry(0.03, 0.3, 4, 8); g.translate(0, 0.17, 0); return g; }, []);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3();
  const set = (mesh: THREE.InstancedMesh | null, f: (i: number, o: (typeof spots)[number]) => THREE.Matrix4) => { if (!mesh) return; spots.forEach((o, i) => mesh.setMatrixAt(i, f(i, o))); mesh.instanceMatrix.needsUpdate = true; };
  const base = (o: (typeof spots)[number], extraYaw = 0) => { e.set(0, o.yaw + extraYaw, 0); q.setFromEuler(e); one.set(o.s, o.s, o.s); return m.compose(o.p, q, one).clone(); };
  const headTurn = (i: number) => (i % 2 ? 1 : -1) * look * 0.9 * (0.6 + (i % 5) * 0.1);   // F: everyone turns toward the nervous one
  return (
    <>
      <instancedMesh args={[robe, undefined, spots.length]} ref={(x) => set(x, (_, o) => base(o))}><meshStandardMaterial color="#e6e0d0" roughness={0.8} side={THREE.DoubleSide} /></instancedMesh>
      <instancedMesh args={[body, undefined, spots.length]} ref={(x) => set(x, (_, o) => base(o))}><meshStandardMaterial color="#ddd5c2" roughness={0.8} /></instancedMesh>
      <instancedMesh args={[headG, undefined, spots.length]} ref={(x) => set(x, (_, o) => base(o))}><meshStandardMaterial color="#b98c68" roughness={0.6} /></instancedMesh>
      {[-1, 1].map((sd) => (
        <instancedMesh key={"e" + sd} args={[eyeG, undefined, spots.length]} ref={(x) => set(x, (i, o) => {
          const yaw = o.yaw + headTurn(i), lp = new THREE.Vector3(sd * 0.022, 0.912, 0.06).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).multiplyScalar(o.s).add(o.p);
          return m.compose(lp, q.identity(), new THREE.Vector3(o.s, o.s, o.s)).clone();
        })}><meshBasicMaterial color="#ffd27a" /></instancedMesh>
      ))}
      {[-1, 1].map((sd) => (
        <instancedMesh key={"w" + sd} args={[wingG, undefined, spots.length]} ref={(x) => set(x, (i, o) => {
          e.set(0.1, o.yaw + sd * (0.4 - raise * 0.3) + (sd < 0 ? Math.PI : 0), (0.35 + raise * 0.6 + Math.sin(t * 1.5 + i) * 0.03)); q.setFromEuler(e);
          const lp = new THREE.Vector3(sd * 0.05, 0.76, -0.08).applyAxisAngle(new THREE.Vector3(0, 1, 0), o.yaw).multiplyScalar(o.s).add(o.p);
          return m.compose(lp, q, new THREE.Vector3(o.s * 0.85, o.s * 0.85, o.s)).clone();
        })}><meshStandardMaterial color="#d9d3c6" emissive="#f4efe2" emissiveIntensity={0.08} side={THREE.DoubleSide} /></instancedMesh>
      ))}
      <instancedMesh args={[armG, undefined, spots.length]} ref={(x) => set(x, (i, o) => {
        e.set(0, o.yaw, Math.PI - raise * (2.6 + (i % 3) * 0.1) + (1 - raise) * Math.PI); q.setFromEuler(e);
        const lp = new THREE.Vector3(0.13, 0.77, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), o.yaw).multiplyScalar(o.s).add(o.p);
        return m.compose(lp, q, new THREE.Vector3(o.s, o.s, o.s)).clone();
      })}><meshStandardMaterial color="#ddd5c2" roughness={0.8} /></instancedMesh>
    </>
  );
};

// ---------- MOUNT HERMON at night: ridged massif, snow above 30 m, storm on the summit ----------
export const Mountain: React.FC<{ fx: Fx; t: number }> = ({ fx, t }) => {
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => { scene.fog = new THREE.Fog("#0e1630", 160, 1100); }, [scene]);
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(900, 900, 260, 260); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3);
    const rock = new THREE.Color("#4a4440"), grass = new THREE.Color("#2c3324"), snow = new THREE.Color("#e8eef8"), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = hermonHeight(x, z); p.setY(i, y);
      const k = Math.min(1, Math.max(0, (y - 26) / 8)); c.copy(y < 10 ? grass : rock).lerp(snow, k); col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
  }, []);
  const streakTex = useMemo(() => canvasTex((g, s) => { const gr = g.createLinearGradient(0, 0, 0, s); gr.addColorStop(0, "rgba(255,240,200,0)"); gr.addColorStop(0.85, "rgba(255,220,150,0.9)"); gr.addColorStop(1, "rgba(255,255,255,1)"); g.fillStyle = gr; g.fillRect(s * 0.35, 0, s * 0.3, s); }), []);
  const streaks = useMemo(() => { const r = rng(17); return Array.from({ length: 70 }, () => ({ x: (r() - 0.5) * 16, z: (r() - 0.5) * 16, sx: (r() - 0.5) * 260, sz: (r() - 0.5) * 160 + 20, d: r() * 0.45 })); }, []);
  const ringTex = useMemo(() => radial([[0, "rgba(255,255,255,0)"], [0.75, "rgba(255,230,170,0)"], [0.9, "rgba(255,230,170,0.95)"], [1, "rgba(255,230,170,0)"]]), []);
  const bolt = useMemo(() => { const r = rng(Math.floor(t * 7) + 1), pts: THREE.Vector3[] = []; let x = (r() - 0.5) * 30, y = SUMMIT_Y + 120, z = -20 + (r() - 0.5) * 30; for (let i = 0; i < 14; i++) { pts.push(new THREE.Vector3(x, y, z)); x += (r() - 0.5) * 6; z += (r() - 0.5) * 6; y -= 120 / 14; } return new THREE.BufferGeometry().setFromPoints(pts); }, [Math.floor(t * 7)]);
  return (
    <>
      <Sky tint="#070b18" moon={[260, 300, -500]} />
      <hemisphereLight args={["#8ea4e0", "#1c1820", 1.0 + fx.flash * 3 + fx.lightning * 1.5]} />
      <directionalLight position={[260, 300, -400]} intensity={2.4} color="#c8d6ff" />
      <directionalLight position={[-200, 120, 300]} intensity={0.7} color="#6f7fb8" />
      <mesh geometry={geo}><meshStandardMaterial vertexColors roughness={0.95} flatShading /></mesh>
      {/* storm clouds swirling over the summit */}
      <group position={[0, SUMMIT_Y + 60, 0]} rotation={[0, t * 0.15, 0]}>
        {Array.from({ length: 24 }, (_, i) => <mesh key={i} position={[Math.cos(i * 0.9) * (30 + (i % 4) * 14), (i % 3) * 6, Math.sin(i * 0.9) * (30 + (i % 4) * 14)]} scale={[20, 6, 20]}><sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color="#2a3048" roughness={1} emissive="#a9b8ff" emissiveIntensity={fx.lightning * 0.6} /></mesh>)}
      </group>
      {fx.lightning > 0.55 && <lineSegments geometry={bolt}><lineBasicMaterial color="#e8eeff" /></lineSegments>}
      {fx.lightning > 0.55 && <pointLight position={[0, SUMMIT_Y + 40, -20]} intensity={4000 * fx.lightning} distance={200} color="#c6d4ff" />}
      {/* the 200 falling like stars onto the summit */}
      {fx.streaks > 0 && streaks.map((s, i) => {
        const k = Math.min(1, Math.max(0, (fx.streaks - s.d) / 0.5)); if (k <= 0 || k >= 1) return null;
        const pos = new THREE.Vector3(s.sx, SUMMIT_Y + 300, s.sz).lerp(new THREE.Vector3(s.x, SUMMIT_Y + 1, s.z), k * k);
        return <sprite key={i} position={pos} scale={[5, 46, 1]}><spriteMaterial map={streakTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>;
      })}
      {fx.streaks > 0.4 && <pointLight position={[0, SUMMIT_Y + 4, 0]} intensity={900 * fx.streaks} distance={80} color="#ffd08a" />}
      {fx.crowdRaise > 0 && <Crowd t={t} raise={fx.crowdRaise} look={0} ring={{ r: 10.5, y: hermonHeight, n: 46 }} />}
      <pointLight position={[0, SUMMIT_Y + 3.5, 0]} intensity={140 + fx.pillar * 3000} distance={40} color="#ffd9a0" />
      {fx.pillar > 0 && <mesh position={[0, SUMMIT_Y + 150, 0]}><cylinderGeometry args={[1.6, 3.2, 300, 32, 1, true]} /><meshBasicMaterial color="#ffe7b8" transparent opacity={0.55 * fx.pillar} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} /></mesh>}
      {fx.shock > 0 && fx.shock < 1 && <mesh position={[0, SUMMIT_Y + 1.5, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[8 + fx.shock * 260, 8 + fx.shock * 260, 1]}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={ringTex} transparent opacity={1 - fx.shock} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>}
    </>
  );
};

// ---------- VILLAGE by the river at dusk/night ----------
export const Village: React.FC<{ fx: Fx; t: number; night: boolean }> = ({ fx, t, night }) => {
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => { scene.fog = new THREE.Fog(night ? "#0b1020" : "#6a4a50", 40, night ? 520 : 260); }, [scene, night]);
  const houses = useMemo(() => { const r = rng(8), out: number[][] = []; for (let i = 0; i < 26; i++) { const x = (r() - 0.5) * 50, z = -12 - r() * 40; if (Math.abs(x) < 4) continue; out.push([x, z, 3 + r() * 3, 2.4 + r() * 1.6, 3 + r() * 3, r()]); } for (let i = 0; i < 10; i++) out.push([(r() - 0.5) * 40, 10 + r() * 20, 3 + r() * 2.5, 2.4 + r(), 3 + r() * 2, r()]); return out; }, []);
  const palms = useMemo(() => { const r = rng(12); return Array.from({ length: 16 }, () => [(r() - 0.5) * 60, -6 - r() * 30, 5 + r() * 3, r() * 6]); }, []);
  const mount = useMemo(() => { const g = new THREE.ConeGeometry(110, 70, 9, 1); g.translate(0, 35, 0); return g; }, []);
  const glow = useMemo(() => radial([[0, "rgba(255,220,150,0.95)"], [0.25, "rgba(255,160,70,0.4)"], [1, "rgba(0,0,0,0)"]]), []);
  return (
    <>
      <Sky tint={night ? "#060a16" : "#22182a"} moon={[-200, 180, -300]} />
      <hemisphereLight args={[night ? "#6a80c0" : "#ffd2a8", "#3a2a1a", night ? 0.7 : 1.5]} />
      <directionalLight position={night ? [-200, 180, -300] : [-120, 30, -200]} intensity={night ? 0.8 : 1.4} color={night ? "#b9c8ff" : "#ffb070"} />
      <directionalLight position={[20, 25, 60]} intensity={night ? 0.35 : 1.0} color={night ? "#9fb0e0" : "#ffd9b8"} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -40]}><planeGeometry args={[600, 600]} /><meshStandardMaterial color="#a8865e" roughness={1} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, -9]}><planeGeometry args={[600, 5]} /><meshStandardMaterial color={night ? "#1d2c48" : "#4a5c7a"} roughness={0.15} metalness={0.4} /></mesh>
      {houses.map(([x, z, w, h, d, ph], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, ph * 0.6 - 0.3, 0]}>
          <mesh position={[0, h / 2, 0]}><boxGeometry args={[w, h, d]} /><meshStandardMaterial color="#b08a62" roughness={0.95} /></mesh>
          <mesh position={[0, h + 0.1, 0]}><boxGeometry args={[w + 0.3, 0.2, d + 0.3]} /><meshStandardMaterial color="#7c6045" roughness={1} /></mesh>
          <mesh position={[0, 0.8, d / 2 + 0.01]}><planeGeometry args={[0.8, 1.6]} /><meshStandardMaterial color="#2a1c12" emissive="#ff9a40" emissiveIntensity={night ? 0.9 : 0.15} /></mesh>
          <mesh position={[w / 4, h * 0.65, d / 2 + 0.01]}><planeGeometry args={[0.45, 0.4]} /><meshStandardMaterial color="#2a1c12" emissive="#ffb060" emissiveIntensity={night ? 1.6 : 0.3} /></mesh>
        </group>
      ))}
      {palms.map(([x, z, h, ph], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, h / 2, 0]} rotation={[0, 0, Math.sin(ph) * 0.08]}><cylinderGeometry args={[0.16, 0.24, h, 8]} /><meshStandardMaterial color="#5c4430" roughness={1} /></mesh>
          {Array.from({ length: 8 }, (_, k) => <mesh key={k} position={[0, h, 0]} rotation={[0.9 + Math.sin(t * 0.8 + k + ph) * 0.04, (k / 8) * 6.28 + ph, 0]}><boxGeometry args={[0.35, 0.03, 3.2]} /><meshStandardMaterial color="#3d5a2a" roughness={0.9} /></mesh>)}
        </group>
      ))}
      {/* Hermon on the horizon; it glows once the Watchers have landed */}
      <mesh geometry={mount} position={[20, 0, -260]}><meshStandardMaterial color="#1c2133" roughness={1} emissive="#ffb060" emissiveIntensity={fx.mountainGlow * 0.08} /></mesh>
      {fx.mountainGlow > 0 && <sprite position={[20, 75, -255]} scale={[120, 120, 1]}><spriteMaterial map={glow} transparent opacity={0.75 + 0.2 * Math.sin(t * 3)} depthWrite={false} fog={false} blending={THREE.AdditiveBlending} /></sprite>}
      {[-6, 5, -14, 12].map((x, i) => <pointLight key={i} position={[x, 2.2, -10 - i * 6]} intensity={night ? 40 : 8} distance={14} color="#ff9a40" />)}
      {(fx.ark ?? 0) > 0 && <Ark k={fx.ark ?? 0} />}
      {(fx.rain ?? 0) > 0 && <Rain t={t} k={fx.rain ?? 0} />}
      {(fx.pillar ?? 0) > 0 && <><mesh position={[1.1, 150, -0.4]}><cylinderGeometry args={[0.9, 1.6, 300, 24, 1, true]} /><meshBasicMaterial color="#ffe9b0" transparent opacity={0.5 * fx.pillar} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} /></mesh><pointLight position={[1.1, 3, 0.6]} intensity={120 * fx.pillar} distance={18} color="#ffe2a8" /></>}
      {fx.constellation > 0 && <Constellation k={fx.constellation} />}
      {fx.cries > 0 && <Cries t={t} k={fx.cries} />}
      {fx.fight > 0 && <pointLight position={[0.5, 1.2, 1.5]} intensity={(40 + 30 * Math.sin(t * 19) + 20 * Math.sin(t * 31)) * fx.fight} distance={12} color="#ff5a1a" />}
    </>
  );
};

// Kokabiel's lesson: a constellation drawn star by star (episode 2)
const STARS: [number, number, number][] = [[-60, 140, -220], [-30, 165, -230], [0, 150, -235], [25, 175, -225], [55, 160, -220], [10, 120, -230], [-20, 105, -228]];
export const Constellation: React.FC<{ k: number }> = ({ k }) => {
  const dot = useMemo(() => radial([[0, "rgba(255,255,255,1)"], [0.25, "rgba(200,170,255,0.8)"], [1, "rgba(0,0,0,0)"]]), []);
  const order = [0, 1, 2, 3, 4, 2, 5, 6, 0];
  const n = Math.max(2, Math.floor(1 + k * (order.length - 1)));
  const pts = order.slice(0, n).map((i) => new THREE.Vector3(...STARS[i]));
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  return (
    <>
      {STARS.map((p, i) => <sprite key={i} position={p} scale={[14 * Math.min(1, k * 3), 14 * Math.min(1, k * 3), 1]}><spriteMaterial map={dot} transparent depthWrite={false} fog={false} blending={THREE.AdditiveBlending} /></sprite>)}
      <line>
        <primitive object={geo} attach="geometry" />
        <lineBasicMaterial color="#c9a6ff" transparent opacity={0.9} fog={false} />
      </line>
    </>
  );
};
// the cry of the earth rising to heaven (1 Hénoch 8:4): embers of light drifting up from the village
export const Cries: React.FC<{ t: number; k: number }> = ({ t, k }) => {
  const seeds = useMemo(() => { const r = rng(91); return Array.from({ length: 140 }, () => [(r() - 0.5) * 40, -12 - r() * 30, r() * 60, 3 + r() * 5]); }, []);
  const dot = useMemo(() => radial([[0, "rgba(255,230,200,1)"], [0.3, "rgba(255,170,90,0.6)"], [1, "rgba(0,0,0,0)"]]), []);
  return <>{seeds.map(([x, z, y0, v], i) => <sprite key={i} position={[x + Math.sin(t + i) * 0.6, ((y0 + t * v) % 70) + 1, z]} scale={[1.8, 1.8, 1]}><spriteMaterial map={dot} transparent opacity={k} depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>)}</>;
};

// Noah's ark going up rib by rib (episode 8) — the boat itself is from Genesis, noted in research.md
const Ark: React.FC<{ k: number }> = ({ k }) => {
  const wood = <meshStandardMaterial color="#6b4a2c" roughness={0.9} />;
  const n = 13, shown = Math.max(1, Math.round(k * n));
  return (
    <group position={[9, 0, -3]} rotation={[0, -0.5, 0]}>
      <mesh position={[0, 0.25, 0]}><boxGeometry args={[18, 0.5, 0.6]} />{wood}</mesh>
      {Array.from({ length: shown }, (_, i) => {
        const x = (i - (n - 1) / 2) * 1.35, w = 3.2 * Math.sin(((i + 1) / (n + 1)) * Math.PI) + 0.8;
        return <mesh key={i} position={[x, 2.2, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[w, 0.14, 6, 20, Math.PI]} />{wood}</mesh>;
      })}
      {k > 0.6 && [0.9, 1.9].map((y) => <mesh key={y} position={[0, y, 2.6]}><boxGeometry args={[15 * Math.min(1, (k - 0.6) / 0.4), 0.35, 0.15]} />{wood}</mesh>)}
    </group>
  );
};
const Rain: React.FC<{ t: number; k: number }> = ({ t, k }) => {
  const geo = useMemo(() => { const r = rng(71), p: number[] = []; for (let i = 0; i < 700; i++) { const x = (r() - 0.5) * 50, y = r() * 26, z = (r() - 0.5) * 40 - 4; p.push(x, y, z, x - 0.25, y - 1.3, z); } const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3)); return g; }, []);
  return <lineSegments geometry={geo} position={[0, 26 - ((t * 22) % 26), 0]}><lineBasicMaterial color="#b9c8e8" transparent opacity={0.55 * k} /></lineSegments>;
};
