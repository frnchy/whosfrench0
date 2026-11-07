import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {
  PEOPLE, Person, shrinkAmount, personPos, walked, speedNow, PANTS_DROP_T, SHOE_OFF_T, G,
  VEHICLES, Vehicle, vehiclePose, vehicle, AEB_T, HIT_T, BACK_T, MPH25,
} from './sim';
import {clamp, lerp, smooth} from './time';

// ============================================================== people ====
const dummy = new THREE.Object3D();
const col = new THREE.Color();
const HIDE = new THREE.Matrix4().makeScale(0, 0, 0);

function useInst(count: number, geo: THREE.BufferGeometry, mat: THREE.Material) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const el = (
    <instancedMesh ref={ref} args={[geo, mat, count]} castShadow receiveShadow frustumCulled={false} />
  );
  return [ref, el] as const;
}

const unitLeg = new THREE.BoxGeometry(1, 1, 1).translate(0, -0.5, 0); // pivot at top
const unitTorso = new THREE.CapsuleGeometry(0.5, 1, 4, 10); // height 2 total incl caps
const unitSphere = new THREE.SphereGeometry(1, 14, 10);
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitTube = new THREE.CylinderGeometry(1, 1.15, 1, 14, 1).translate(0, 0.5, 0);
const unitDisc = new THREE.CircleGeometry(1, 18).rotateX(-Math.PI / 2);
const unitCup = new THREE.CylinderGeometry(0.045, 0.035, 0.15, 10);
const unitBag = new THREE.BoxGeometry(0.34, 0.3, 0.13);
const unitPhone = new THREE.BoxGeometry(0.075, 0.155, 0.012);

const flat = (c = '#ffffff') => new THREE.MeshStandardMaterial({color: c, roughness: 0.8});

type Dims = {
  H: number; leg: number; shoulder: number; headR: number; bodyR: number;
  shirtTop: number; shirtBot: number; shirtR: number; arm: number; foot: number;
};
// adult (s=0) -> age 6 (s=1). Heads barely shrink (brain ~90% adult size by age 5).
function dims(p: Person, s: number, kidClothes: boolean): Dims {
  const H = lerp(p.height, p.kidHeight, s);
  const leg = H * lerp(0.47, 0.44, s);
  const shoulder = H * lerp(0.815, 0.79, s);
  const headR = lerp(0.112, 0.104, s);
  const adultR = p.male ? 0.19 : 0.17;
  const bodyR = lerp(adultR, 0.13, s);
  // the adult shirt keeps its size: on a 6-year-old it hangs to the shins
  const adultShirtLen = p.height * (0.815 - 0.47) + 0.1;
  const shirtTop = shoulder;
  const shirtBot = kidClothes ? Math.max(0.2, shoulder - adultShirtLen) : leg - 0.1;
  const shirtR = kidClothes ? adultR : bodyR;
  return {H, leg, shoulder, headR, bodyR, shirtTop, shirtBot, shirtR, arm: H * lerp(0.36, 0.33, s), foot: lerp(0.27, 0.18, s)};
}

