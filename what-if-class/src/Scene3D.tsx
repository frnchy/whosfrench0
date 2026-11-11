import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Part, World } from './world';
import { getTex } from './textures';

const GEO = {
  box: new RoundedBoxGeometry(1, 1, 1, 3, 0.09),
  flat: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(0.5, 28, 18),
  torus: new THREE.TorusGeometry(0.42, 0.07, 12, 40),
  cone: new THREE.ConeGeometry(0.5, 1, 24, 1, true),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 32),
  plane: new THREE.PlaneGeometry(1, 1),
};
const mats = new Map<string, THREE.Material>();
function mat(p: Part): THREE.Material {
  const key = `${p.color}|${p.tex ?? ''}|${p.emissive ?? 0}|${p.opacity ?? 1}|${p.add ? 1 : 0}|${p.kind}`;
  let m = mats.get(key);
  if (m) return m;
  if (p.tex && p.emissive) m = new THREE.MeshBasicMaterial({ map: getTex(p.tex), transparent: !p.tex.startsWith('phone'), toneMapped: false, side: THREE.DoubleSide });
  else if (p.tex) m = new THREE.MeshStandardMaterial({ map: getTex(p.tex), roughness: 0.85 });
  else if (p.add) m = new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: p.opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  else if (p.emissive) m = new THREE.MeshStandardMaterial({ color: p.color, emissive: p.color, emissiveIntensity: p.emissive, roughness: 0.5 });
  else m = new THREE.MeshStandardMaterial({ color: p.color, roughness: p.kind === 'sphere' ? 0.95 : 0.78, transparent: (p.opacity ?? 1) < 1, opacity: p.opacity ?? 1, depthWrite: (p.opacity ?? 1) >= 1 });
  if (!p.tex?.startsWith('phone')) mats.set(key, m); // phone screens change every frame: don't keep them
  return m;
}

const Cam: React.FC<{ w: World }> = ({ w }) => {
  const { camera } = useThree();
  const c = camera as THREE.PerspectiveCamera;
  c.position.set(...w.cam.pos); c.up.set(...(w.cam.up ?? [0, 1, 0])); c.fov = w.cam.fov; c.near = 0.03; c.far = 80;
  c.lookAt(...w.cam.look); c.updateProjectionMatrix();
  return null;
};

const Mesh: React.FC<{ p: Part }> = ({ p }) => {
  const m = useMemo(() => new THREE.Matrix4().fromArray(p.m), [p.m]);
  if (p.opacity === 0) return null;
  const geo = p.kind === 'box' && (p.flat || Math.max(m.getMaxScaleOnAxis()) > 1.6) ? GEO.flat : GEO[p.kind];
  const shadow = !p.add && p.kind !== 'plane' && (p.opacity ?? 1) >= 1;
  return <mesh geometry={geo} material={mat(p)} matrixAutoUpdate={false} matrix={m} castShadow={shadow && p.owner !== 'heaven'} receiveShadow={shadow} />;
};

/** layer 'bg' draws everything (blurred by CSS for depth of field); 'fg' draws only the in-focus subject on top */
export const Scene3D: React.FC<{ w: World; layer: 'bg' | 'fg'; width: number; height: number }> = ({ w, layer, width, height }) => {
  const parts = layer === 'fg' ? w.parts.filter((p) => p.fg) : w.parts;
  const k = w.warm;
  const sky = new THREE.Color('#9fb3c8').lerp(new THREE.Color('#ffe2b0'), k);
  return (
    <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true, alpha: layer === 'fg', preserveDrawingBuffer: true }} style={{ position: 'absolute', inset: 0 }}>
      {layer === 'bg' ? <color attach="background" args={[w.bg]} /> : null}
      {w.heaven ? <fog attach="fog" args={['#ffd2a1', 9, 26]} /> : null}
      <Cam w={w} />
      <hemisphereLight args={[sky, new THREE.Color('#4a4038').lerp(new THREE.Color('#b8743c'), k), w.heaven ? 1.8 : 1.25 + 0.35 * k]} />
      <directionalLight position={w.heaven ? [3, 8, 6] : [-2.5, 5, 6]} intensity={w.heaven ? 2.4 : 2.3 + 1.0 * k} color={new THREE.Color('#dfe7ff').lerp(new THREE.Color('#ffd09a'), k)} castShadow
        shadow-mapSize={[2048, 2048]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} shadow-bias={-0.0004} shadow-radius={4} />
      <pointLight position={[w.cam.pos[0], w.cam.pos[1] + 0.6, w.cam.pos[2]]} intensity={1.2 + 0.6 * k} distance={9} color={'#fff1dc'} />
      {parts.map((p, i) => <Mesh key={p.owner + p.id + i} p={p} />)}
    </ThreeCanvas>
  );
};
