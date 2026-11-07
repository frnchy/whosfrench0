// Static Times Square: ground, roads, crosswalks, towers with glowing
// (text-free, logo-free) billboards, signals, props. Built once.
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {AVE_HALF, ST_HALF, SIDEWALK, CW} from './sim';
import {rng} from './time';

const M = (c: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({color: c, roughness: 0.85, metalness: 0, ...extra});

export const MAT = {
  asphalt: M('#5b5f66'),
  sidewalk: M('#cfcac1'),
  curb: M('#a9a49a'),
  plaza: M('#d9d3c6'),
  white: M('#f4f4f2', {roughness: 0.6}),
  yellow: M('#e8c34a', {roughness: 0.6}),
  pole: M('#3a3f45', {roughness: 0.5, metalness: 0.3}),
  planter: M('#8d8577'),
  bush: M('#5f8a52'),
  trunk: M('#6b5440'),
  steps: M('#b23a3a', {roughness: 0.5}),
  roof: M('#9a978f'),
};

// ---------------------------------------------------------------- facades --
function facadeTexture(seed: number, wall: string, glass: string, lit: string) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = wall;
  g.fillRect(0, 0, 256, 256);
  const r = rng(seed);
  for (let i = 0; i < 2; i++)
    for (let j = 0; j < 2; j++) {
      g.fillStyle = r() < 0.18 ? lit : glass;
      g.fillRect(i * 128 + 16, j * 128 + 22, 96, 84);
      g.fillStyle = 'rgba(255,255,255,0.10)';
      g.fillRect(i * 128 + 16, j * 128 + 22, 96, 14);
    }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const TILE_W = 5, TILE_H = 6;
function boxWithFacadeUV(w: number, h: number, d: number) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  // faces: px, nx, py, ny, pz, nz (4 verts each)
  const sizes: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++)
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, uv.getX(i) * (sizes[f][0] / TILE_W), uv.getY(i) * (sizes[f][1] / TILE_H));
    }
  uv.needsUpdate = true;
  return g;
}

// --------------------------------------------------------------- billboards --
export const billboardMaterials: THREE.ShaderMaterial[] = [];
const BB_PALETTES: [string, string, string][] = [
  ['#ff4f7b', '#ffd34d', '#5ad1ff'],
  ['#2a6cff', '#7ef0ff', '#ffffff'],
  ['#ff8a2a', '#ff2d55', '#ffe0a0'],
  ['#20d39b', '#0b5cff', '#e8ff7a'],
  ['#b04dff', '#ff6bd6', '#78e1ff'],
  ['#ffffff', '#ff3b30', '#222831'],
];
function billboardMaterial(seed: number) {
  const pal = BB_PALETTES[seed % BB_PALETTES.length];
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uTime: {value: 0},
      uSeed: {value: seed},
      uA: {value: new THREE.Color(pal[0])},
      uB: {value: new THREE.Color(pal[1])},
      uC: {value: new THREE.Color(pal[2])},
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `
      uniform float uTime; uniform float uSeed; uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
      void main(){
        vec2 p = vUv; float t = uTime + uSeed*3.7; float k = mod(uSeed, 5.0);
        vec3 col;
        if (k < 1.0) { float s = step(0.5, fract((p.x + p.y*0.7)*3.0 - t*0.35)); col = mix(uA, uB, s); }
        else if (k < 2.0) { float d = length((p-0.5)*vec2(1.6,1.0)); float r = fract(d*2.5 - t*0.4); col = mix(uA, uC, smoothstep(0.35,0.65,r)); }
        else if (k < 3.0) { col = mix(uA, uB, smoothstep(0.0,1.0,p.y + 0.15*sin(6.283*(p.x*1.3+t*0.2)))); col += 0.25*uC*smoothstep(0.7,1.0,sin(6.283*(p.x-t*0.3))); }
        else if (k < 4.0) { vec2 c = p*vec2(9.0,5.0); vec2 g = fract(c)-0.5; float on = step(0.45, h(floor(c)+floor(t*1.5))); col = mix(uB*0.25, uA, on*step(length(g),0.33)); }
        else { float w = sin(10.0*p.x + t*1.2)*0.5+0.5; col = mix(uC, uA, w); col = mix(col, uB, step(0.82, fract(p.y*4.0 + t*0.25))); }
        // soft bezel vignette
        vec2 e = min(p, 1.0-p); float edge = smoothstep(0.0, 0.03, min(e.x, e.y));
        gl_FragColor = vec4(col*(0.55+0.45*edge), 1.0);
      }`,
    toneMapped: false,
    fog: false,
  });
  billboardMaterials.push(m);
  return m;
}

