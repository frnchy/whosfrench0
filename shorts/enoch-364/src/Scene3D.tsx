import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { staticFile } from "remotion";
import { useLoader } from "@react-three/fiber";
import sim from "./sim.json";

type Frame = (typeof sim.frame)[number];
const L = sim.layout;
const TILT = (sim.constants.tilt * Math.PI) / 180;

// Radial glow texture, generated once (deterministic: no randomness)
const glowTexture = (inner: string, outer: string) => {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.25, outer);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

const atmosphereMaterial = () =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    uniforms: { sunDir: { value: new THREE.Vector3(1, 0, 0) } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vW;
      void main(){ vec4 wp = modelMatrix*vec4(position,1.); vW = normalize(mat3(modelMatrix)*normal);
      vN = normalize(normalMatrix*normal); vV = normalize(-(modelViewMatrix*vec4(position,1.)).xyz);
      gl_Position = projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `uniform vec3 sunDir; varying vec3 vN; varying vec3 vV; varying vec3 vW;
      void main(){ float rim = pow(1.0 - max(dot(vN, vV), 0.0), 3.0);
      float lit = smoothstep(-0.25, 0.4, dot(vW, sunDir));
      gl_FragColor = vec4(vec3(0.35, 0.62, 1.0) * rim * (0.15 + 1.1*lit), rim); }`,
  });

// Sun surface: granulation from value noise (driven only by frame time) + limb darkening
const sunMaterial = () =>
  new THREE.ShaderMaterial({
    toneMapped: false,
    uniforms: { time: { value: 0 }, gain: { value: 1 } },
    vertexShader: `varying vec3 vP; varying vec3 vN; varying vec3 vV;
      void main(){ vP = position; vN = normalize(normalMatrix*normal); vV = normalize(-(modelViewMatrix*vec4(position,1.)).xyz);
      gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float time; uniform float gain; varying vec3 vP; varying vec3 vN; varying vec3 vV;
      float h(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }
      float n(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
      void main(){ vec3 p = normalize(vP)*6.0 + vec3(0., time*0.05, 0.);
        float g = n(p*3.)*0.5 + n(p*7.)*0.3 + n(p*15.)*0.2;
        float mu = max(dot(vN, vV), 0.0);
        float limb = 0.35 + 0.65*pow(mu, 0.55);
        vec3 col = mix(vec3(1.0,0.55,0.15), vec3(1.0,0.93,0.75), g) * limb * 1.35 * gain;
        gl_FragColor = vec4(col, 1.0); }`,
  });

const Camera: React.FC<{ fr: Frame }> = ({ fr }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.fov = 45;
    camera.near = 0.05;
    camera.far = 8000;
    camera.position.set(...(fr.cam.pos as [number, number, number]));
    camera.up.set(...(fr.cam.up as [number, number, number])).normalize();
    camera.lookAt(...(fr.cam.target as [number, number, number]));
    camera.updateProjectionMatrix();
  }, [camera, fr]);
  return null;
};

const Earth: React.FC<{ radius: number; position: [number, number, number]; spin: number; sunDir: THREE.Vector3 }> = ({ radius, position, spin, sunDir }) => {
  const [day, bump, night] = useLoader(THREE.TextureLoader, [staticFile("tex/earth-blue-marble.jpg"), staticFile("tex/earth-topology.png"), staticFile("tex/earth-night.jpg")]);
  day.colorSpace = THREE.SRGBColorSpace;
  night.colorSpace = THREE.SRGBColorSpace;
  day.anisotropy = 8;
  const atmo = useMemo(atmosphereMaterial, []);
  atmo.uniforms.sunDir.value.copy(sunDir);
  // Axis tilted 23.44° toward −x, fixed in space (seasons come from orbit position, not from a wobbling axis)
  return (
    <group position={position} rotation={[0, 0, TILT]}>
      <mesh rotation={[0, spin, 0]}>
        <sphereGeometry args={[radius, 128, 96]} />
        <meshStandardMaterial map={day} bumpMap={bump} bumpScale={radius * 0.02} roughness={0.85} metalness={0} emissiveMap={night} emissive={new THREE.Color(1, 0.75, 0.45)} emissiveIntensity={0.45} />
      </mesh>
      <mesh scale={1.025}>
        <sphereGeometry args={[radius, 96, 64]} />
        <primitive object={atmo} attach="material" />
      </mesh>
    </group>
  );
};

const Stars: React.FC = () => {
  const sky = useLoader(THREE.TextureLoader, staticFile("tex/night-sky.png"));
  sky.colorSpace = THREE.SRGBColorSpace;
  return (
    <mesh>
      <sphereGeometry args={[4000, 64, 32]} />
      <meshBasicMaterial map={sky} side={THREE.BackSide} color="#8a8f9e" toneMapped={false} />
    </mesh>
  );
};

const circle = (r: number, n = 256, y = 0) => {
  const g = new THREE.BufferGeometry().setFromPoints(Array.from({ length: n + 1 }, (_, i) => new THREE.Vector3(Math.cos((i / n) * Math.PI * 2) * r, y, Math.sin((i / n) * Math.PI * 2) * r)));
  return g;
};