export const People: React.FC<{T: number}> = ({T}) => {
  const N = PEOPLE.length;
  const mats = useMemo(() => ({
    m: flat(), item: flat(), spill: new THREE.MeshStandardMaterial({color: '#5a3b22', roughness: 0.2, transparent: true, opacity: 0.9}),
  }), []);
  const [legs, legsEl] = useInst(2 * N, unitLeg, mats.m);
  const [torso, torsoEl] = useInst(N, unitTorso, mats.m);
  const [arms, armsEl] = useInst(2 * N, unitLeg, mats.m);
  const [heads, headsEl] = useInst(N, unitSphere, mats.m);
  const [hair, hairEl] = useInst(N, unitSphere, mats.m);
  const [shoes, shoesEl] = useInst(2 * N, unitBox, mats.m);
  const [socks, socksEl] = useInst(2 * N, unitBox, mats.m);
  const [pants, pantsEl] = useInst(N, unitTube, mats.m);
  const [cups, cupsEl] = useInst(N, unitCup, mats.item);
  const [bags, bagsEl] = useInst(N, unitBag, mats.item);
  const [phones, phonesEl] = useInst(N, unitPhone, mats.item);
  const [spills, spillsEl] = useInst(N, unitDisc, mats.spill);

  // shoes stay where the adult feet were when they slipped off
  const shoeRest = useMemo(() => PEOPLE.map((p) => footWorld(p, SHOE_OFF_T)), []);

  useLayoutEffect(() => {
    const s = shrinkAmount(T);
    const kidClothes = T >= PANTS_DROP_T; // once the clothes stop fitting they never fit again
    PEOPLE.forEach((p, i) => {
      const [x, z] = personPos(p, T);
      const yaw = p.speed > 0 ? Math.atan2(p.dx, p.dz) : p.facing;
      const d = dims(p, s, kidClothes);
      const base = 0.15 * onSidewalk(x, z);
      const v = speedNow(p, T);
      const ph = (walked(p, T) / (0.72 * d.H)) * Math.PI + p.phase;
      const amp = p.speed > 0 ? 0.5 * clamp(v / p.speed) : 0;
      const sway = p.speed > 0 ? 0 : 0.03 * Math.sin(T * 1.3 + p.phase);
      const legsBare = kidClothes;
      // legs
      for (const side of [0, 1]) {
        const sx = side ? 1 : -1;
        const sw = sx * Math.sin(ph) * amp;
        local(x, base, z, yaw, sx * d.bodyR * 0.48, d.leg, 0, sw, 0);
        dummy.scale.set(d.bodyR * 0.55, d.leg, d.bodyR * 0.6);
        dummy.updateMatrix();
        legs.current!.setMatrixAt(2 * i + side, dummy.matrix);
        legs.current!.setColorAt(2 * i + side, col.set(legsBare ? p.skin : p.pants));
        // arms (sleeves) swing opposite
        local(x, base, z, yaw, sx * (d.bodyR + 0.045), d.shoulder - 0.04, 0, -sw * 0.8, sx * 0.08);
        dummy.scale.set(0.085, d.arm, 0.085);
        dummy.updateMatrix();
        arms.current!.setMatrixAt(2 * i + side, dummy.matrix);
        arms.current!.setColorAt(2 * i + side, col.set(p.shirt));
        // feet: shoes until they slip off, then socks on small feet
        const footZ = Math.sin(sw) * d.leg;
        local(x, base, z, yaw, sx * d.bodyR * 0.48, 0, footZ + 0.04);
        dummy.translateY(0.04);
        dummy.scale.set(lerp(0.1, 0.075, s), 0.08, d.foot);
        dummy.updateMatrix();
        if (T < SHOE_OFF_T) {
          shoes.current!.setMatrixAt(2 * i + side, dummy.matrix);
          socks.current!.setMatrixAt(2 * i + side, HIDE);
        } else {
          socks.current!.setMatrixAt(2 * i + side, dummy.matrix);
          const r = shoeRest[i][side];
          dummy.position.set(r[0], 0.15 * onSidewalk(r[0], r[2]) + 0.04, r[2]);
          dummy.rotation.set(0, yaw + (side ? 0.5 : -0.3) * ((p.id % 3) - 1), (p.id % 2 ? 0.35 : 0) * side);
          dummy.scale.set(0.1, 0.08, 0.27);
          dummy.updateMatrix();
          shoes.current!.setMatrixAt(2 * i + side, dummy.matrix);
        }
        shoes.current!.setColorAt(2 * i + side, col.set(p.shoe));
        socks.current!.setColorAt(2 * i + side, col.set('#eeeeea'));
      }
      // torso / shirt (capsule: total height = len + 2r)
      const len = Math.max(0.05, d.shirtTop - d.shirtBot - 2 * d.shirtR * 0.6);
      local(x, base, z, yaw, 0, (d.shirtTop + d.shirtBot) / 2, 0, sway, 0);
      dummy.scale.set(d.shirtR * 2, len, d.shirtR * 1.55);
      dummy.updateMatrix();
      torso.current!.setMatrixAt(i, dummy.matrix);
      torso.current!.setColorAt(i, col.set(p.shirt));
      // head + hair
      const hy = d.H - d.headR;
      local(x, base, z, yaw, 0, hy, 0);
      dummy.scale.setScalar(d.headR);
      dummy.updateMatrix();
      heads.current!.setMatrixAt(i, dummy.matrix);
      heads.current!.setColorAt(i, col.set(p.skin));
      local(x, base, z, yaw, 0, hy + d.headR * 0.28, -d.headR * 0.12);
      dummy.scale.set(d.headR * 1.06, d.headR * 0.8, d.headR * 1.08);
      dummy.updateMatrix();
      hair.current!.setMatrixAt(i, dummy.matrix);
      hair.current!.setColorAt(i, col.set(p.hair));
      // adult pants slide off the 6-year-old's hips and pile up at the ankles
      if (T < PANTS_DROP_T) pants.current!.setMatrixAt(i, HIDE);
      else {
        const kidHip = p.kidHeight * 0.44;
        const tf = T - PANTS_DROP_T;
        const top = Math.max(0.09, kidHip - 0.5 * G * tf * tf);
        const puddle = top <= 0.09 ? 1 : 0;
        dummy.position.set(x, base, z);
        dummy.rotation.set(0, yaw, 0);
        const r = lerp(0.2, 0.26, puddle);
        dummy.scale.set(r, top, r * 0.85);
        dummy.updateMatrix();
        pants.current!.setMatrixAt(i, dummy.matrix);
        pants.current!.setColorAt(i, col.set(p.pants));
      }
      // items: held, then dropped (grip -80%), real free fall
      const meshes = {cup: cups, bag: bags, phone: phones};
      for (const k of ['cup', 'bag', 'phone'] as const) if (p.item !== k) meshes[k].current!.setMatrixAt(i, HIDE);
      spills.current!.setMatrixAt(i, HIDE);
      if (p.item) {
        const m = meshes[p.item];
        const hand = (q: Person, TT: number) => {
          const ss = shrinkAmount(TT);
          const dd = dims(q, ss, TT >= PANTS_DROP_T);
          const [qx, qz] = personPos(q, TT);
          const b = 0.15 * onSidewalk(qx, qz);
          if (q.item === 'phone') return local(qx, b, qz, yaw, 0.12, dd.shoulder - 0.08, 0.32), dummy.position.clone();
          return local(qx, b, qz, yaw, dd.bodyR + 0.1, dd.shoulder - dd.arm - (q.item === 'bag' ? 0.12 : 0.02), 0.04), dummy.position.clone();
        };
        const half = p.item === 'cup' ? 0.075 : p.item === 'bag' ? 0.15 : 0.006;
        if (T < p.dropT) {
          const hp = hand(p, T);
          dummy.position.copy(hp);
          dummy.rotation.set(p.item === 'phone' ? -1.1 : 0, yaw, 0);
        } else {
          const h0 = hand(p, p.dropT);
          const vx = p.dx * speedNow(p, p.dropT), vz = p.dz * speedNow(p, p.dropT);
          const tf = T - p.dropT;
          const tLand = Math.sqrt((2 * Math.max(0, h0.y - half)) / G);
          const tt = Math.min(tf, tLand);
          const y = Math.max(half, h0.y - 0.5 * G * tt * tt);
          dummy.position.set(h0.x + vx * tt, y, h0.z + vz * tt);
          const landed = tf >= tLand;
          const tip = landed ? smooth((tf - tLand) / 0.12) : 0;
          dummy.rotation.set(p.item === 'phone' ? -Math.PI / 2 : (Math.PI / 2) * tip, yaw, 0);
          if (landed && p.item === 'bag') dummy.position.y = 0.065 + 0.15 * onSidewalk(dummy.position.x, dummy.position.z);
          if (landed && p.item === 'cup') {
            dummy.position.y = 0.045 + 0.15 * onSidewalk(dummy.position.x, dummy.position.z);
            const sp = smooth((tf - tLand) / 0.35) * 0.3;
            const sx = dummy.position.x, sz = dummy.position.z;
            const q = new THREE.Object3D();
            q.position.set(sx + 0.08, 0.15 * onSidewalk(sx, sz) + 0.006, sz);
            q.scale.set(sp, 1, sp * 0.8);
            q.updateMatrix();
            spills.current!.setMatrixAt(i, q.matrix);
          }
        }
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        m.current!.setMatrixAt(i, dummy.matrix);
        m.current!.setColorAt(i, col.set(p.item === 'cup' ? '#f4efe6' : p.item === 'bag' ? ['#c9a46a', '#2d2d2d', '#b03a3a', '#e6e2d8'][p.id % 4] : '#111111'));
      }
    });
    for (const r of [legs, torso, arms, heads, hair, shoes, socks, pants, cups, bags, phones, spills]) {
      r.current!.instanceMatrix.needsUpdate = true;
      if (r.current!.instanceColor) r.current!.instanceColor.needsUpdate = true;
    }
  });
  return (
    <group>
      {legsEl}{torsoEl}{armsEl}{headsEl}{hairEl}{shoesEl}{socksEl}{pantsEl}{cupsEl}{bagsEl}{phonesEl}{spillsEl}
    </group>
  );
};