type Bld = {x: number; z: number; w: number; d: number; h: number; style: number};
type Bb = {pos: [number, number, number]; rotY: number; w: number; h: number; seed: number};

function layout() {
  const r = rng(42);
  const blds: Bld[] = [];
  const bbs: Bb[] = [];
  // quadrant grid; towers are tallest next to the avenue (Times Square "canyon")
  const xEdge = AVE_HALF + SIDEWALK, zEdge = ST_HALF + SIDEWALK;
  for (const sx of [1, -1])
    for (const sz of [1, -1]) {
      let x = xEdge;
      for (let ix = 0; ix < 5 && x < 150; ix++) {
        const w = 18 + r() * 12;
        let z = zEdge;
        for (let iz = 0; iz < 9 && z < 240; iz++) {
          const d = 16 + r() * 14;
          const nearAve = ix === 0;
          const north = sz < 0;
          const h = nearAve ? (north ? 45 + r() * 140 : 35 + r() * 90) : 20 + r() * 70;
          blds.push({x: sx * (x + w / 2), z: sz * (z + d / 2), w, d, h, style: Math.floor(r() * 3)});
          // billboards on the avenue-facing facade, low floors (the Times Square look)
          if (nearAve && (north || iz < 4)) {
            const n = 1 + Math.floor(r() * 3);
            let y = 4.5;
            for (let k = 0; k < n; k++) {
              const bw = Math.min(d - 2, 9 + r() * 10);
              const bh = 5 + r() * 9;
              const off = (r() - 0.5) * (d - 2 - bw);
              bbs.push({pos: [sx * (x - 0.12), y + bh / 2, sz * (z + d / 2) + off], rotY: sx > 0 ? -Math.PI / 2 : Math.PI / 2, w: bw, h: bh, seed: Math.floor(r() * 1000)});
              y += bh + 1.5 + r() * 4;
            }
          }
          // corner buildings also face the cross street
          if (nearAve && iz === 0) {
            const bw = Math.min(w - 3, 10 + r() * 8), bh = 6 + r() * 6;
            bbs.push({pos: [sx * (x + w / 2), 9 + bh / 2, sz * (z - 0.12)], rotY: sz > 0 ? Math.PI : 0, w: bw, h: bh, seed: Math.floor(r() * 1000)});
          }
          z += d + (r() < 0.25 ? 6 : 0.5);
        }
        x += w + (ix === 1 ? 14 : 0.5); // a second avenue gap further out
      }
    }
  return {blds, bbs};
}