const Wide: React.FC<{ fr: Frame; markerOpacity: number; glow: number }> = ({ fr, markerOpacity, glow }) => {
  const sunTex = useMemo(() => glowTexture("rgba(255,250,235,1)", "rgba(255,170,60,0.55)"), []);
  const haloTex = useMemo(() => glowTexture("rgba(255,210,140,0.6)", "rgba(255,120,40,0.18)"), []);
  const blueTex = useMemo(() => glowTexture("rgba(170,215,255,0.9)", "rgba(80,150,255,0.35)"), []);
  const overview = Math.min(1, Math.max(0, (fr.cam.pos[1] - 8) / 30));   // markers grow with camera height so they stay readable
  const goldTex = useMemo(() => glowTexture("rgba(255,236,170,1)", "rgba(255,200,40,0.6)"), []);
  const sunMat = useMemo(sunMaterial, []);
  sunMat.uniforms.time.value = fr.f / 30;
  sunMat.uniforms.gain.value = glow;
  const orbit = useMemo(() => new THREE.LineLoop(circle(L.wide.orbitR), new THREE.LineBasicMaterial({ color: "#8fb4ff", transparent: true, opacity: 0.35 })), []);
  // arc from Earth to the calendar marker: the drift, at its true angle
  const arc = useMemo(() => new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: "#FFD60A", transparent: true })), []);
  const a0 = fr.earthAngle, a1 = fr.markerAngle, n = Math.max(2, Math.ceil(Math.abs(a1 - a0) * 60));
  arc.geometry.setFromPoints(Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return new THREE.Vector3(Math.cos(a) * L.wide.orbitR, 0.01, Math.sin(a) * L.wide.orbitR); }));
  (arc.material as THREE.LineBasicMaterial).opacity = markerOpacity;
  const marker: [number, number, number] = [Math.cos(a1) * L.wide.orbitR, 0, Math.sin(a1) * L.wide.orbitR];
  const sunDir = new THREE.Vector3(-fr.earth[0], 0, -fr.earth[2]).normalize();
  return (
    <>
      <Stars />
      <ambientLight intensity={0.1} />
      {/* sunlight as a directional light along Sun→Earth (the Sun is effectively at infinity for Earth) */}
      <directionalLight position={[sunDir.x * 50, 0, sunDir.z * 50]} intensity={3.2 * glow} color="#fff3e0" />
      {/* cinematic fill from the camera side (~20% of key) so the night side reads on a phone */}
      <directionalLight position={fr.cam.pos as [number, number, number]} intensity={0.65} color="#9fb8ff" />
      <mesh>
        <sphereGeometry args={[L.wide.sunR, 96, 64]} />
        <primitive object={sunMat} attach="material" />
      </mesh>
      <sprite scale={[L.wide.sunR * 6 * glow, L.wide.sunR * 6 * glow, 1]}>
        <spriteMaterial map={sunTex} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      <sprite scale={[L.wide.sunR * 16 * glow, L.wide.sunR * 16 * glow, 1]}>
        <spriteMaterial map={haloTex} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} opacity={0.8} />
      </sprite>
      <primitive object={orbit} />
      <primitive object={arc} />
      <Earth radius={L.wide.earthR} position={fr.earth as [number, number, number]} spin={fr.f * 0.02} sunDir={sunDir} />
      <sprite position={fr.earth as [number, number, number]} scale={[2.4 * overview, 2.4 * overview, 1]}>
        <spriteMaterial map={blueTex} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} opacity={overview} />
      </sprite>
      <sprite position={marker} scale={[0.9 + 1.4 * overview, 0.9 + 1.4 * overview, 1]}>
        <spriteMaterial map={goldTex} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} opacity={markerOpacity} />
      </sprite>
    </>
  );
};

const Local: React.FC<{ fr: Frame; newTrack: number; moonRing: number }> = ({ fr, newTrack, moonRing }) => {
  const sunTex = useMemo(() => glowTexture("rgba(255,250,235,1)", "rgba(255,170,60,0.5)"), []);
  const oldTrack = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -400), new THREE.Vector3(0, 0, 400)]);
    const l = new THREE.Line(g, new THREE.LineDashedMaterial({ color: "#cfe0ff", dashSize: 4, gapSize: 3, transparent: true, opacity: 0.7 }));
    l.computeLineDistances();
    return l;
  }, []);
  const track = useMemo(() => new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-L.local.shift, 0, -400), new THREE.Vector3(-L.local.shift, 0, 400)]), new THREE.LineBasicMaterial({ color: "#FFD60A", transparent: true })), []);
  (track.material as THREE.LineBasicMaterial).opacity = newTrack;
  const ring = useMemo(() => new THREE.LineLoop(circle(L.local.moonOrbit, 256), new THREE.LineBasicMaterial({ color: "#9FD8FF", transparent: true })), []);
  (ring.material as THREE.LineBasicMaterial).opacity = moonRing * 0.8;
  const moonA = 2.1 + fr.f * 0.002;
  return (
    <>
      <Stars />
      <ambientLight intensity={0.04} />
      <directionalLight position={[-100, 6, 12]} intensity={3.2} color="#fff3e0" />
      <sprite position={[-900, 0, 0]} scale={[700, 700, 1]}>
        <spriteMaterial map={sunTex} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      <primitive object={oldTrack} />
      <primitive object={track} />
      <group position={[fr.earthX, 0, 0]}>
        <primitive object={ring} />
        <mesh position={[Math.cos(moonA) * L.local.moonOrbit, 0, Math.sin(moonA) * L.local.moonOrbit]}>
          <sphereGeometry args={[L.local.moonR, 48, 32]} />
          <meshStandardMaterial color="#bdbab4" roughness={1} />
        </mesh>
      </group>
      <Earth radius={L.local.earthR} position={[fr.earthX, 0, 0]} spin={fr.f * 0.004} sunDir={new THREE.Vector3(-1, 0, 0)} />
    </>
  );
};

export const Scene3D: React.FC<{ fr: Frame; markerOpacity: number; glow: number; newTrack: number; moonRing: number }> = ({ fr, ...p }) => (
  <>
    <Camera fr={fr} />
    {fr.scene === "wide" ? <Wide fr={fr} markerOpacity={p.markerOpacity} glow={p.glow} /> : <Local fr={fr} newTrack={p.newTrack} moonRing={p.moonRing} />}
  </>
);