// place dummy at a person-local offset (ox right, oy up, oz forward), then pitch/roll
function local(x: number, base: number, z: number, yaw: number, ox: number, oy: number, oz: number, pitch = 0, roll = 0) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  // person faces +z rotated by yaw; right vector = (-cos, 0, sin)... use three's convention
  dummy.position.set(x + ox * c + oz * s, base + oy, z - ox * s + oz * c);
  dummy.rotation.set(pitch, yaw, roll, 'YXZ');
  return dummy;
}

function footWorld(p: Person, T: number) {
  const [x, z] = personPos(p, T);
  const yaw = p.speed > 0 ? Math.atan2(p.dx, p.dz) : p.facing;
  const d = dims(p, shrinkAmount(T), false);
  const ph = (walked(p, T) / (0.72 * d.H)) * Math.PI + p.phase;
  const amp = p.speed > 0 ? 0.5 : 0;
  return [0, 1].map((side) => {
    const sx = side ? 1 : -1;
    const sw = sx * Math.sin(ph) * amp;
    local(x, 0, z, yaw, sx * d.bodyR * 0.48, 0, Math.sin(sw) * d.leg + 0.04);
    return [dummy.position.x, 0, dummy.position.z];
  });
}

export function onSidewalk(x: number, z: number) {
  return Math.abs(x) > 8 && Math.abs(z) > 6 ? 1 : 0;
}