export const City: React.FC = () => {
  const {blds, bbs} = useMemo(layout, []);
  const facades = useMemo(
    () => [
      M('#ffffff', {map: facadeTexture(1, '#e6e0d4', '#7d97b0', '#f3e2a6')}),
      M('#ffffff', {map: facadeTexture(2, '#9fb4c6', '#3e5f80', '#cfe6ff'), roughness: 0.4, metalness: 0.1}),
      M('#ffffff', {map: facadeTexture(3, '#b9b2a6', '#4a5d70', '#ffd99a')}),
    ],
    [],
  );
  const geos = useMemo(() => blds.map((b) => boxWithFacadeUV(b.w, b.h, b.d)), [blds]);
  const bbMats = useMemo(() => bbs.map((b) => billboardMaterial(b.seed)), [bbs]);

  const zebra = useMemo(() => {
    const bars: [number, number, number, number][] = []; // x, z, w(x), d(z)
    // north + south crosswalks across the avenue (stripes parallel to traffic)
    for (const zc of [(CW.z0 + CW.z1) / 2, -(CW.z0 + CW.z1) / 2])
      for (let x = -AVE_HALF + 0.5; x < AVE_HALF - 0.3; x += 1.2) bars.push([x + 0.3, zc, 0.6, CW.z1 - CW.z0]);
    // east + west crosswalks across the cross street
    for (const xc of [AVE_HALF + 1.75, -(AVE_HALF + 1.75)])
      for (let z = -ST_HALF + 0.5; z < ST_HALF - 0.3; z += 1.2) bars.push([xc, z + 0.3, 3.5, 0.6]);
    return bars;
  }, []);

  const dashes = useMemo(() => {
    const d: [number, number, number, number][] = [];
    for (const x of [-3.5, 0, 3.5])
      for (const [a, b] of [[-260, CW.z0 - 1.6], [-(CW.z0) + 1.6, 260]] as [number, number][])
        for (let z = a; z < b - 3; z += 9) d.push([x, z + 1.5, 0.14, 3]);
    return d;
  }, []);

  const lamps = useMemo(() => {
    const out: [number, number][] = [];
    for (const sx of [1, -1]) for (let z = -120; z < 120; z += 24) if (Math.abs(z) > 14) out.push([sx * (AVE_HALF + 0.6), z]);
    for (const sz of [1, -1]) for (let x = -120; x < 120; x += 26) if (Math.abs(x) > 16) out.push([x, sz * (ST_HALF + 0.6)]);
    return out;
  }, []);

  const SW_Y = 0.15;
  return (
    <group>
      {/* ground + roads */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow material={MAT.asphalt}>
        <planeGeometry args={[1200, 1200]} />
      </mesh>
      {/* sidewalks: four corner slabs */}
      {[1, -1].flatMap((sx) =>
        [1, -1].map((sz) => (
          <mesh key={`sw${sx}${sz}`} position={[sx * (AVE_HALF + 300), SW_Y / 2, sz * (ST_HALF + 300)]} receiveShadow material={MAT.sidewalk}>
            <boxGeometry args={[600, SW_Y, 600]} />
          </mesh>
        )),
      )}
      {/* curbs */}
      {[1, -1].flatMap((sx) =>
        [1, -1].map((sz) => (
          <group key={`cb${sx}${sz}`}>
            <mesh position={[sx * (AVE_HALF + 0.12), SW_Y / 2 + 0.005, sz * (ST_HALF + 300)]} material={MAT.curb}>
              <boxGeometry args={[0.25, SW_Y + 0.01, 600]} />
            </mesh>
            <mesh position={[sx * (AVE_HALF + 300), SW_Y / 2 + 0.005, sz * (ST_HALF + 0.12)]} material={MAT.curb}>
              <boxGeometry args={[600, SW_Y + 0.01, 0.25]} />
            </mesh>
          </group>
        )),
      )}
      {/* plaza paving + red steps (Times Square) on the north-west block edge */}
      <mesh position={[-(AVE_HALF + 3), SW_Y + 0.01, -40]} receiveShadow material={MAT.plaza}>
        <boxGeometry args={[5.5, 0.02, 50]} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={`st${i}`} position={[-(AVE_HALF + 4.2), SW_Y + 0.2 + i * 0.4, -52 - i * 0.9]} castShadow receiveShadow material={MAT.steps}>
          <boxGeometry args={[3.2, 0.4 + i * 0.8, 1.0]} />
        </mesh>
      ))}
      {/* crosswalk stripes, stop lines, lane dashes, centre line */}
      {zebra.map(([x, z, w, d], i) => (
        <mesh key={`zb${i}`} position={[x, 0.012, z]} receiveShadow material={MAT.white}>
          <boxGeometry args={[w, 0.02, d]} />
        </mesh>
      ))}
      {dashes.map(([x, z, w, d], i) => (
        <mesh key={`ds${i}`} position={[x, 0.01, z]} material={MAT.white}>
          <boxGeometry args={[w, 0.02, d]} />
        </mesh>
      ))}
      <mesh position={[0, 0.011, CW.z0 - 1.2]} material={MAT.white}>
        <boxGeometry args={[AVE_HALF * 2 - 0.4, 0.02, 0.45]} />
      </mesh>
      {[-0.12, 0.12].map((dz) => (
        <mesh key={`yl${dz}`} position={[0, 0.011, dz]} material={MAT.yellow}>
          <boxGeometry args={[600, 0.02, 0.12]} />
        </mesh>
      ))}
      {/* towers */}
      {blds.map((b, i) => (
        <mesh key={`b${i}`} geometry={geos[i]} position={[b.x, b.h / 2, b.z]} castShadow receiveShadow
          material={[facades[b.style], facades[b.style], MAT.roof, MAT.roof, facades[b.style], facades[b.style]]} />
      ))}
      {/* billboards */}
      {bbs.map((b, i) => (
        <group key={`bb${i}`} position={b.pos} rotation-y={b.rotY}>
          <mesh position={[0, 0, -0.08]} material={MAT.pole}>
            <boxGeometry args={[b.w + 0.5, b.h + 0.5, 0.2]} />
          </mesh>
          <mesh position={[0, 0, 0.03]} material={bbMats[i]}>
            <planeGeometry args={[b.w, b.h]} />
          </mesh>
        </group>
      ))}
      {/* lamp posts */}
      {lamps.map(([x, z], i) => (
        <group key={`lp${i}`} position={[x, SW_Y, z]}>
          <mesh position={[0, 3.2, 0]} castShadow material={MAT.pole}>
            <cylinderGeometry args={[0.07, 0.1, 6.4, 8]} />
          </mesh>
          <mesh position={[0, 6.4, 0]} material={MAT.white}>
            <sphereGeometry args={[0.22, 10, 8]} />
          </mesh>
        </group>
      ))}
      <Signals />
      <Props />
    </group>
  );
};

