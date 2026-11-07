import React, {useEffect, useLayoutEffect, useMemo, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import '@fontsource/eb-garamond/500.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/700.css';
import {FPS, LOOP_FRAME, realTime} from './time';
import {cameraAt, Cam} from './camera';
import {City, billboardMaterials} from './city';
import {People, Vehicles, Effects} from './actors';
import {Overlay} from './overlay';

const Rig: React.FC<{cam: Cam; t: number}> = ({cam, t}) => {
  const {camera} = useThree();
  useLayoutEffect(() => {
    const c = camera as THREE.PerspectiveCamera;
    const k = cam.shake * 0.07;
    const n = (a: number) => Math.sin(t * 91.7 + a) * Math.sin(t * 57.3 + a * 2.1);
    c.position.set(cam.pos[0] + k * n(1), cam.pos[1] + k * n(2), cam.pos[2] + k * n(3));
    c.lookAt(cam.target[0], cam.target[1], cam.target[2]);
    c.fov = cam.fov;
    c.near = 0.05;
    c.far = 1500;
    c.updateProjectionMatrix();
  });
  return null;
};

const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
  uniforms: {top: {value: new THREE.Color('#86aed6')}, bottom: {value: new THREE.Color('#e3ecf3')}},
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(vP.y*1.6, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, pow(h, 0.8)), 1.0); }',
});

const World: React.FC<{t: number; T: number; cam: Cam}> = ({t, T, cam}) => {
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0, 0, -18);
    return o;
  }, []);
  billboardMaterials.forEach((m) => (m.uniforms.uTime.value = T + 9));
  return (
    <>
      <Rig cam={cam} t={t} />
      <fog attach="fog" args={['#d6e1ea', 140, 620]} />
      <mesh material={skyMat} renderOrder={-1}>
        <sphereGeometry args={[1000, 24, 12]} />
      </mesh>
      <hemisphereLight args={['#eef4fa', '#9a9080', 1.6]} />
      <ambientLight intensity={0.35} />
      <primitive object={target} />
      <directionalLight
        position={[-45, 95, 22]}
        target={target}
        intensity={2.3}
        color="#fff1dc"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-55}
        shadow-camera-right={55}
        shadow-camera-top={55}
        shadow-camera-bottom={-55}
        shadow-camera-near={1}
        shadow-camera-far={260}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      <City />
      <People T={T} />
      <Vehicles T={T} cutawayTaxi={cam.cutaway} />
      <Effects T={T} t={t} />
    </>
  );
};

export const Video: React.FC = () => {
  const frame = useCurrentFrame();
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    Promise.all([
      document.fonts.load('500 86px "EB Garamond"'),
      document.fonts.load('500 26px Inter'),
      document.fonts.load('700 86px Inter'),
    ]).then(() => continueRender(handle));
  }, [handle]);
  // the last 0.4 s replays the opening so the video loops seamlessly
  const f = frame >= LOOP_FRAME ? frame - LOOP_FRAME : frame;
  const t = f / FPS;
  const T = realTime(t);
  const cam = cameraAt(t);
  return (
    <AbsoluteFill style={{background: '#d6e1ea'}}>
      <ThreeCanvas
        width={1080}
        height={1920}
        shadows
        gl={{antialias: true, preserveDrawingBuffer: true}}
        camera={{fov: 40, near: 0.05, far: 1500, position: [20, 50, 40]}}
        onCreated={({gl}) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <World t={t} T={T} cam={cam} />
      </ThreeCanvas>
      <Overlay t={t} T={T} cam={cam} />
    </AbsoluteFill>
  );
};