// ============================================================ vehicles ====
const VM = {
  glass: new THREE.MeshStandardMaterial({color: '#1d2733', roughness: 0.15, metalness: 0.4}),
  glassClear: new THREE.MeshStandardMaterial({color: '#7c93a8', roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.32}),
  tyre: new THREE.MeshStandardMaterial({color: '#1b1b1b', roughness: 0.9}),
  rim: new THREE.MeshStandardMaterial({color: '#b9bec4', roughness: 0.4, metalness: 0.5}),
  head: new THREE.MeshStandardMaterial({color: '#fffbe8', emissive: '#fff5d0', emissiveIntensity: 0.6}),
  interior: new THREE.MeshStandardMaterial({color: '#3a3a3e', roughness: 0.9}),
  seat: new THREE.MeshStandardMaterial({color: '#262628', roughness: 0.9}),
  belt: new THREE.MeshStandardMaterial({color: '#9fd8ff', emissive: '#4fb6ff', emissiveIntensity: 0.6, roughness: 0.6}),
  airbag: new THREE.MeshStandardMaterial({color: '#f7f7f4', roughness: 0.7}),
  taxiSign: new THREE.MeshStandardMaterial({color: '#fff6d8', emissive: '#ffe9a8', emissiveIntensity: 0.4}),
};
// cached so re-rendering every frame doesn't allocate new materials
const _paint = new Map<string, THREE.MeshStandardMaterial>();
const paint = (c: string) => {
  if (!_paint.has(c)) _paint.set(c, new THREE.MeshStandardMaterial({color: c, roughness: 0.45, metalness: 0.15}));
  return _paint.get(c)!;
};
const _brake = new Map<number, THREE.MeshStandardMaterial>();
const brakeMat = (on: number) => {
  const k = Math.round(on * 10);
  if (!_brake.has(k)) _brake.set(k, new THREE.MeshStandardMaterial({color: '#7a0c0c', emissive: '#ff1a1a', emissiveIntensity: (k / 10) * 3.2 + 0.15}));
  return _brake.get(k)!;
};

type Spec = {w: number; bodyH: number; bodyY: number; cabH: number; cabLen: number; cabZ: number; wheelR: number; wheelInset: number};
const SPECS: Record<Vehicle['kind'], Spec> = {
  car: {w: 1.85, bodyH: 0.62, bodyY: 0.34, cabH: 0.58, cabLen: 2.3, cabZ: -0.15, wheelR: 0.33, wheelInset: 0.85},
  taxi: {w: 1.86, bodyH: 0.64, bodyY: 0.34, cabH: 0.6, cabLen: 2.4, cabZ: -0.2, wheelR: 0.33, wheelInset: 0.85},
  suv: {w: 1.98, bodyH: 0.85, bodyY: 0.42, cabH: 0.72, cabLen: 3.0, cabZ: -0.35, wheelR: 0.4, wheelInset: 0.95},
  bus: {w: 2.55, bodyH: 2.55, bodyY: 0.38, cabH: 0, cabLen: 0, cabZ: 0, wheelR: 0.5, wheelInset: 2.2},
  truck: {w: 2.4, bodyH: 2.4, bodyY: 0.5, cabH: 0, cabLen: 0, cabZ: 0, wheelR: 0.48, wheelInset: 1.4},
};