// ---------------------------------------------------------- signals ------
const lampMat = (c: string, on: boolean) =>
  new THREE.MeshStandardMaterial({color: on ? c : '#2a2a2a', emissive: on ? c : '#000000', emissiveIntensity: on ? 2.2 : 0, roughness: 0.4});
const Signals: React.FC = () => {
  const red = useMemo(() => lampMat('#ff3b30', true), []);
  const green = useMemo(() => lampMat('#38e07b', true), []);
  const off = useMemo(() => lampMat('#000', false), []);
  const walk = useMemo(() => lampMat('#f5f7ff', true), []);
  const hand = useMemo(() => lampMat('#ff8a2a', true), []);
  const corners: [number, number][] = [[AVE_HALF + 0.7, -(ST_HALF + 0.7)], [-(AVE_HALF + 0.7), -(ST_HALF + 0.7)], [AVE_HALF + 0.7, ST_HALF + 0.7], [-(AVE_HALF + 0.7), ST_HALF + 0.7]];
  return (
    <group>
      {corners.map(([x, z], i) => (
        <group key={i} position={[x, 0.15, z]}>
          <mesh position={[0, 2.6, 0]} castShadow material={MAT.pole}>
            <cylinderGeometry args={[0.09, 0.11, 5.2, 8]} />
          </mesh>
          {/* avenue head (faces north, -z): red */}
          <group position={[0, 4.4, -0.25]}>
            <mesh material={MAT.pole}><boxGeometry args={[0.4, 1.1, 0.3]} /></mesh>
            <mesh position={[0, 0.33, -0.16]} material={red}><circleGeometry args={[0.12, 14]} /></mesh>
            <mesh position={[0, 0, -0.16]} material={off}><circleGeometry args={[0.12, 14]} /></mesh>
            <mesh position={[0, -0.33, -0.16]} material={off}><circleGeometry args={[0.12, 14]} /></mesh>
          </group>
          {/* cross-street head (faces west/east): green */}
          <group position={[x > 0 ? 0.25 : -0.25, 4.4, 0]} rotation-y={x > 0 ? Math.PI / 2 : -Math.PI / 2}>
            <mesh material={MAT.pole}><boxGeometry args={[0.4, 1.1, 0.3]} /></mesh>
            <mesh position={[0, 0.33, 0.16]} material={off}><circleGeometry args={[0.12, 14]} /></mesh>
            <mesh position={[0, 0, 0.16]} material={off}><circleGeometry args={[0.12, 14]} /></mesh>
            <mesh position={[0, -0.33, 0.16]} material={green}><circleGeometry args={[0.12, 14]} /></mesh>
          </group>
          {/* pedestrian heads: across the avenue = walk (white), across the street = hand (orange) */}
          <mesh position={[x > 0 ? -0.2 : 0.2, 2.6, 0]} rotation-y={x > 0 ? -Math.PI / 2 : Math.PI / 2} material={walk}>
            <planeGeometry args={[0.32, 0.32]} />
          </mesh>
          <mesh position={[0, 2.6, z > 0 ? -0.2 : 0.2]} rotation-y={z > 0 ? Math.PI : 0} material={hand}>
            <planeGeometry args={[0.32, 0.32]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// ------------------------------------------------------------- props ------
const Props: React.FC = () => {
  const cart = useMemo(() => ({
    body: M('#c9ced6', {metalness: 0.4, roughness: 0.35}),
    umb1: M('#e8483b'), umb2: M('#f3f0e6'),
    wheel: M('#222'),
  }), []);
  const planters: [number, number][] = [];
  for (let z = -16; z > -80; z -= 9) planters.push([-(AVE_HALF + 4.9), z], [AVE_HALF + 5.2, z - 4]);
  const bollards: [number, number][] = [];
  for (let z = -14; z > -90; z -= 2.2) bollards.push([-(AVE_HALF + 0.75), z]);
  return (
    <group>
      {/* hot-dog cart on the north-east corner */}
      <group position={[AVE_HALF + 3.2, 0.15, -14.5]} rotation-y={0.3}>
        <mesh position={[0, 0.75, 0]} castShadow material={cart.body}><boxGeometry args={[1.8, 0.9, 0.9]} /></mesh>
        {[-0.6, 0.6].map((x) => (
          <mesh key={x} position={[x, 0.22, 0.48]} rotation-x={Math.PI / 2} material={cart.wheel}><cylinderGeometry args={[0.22, 0.22, 0.08, 14]} /></mesh>
        ))}
        <mesh position={[0, 1.9, 0]} material={MAT.pole}><cylinderGeometry args={[0.03, 0.03, 1.4, 6]} /></mesh>
        <mesh position={[0, 2.6, 0]} castShadow material={cart.umb1}><coneGeometry args={[1.3, 0.55, 12, 1, true]} /></mesh>
      </group>
      {planters.map(([x, z], i) => (
        <group key={`pl${i}`} position={[x, 0.15, z]}>
          <mesh position={[0, 0.35, 0]} castShadow receiveShadow material={MAT.planter}><boxGeometry args={[1.4, 0.7, 1.4]} /></mesh>
          <mesh position={[0, 1.0, 0]} castShadow material={MAT.bush}><icosahedronGeometry args={[0.75, 0]} /></mesh>
        </group>
      ))}
      {bollards.map(([x, z], i) => (
        <mesh key={`bo${i}`} position={[x, 0.15 + 0.45, z]} castShadow material={MAT.pole}><cylinderGeometry args={[0.1, 0.12, 0.9, 8]} /></mesh>
      ))}
    </group>
  );
};