const Wheels: React.FC<{v: Vehicle; spin: number}> = ({v, spin}) => {
  const s = SPECS[v.kind];
  const zs = [v.len / 2 - s.wheelInset, -v.len / 2 + s.wheelInset];
  return (
    <>
      {zs.flatMap((z) =>
        [1, -1].map((sx) => (
          <group key={`${z}${sx}`} position={[sx * (s.w / 2 - 0.12), s.wheelR, z]} rotation-x={spin}>
            <mesh rotation-z={Math.PI / 2} material={VM.tyre} castShadow><cylinderGeometry args={[s.wheelR, s.wheelR, 0.26, 16]} /></mesh>
            <mesh rotation-z={Math.PI / 2} position={[sx * 0.135, 0, 0]} material={VM.rim}><cylinderGeometry args={[s.wheelR * 0.55, s.wheelR * 0.55, 0.02, 10]} /></mesh>
          </group>
        )),
      )}
    </>
  );
};

// seated driver, adult -> age 6. Local car frame: +z forward, driver on +x side.
const Driver: React.FC<{s: number; seatZ: number; seatY: number; x: number; p: {skin: string; shirt: string; pants: string; hair: string}; airbagHit: number}> = ({s, seatZ, seatY, x, p, airbagHit}) => {
  const sit = lerp(0.9, 0.62, s); // sitting height (seat to head top)
  const shoulder = seatY + sit - lerp(0.29, 0.24, s);
  const headR = lerp(0.112, 0.104, s);
  const headY = seatY + sit - headR;
  const thigh = lerp(0.5, 0.33, s), shin = lerp(0.48, 0.3, s);
  const torsoR = lerp(0.19, 0.17, s); // adult shirt stays big
  const lean = -0.12 * airbagHit; // head pushed back by the airbag
  return (
    <group position={[x, 0, seatZ]}>
      <mesh position={[0, (seatY + shoulder) / 2 + 0.04, -0.02]} rotation-x={lean} material={paint(p.shirt)} castShadow>
        <capsuleGeometry args={[torsoR, Math.max(0.05, shoulder - seatY - 2 * torsoR + 0.1), 4, 10]} />
      </mesh>
      <mesh position={[0, headY, 0.02 + lean * 0.6]} material={paint(p.skin)}><sphereGeometry args={[headR, 16, 12]} /></mesh>
      <mesh position={[0, headY + headR * 0.3, -0.01 + lean * 0.6]} scale={[1.06, 0.8, 1.08]} material={paint(p.hair)}><sphereGeometry args={[headR, 14, 10]} /></mesh>
      {[-1, 1].map((sx) => (
        <group key={sx} position={[sx * 0.1, seatY + 0.08, 0.05]}>
          {/* thigh forward, shin down: a 6-year-old's feet dangle far from the pedals */}
          <mesh position={[0, 0, thigh / 2]} material={paint(s > 0.5 ? p.skin : p.pants)}><boxGeometry args={[0.13, 0.13, thigh]} /></mesh>
          <mesh position={[0, -shin / 2, thigh]} material={paint(s > 0.5 ? p.skin : p.pants)}><boxGeometry args={[0.11, shin, 0.11]} /></mesh>
          <mesh position={[0, -shin, thigh + 0.06]} material={paint('#eeeeea')}><boxGeometry args={[0.09, 0.07, lerp(0.27, 0.17, s)]} /></mesh>
        </group>
      ))}
      {/* arms reach for the wheel (adult) or rest on the lap (kid) */}
      {[-1, 1].map((sx) => (
        <mesh key={`a${sx}`} position={[sx * (torsoR + 0.04), shoulder - 0.18, lerp(0.22, 0.12, s)]} rotation-x={lerp(-1.0, -0.4, s)} material={paint(p.shirt)}>
          <capsuleGeometry args={[0.045, lerp(0.42, 0.28, s), 4, 8]} />
        </mesh>
      ))}
    </group>
  );
};

const Vehicle3D: React.FC<{v: Vehicle; T: number; cutaway: boolean}> = ({v, T, cutaway}) => {
  const s = SPECS[v.kind];
  const {pos, rotY, front} = vehiclePose(v, T);
  const body = useMemo(() => paint(v.color), [v.color]);
  const dist = v.axis === 'z' ? front : front * v.dir;
  const spin = dist / s.wheelR;
  const braking = v.aeb ? (T >= AEB_T ? 1 : 0) : v.kind === 'bus' ? (T >= BACK_T + 0.4 ? 1 : 0) : T >= BACK_T + 0.5 ? 1 : 0;
  const shrink = shrinkAmount(T);
  // impact jolt (pitch) for SUV + taxi
  const jolt = v.id === 'suv' || v.id === 'taxi' ? Math.exp(-Math.max(0, T - HIT_T) * 9) * (T >= HIT_T ? 1 : 0) : 0;
  const pitch = (v.id === 'suv' ? -0.035 : 0.05) * jolt * Math.sin((T - HIT_T) * 60);
  const brakeDive = v.aeb && T >= AEB_T && T < HIT_T + 0.4 ? 0.025 : 0;
  const L = v.len;
  const isBox = v.kind === 'bus' || v.kind === 'truck';
  const seatZ = L / 2 - 2.15;
  const seatY = s.bodyY + 0.3;
  const airbag = v.id === 'taxi' ? smooth((T - HIT_T - 0.04) / 0.035) * (1 - 0.35 * smooth((T - HIT_T - 0.5) / 0.6)) : 0;
  const hazard = v.kind === 'truck' && Math.floor(T * 1.6) % 2 === 0 ? 1 : 0;
  return (
    <group position={pos} rotation-y={rotY}>
      <group rotation-x={pitch + brakeDive}>
        {isBox ? (
          <>
            <mesh position={[0, s.bodyY + s.bodyH / 2, 0]} material={body} castShadow receiveShadow><boxGeometry args={[s.w, s.bodyH, L]} /></mesh>
            {v.kind === 'bus' && (
              <>
                {[1, -1].map((sx) => (
                  <mesh key={sx} position={[sx * (s.w / 2 + 0.005), s.bodyY + s.bodyH * 0.62, -0.3]} rotation-y={sx * Math.PI / 2} material={VM.glass}><planeGeometry args={[L - 2.2, 0.9]} /></mesh>
                ))}
                <mesh position={[0, s.bodyY + s.bodyH * 0.58, L / 2 + 0.005]} material={VM.glass}><planeGeometry args={[s.w - 0.3, 1.3]} /></mesh>
                <mesh position={[0, s.bodyY + 0.35, 0]} material={paint('#e9edf2')}><boxGeometry args={[s.w + 0.01, 0.5, L + 0.01]} /></mesh>
              </>
            )}
            {v.kind === 'truck' && (
              <mesh position={[0, s.bodyY + 1.0, L / 2 + 0.9]} material={paint('#e2e2de')} castShadow><boxGeometry args={[s.w, 2.0, 1.8]} /></mesh>
            )}
          </>
        ) : (
          <>
            {/* lower body: driver side (+x) panel omitted in cutaway shots */}
            <mesh position={[0, s.bodyY + 0.06, 0]} material={body} castShadow receiveShadow><boxGeometry args={[s.w, 0.12, L]} /></mesh>
            <mesh position={[-s.w / 2 + 0.05, s.bodyY + s.bodyH / 2, 0]} material={body} castShadow><boxGeometry args={[0.1, s.bodyH, L]} /></mesh>
            {!cutaway && <mesh position={[s.w / 2 - 0.05, s.bodyY + s.bodyH / 2, 0]} material={body} castShadow><boxGeometry args={[0.1, s.bodyH, L]} /></mesh>}
            {cutaway && <mesh position={[s.w / 2 - 0.05, s.bodyY + s.bodyH / 2, -L / 2 + 0.6]} material={body}><boxGeometry args={[0.1, s.bodyH, 1.2]} /></mesh>}
            <mesh position={[0, s.bodyY + s.bodyH / 2, L / 2 - 0.55]} material={body} castShadow><boxGeometry args={[s.w, s.bodyH, 1.1]} /></mesh>
            <mesh position={[0, s.bodyY + s.bodyH / 2, -L / 2 + 0.45]} material={body} castShadow><boxGeometry args={[s.w, s.bodyH, 0.9]} /></mesh>
            {/* cabin: roof, pillars, glass */}
            <group position={[0, s.bodyY + s.bodyH, s.cabZ]}>
              <mesh position={[0, s.cabH - 0.04, 0]} material={body} castShadow><boxGeometry args={[s.w - 0.12, 0.08, s.cabLen]} /></mesh>
              {[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([sx, sz]) => (
                <mesh key={`${sx}${sz}`} position={[sx * (s.w / 2 - 0.1), s.cabH / 2, sz * (s.cabLen / 2 - 0.06)]} material={body}><boxGeometry args={[0.08, s.cabH, 0.1]} /></mesh>
              ))}
              <mesh position={[0, s.cabH / 2, s.cabLen / 2 - 0.02]} rotation-x={-0.35} material={v.kind === 'suv' ? VM.glassClear : VM.glass}><planeGeometry args={[s.w - 0.25, s.cabH * 1.05]} /></mesh>
              <mesh position={[0, s.cabH / 2, -s.cabLen / 2 + 0.02]} rotation-y={Math.PI} material={VM.glass}><planeGeometry args={[s.w - 0.25, s.cabH * 0.95]} /></mesh>
              <mesh position={[-s.w / 2 + 0.06, s.cabH / 2, 0]} rotation-y={-Math.PI / 2} material={VM.glass}><planeGeometry args={[s.cabLen - 0.2, s.cabH * 0.9]} /></mesh>
              {!cutaway && <mesh position={[s.w / 2 - 0.06, s.cabH / 2, 0]} rotation-y={Math.PI / 2} material={VM.glass}><planeGeometry args={[s.cabLen - 0.2, s.cabH * 0.9]} /></mesh>}
              {v.kind === 'taxi' && <mesh position={[0, s.cabH + 0.12, 0]} material={VM.taxiSign}><boxGeometry args={[0.7, 0.2, 0.28]} /></mesh>}
            </group>
            {/* interior (only seen through the cutaway / clear windscreen) */}
            {(cutaway || v.kind === 'suv') && (
              <group>
                <mesh position={[0, s.bodyY + 0.13, 0]} material={VM.interior}><boxGeometry args={[s.w - 0.2, 0.02, L - 0.4]} /></mesh>
                <mesh position={[0.42, seatY - 0.1, seatZ]} material={VM.seat}><boxGeometry args={[0.55, 0.22, 0.55]} /></mesh>
                <mesh position={[0.42, seatY + 0.35, seatZ - 0.3]} rotation-x={-0.18} material={VM.seat}><boxGeometry args={[0.55, 0.85, 0.14]} /></mesh>
                <mesh position={[0, s.bodyY + s.bodyH - 0.08, L / 2 - 1.2]} material={VM.interior}><boxGeometry args={[s.w - 0.2, 0.3, 0.45]} /></mesh>
                <mesh position={[0.42, s.bodyY + s.bodyH + 0.05, seatZ + 0.62]} rotation-x={-1.15} material={VM.tyre}><torusGeometry args={[0.19, 0.03, 8, 22]} /></mesh>
                {/* pedals */}
                {[0.32, 0.52].map((px) => (
                  <mesh key={px} position={[px, s.bodyY + 0.24, seatZ + 1.02]} rotation-x={-0.5} material={VM.rim}><boxGeometry args={[0.08, 0.16, 0.03]} /></mesh>
                ))}
                {/* seat belt from the B-pillar anchor to the buckle */}
                <BeltStrap from={[0.78, seatY + 0.66, seatZ - 0.22]} to={[0.16, seatY + 0.05, seatZ + 0.05]} />
                <Driver s={shrink} seatZ={seatZ} seatY={seatY + 0.01} x={0.42}
                  p={v.id === 'taxi' ? {skin: '#c68863', shirt: '#3a6ea5', pants: '#2a3348', hair: '#1a1a1a'} : {skin: '#f1c7a5', shirt: '#e8e8e8', pants: '#33475b', hair: '#7a5a3a'}}
                  airbagHit={airbag} />
                {airbag > 0.001 && (
                  <mesh position={[0.42, s.bodyY + s.bodyH + 0.08, seatZ + 0.52 - 0.12 * airbag]} scale={[airbag, airbag * 0.9, airbag * 0.75]} material={VM.airbag}>
                    <sphereGeometry args={[0.34, 18, 14]} />
                  </mesh>
                )}
              </group>
            )}
            {/* lights */}
            {[1, -1].map((sx) => (
              <group key={sx}>
                <mesh position={[sx * (s.w / 2 - 0.3), s.bodyY + s.bodyH - 0.18, L / 2 + 0.006]} material={VM.head}><planeGeometry args={[0.35, 0.14]} /></mesh>
                <mesh position={[sx * (s.w / 2 - 0.3), s.bodyY + s.bodyH - 0.18, -L / 2 - 0.006]} rotation-y={Math.PI} material={brakeMat(braking)}><planeGeometry args={[0.32, 0.16]} /></mesh>
              </group>
            ))}
          </>
        )}
        {v.kind === 'truck' && [1, -1].map((sx) => (
          <mesh key={`hz${sx}`} position={[sx * (s.w / 2 - 0.25), s.bodyY + 0.5, -L / 2 - 0.01]} rotation-y={Math.PI} material={brakeMat(hazard * 0.8)}><planeGeometry args={[0.3, 0.2]} /></mesh>
        ))}
      </group>
      <Wheels v={v} spin={spin} />
    </group>
  );
};

const BeltStrap: React.FC<{from: [number, number, number]; to: [number, number, number]}> = ({from, to}) => {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const len = a.distanceTo(b);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return (
    <mesh position={mid} quaternion={q} material={VM.belt}>
      <boxGeometry args={[0.05, len, 0.012]} />
    </mesh>
  );
};

export const Vehicles: React.FC<{T: number; cutawayTaxi: boolean}> = ({T, cutawayTaxi}) => (
  <group>
    {VEHICLES.map((v) => <Vehicle3D key={v.id} v={v} T={T} cutaway={cutawayTaxi && v.id === 'taxi'} />)}
  </group>
);

// ============================================================= effects ====
const arcMat = new THREE.MeshBasicMaterial({color: '#6fe3ff', transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, toneMapped: false});
const rulerMat = new THREE.MeshBasicMaterial({color: '#9fd8ff', toneMapped: false});

export const Effects: React.FC<{T: number; t: number}> = ({T, t}) => {
  const suv = vehicle('suv');
  const {pos, front} = vehiclePose(suv, T);
  // autobrake "sensor" arcs fanning out ahead of the SUV
  const arcsOn = T > AEB_T - 0.35 && T < HIT_T + 0.3;
  const arcs = arcsOn
    ? [0, 1, 2].map((k) => {
        const ph = ((T - (AEB_T - 0.35)) * 2.2 + k / 3) % 1;
        return {r: 0.6 + ph * 6.5, o: (1 - ph) * 0.75};
      })
    : [];
  // ruler: how far a car goes in ONE second at 25 mph (37 ft = 11.18 m)
  const rulerOn = t >= 27.3 && t < 32.0;
  const rz = rulerOn ? vehiclePose(suv, Math.max(2.0, Math.min(T, 2.6))).front : 0;
  const grow = smooth((t - 27.3) / 1.2);
  return (
    <group>
      {arcs.map((a, i) => (
        <mesh key={i} position={[pos[0], 0.55, front + 0.05]} rotation-x={-Math.PI / 2} rotation-z={Math.PI}>
          <ringGeometry args={[a.r, a.r + 0.07, 32, 1, Math.PI / 2 - 0.55, 1.1]} />
          <meshBasicMaterial color="#6fe3ff" transparent opacity={a.o} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      {rulerOn && (
        <group position={[pos[0] + RULER_X_OFFSET, 0.03, rz]}>
          <mesh position={[0, 0, (MPH25 * grow) / 2]} material={rulerMat}><boxGeometry args={[0.08, 0.02, MPH25 * grow]} /></mesh>
          <mesh position={[0, 0, 0]} material={rulerMat}><boxGeometry args={[0.6, 0.02, 0.08]} /></mesh>
          {grow > 0.98 && <mesh position={[0, 0, MPH25]} material={rulerMat}><boxGeometry args={[0.6, 0.02, 0.08]} /></mesh>}
        </group>
      )}
    </group>
  );
};
export const RULER_X_OFFSET = 0;
export {arcMat};
