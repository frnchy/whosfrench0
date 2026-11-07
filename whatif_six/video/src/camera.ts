// Shot list. cameraAt(t) is used by the 3D rig AND by the 2D overlay
// (to project world points such as the 37-ft ruler label onto the screen).
import * as THREE from 'three';
import {easeInOut, lerp, realTime, smooth} from './time';
import {vehicle, vehiclePose, HIT_T, TAXI_LEN} from './sim';

export type Cam = {pos: [number, number, number]; target: [number, number, number]; fov: number; shot: number; shake: number; cutaway: boolean};

const V = (a: number[], b: number[], u: number) => a.map((x, i) => lerp(x, b[i], u)) as [number, number, number];

function taxiDriverCam(T: number, dolly: number): Pick<Cam, 'pos' | 'target'> {
  const taxi = vehicle('taxi');
  const {pos} = vehiclePose(taxi, T);
  const seatZ = pos[2] + TAXI_LEN / 2 - 2.15;
  const x = taxi.lane + 0.42; // driver sits on the +x side
  return {
    pos: [x + lerp(4.9, 4.3, dolly), 1.12, seatZ + 0.45],
    target: [x, 0.92, seatZ + 0.42],
  };
}

export function cameraAt(t: number): Cam {
  const T = realTime(t);
  // 1. drone push-in, title on screen
  if (t < 3.0) {
    const u = easeInOut(t / 3.0);
    return {pos: V([1.5, 46, 44], [3.5, 26, 22], u), target: [-1, 0, -16], fov: 40, shot: 1, shake: 0, cutaway: false};
  }
  // 2. descend to the north-east corner; time eases into slow motion
  if (t < 7.5) {
    const u = easeInOut((t - 3.0) / 4.5);
    return {pos: V([13, 10.5, 5], [10.2, 3.6, -2.2], u), target: V([-4, 1, -14], [-2.4, 0.9, -9.6], u), fov: 40, shot: 2, shake: 0, cutaway: false};
  }
  // 3. street level beside the crosswalk walkers: the shrink, pants, shoes, drops
  if (t < 16) {
    const u = easeInOut((t - 7.5) / 8.5);
    return {pos: V([7.4, 1.6, -2.6], [6.6, 1.6, -3.2], u), target: [-1.0, 1.45, -9.0], fov: 36, shot: 3, shake: 0, cutaway: false};
  }
  // 4. inside the taxi (door cut away): belt across the neck, feet far from the pedals
  if (t < 24) {
    const c = taxiDriverCam(T, smooth((t - 16) / 8));
    return {...c, fov: 36, shot: 4, shake: 0, cutaway: true};
  }
  // 5. low tracking shot alongside the SUV: 37 ft every second
  if (t < 32) {
    const suv = vehicle('suv');
    const f = vehiclePose(suv, T).front;
    return {pos: [suv.lane + 2.6, 1.45, f - 5.6], target: [suv.lane - 0.5, 0.55, f + 7], fov: 46, shot: 5, shake: 0, cutaway: false};
  }
  // 6. HERO: low behind the kids on the crosswalk, SUV autobrakes toward camera
  if (t < 40) {
    const u = easeInOut((t - 32) / 8);
    return {pos: V([1.9, 1.6, -2.9], [1.4, 1.5, -3.7], u), target: [-1.7, 0.8, -14.5], fov: 42, shot: 6, shake: 0, cutaway: false};
  }
  // 7a. front three-quarter: the taxi closes in, impact at T=4.25 (t=41.5)
  if (t < 41.72) {
    const u = (t - 40) / 1.72;
    const hitShake = T >= HIT_T ? Math.exp(-(T - HIT_T) * 25) : 0;
    return {pos: V([2.6, 1.55, -7.4], [2.3, 1.5, -8.0], u), target: [-1.75, 0.9, -17.5], fov: 40, shot: 7, shake: hitShake, cutaway: false};
  }
  // 7b. back inside the taxi for the airbag
  if (t < 44.6) {
    const c = taxiDriverCam(T, 1);
    const hitShake = Math.exp(-Math.max(0, T - HIT_T) * 14);
    return {...c, fov: 38, shot: 8, shake: hitShake * 0.8, cutaway: true};
  }
  // 7c. crane wide for the switch back at t=46
  if (t < 46.8) {
    const u = easeInOut((t - 44.6) / 2.2);
    return {pos: V([10.5, 5.2, -1.0], [12.0, 8.0, 3.0], u), target: [-1.2, 0.6, -9.2], fov: 40, shot: 9, shake: 0, cutaway: false};
  }
  // 8–9. aftermath at normal speed (dimmed under the head-size diagram)
  if (t < 55.6) {
    const u = easeInOut((t - 46.8) / 8.8);
    return {pos: V([6.6, 2.5, -2.4], [5.6, 2.2, -3.4], u), target: [-1.4, 0.8, -9.0], fov: 40, shot: 10, shake: 0, cutaway: false};
  }
  // 10. crane up toward the opening framing (the loop cut lands on frame 0)
  const u = easeInOut((t - 55.6) / 4.0);
  return {pos: V([6.0, 3.0, -2.5], [1.8, 43, 41], u), target: V([-1.4, 0.8, -9.0], [-1, 0, -16], u), fov: 40, shot: 11, shake: 0, cutaway: false};
}

// Project a world point to screen pixels for a given camera state.
const _cam = new THREE.PerspectiveCamera(40, 1080 / 1920, 0.3, 1500);
export function project(c: Cam, p: [number, number, number], W = 1080, H = 1920) {
  _cam.fov = c.fov;
  _cam.position.set(...c.pos);
  _cam.lookAt(...c.target);
  _cam.updateProjectionMatrix();
  _cam.updateMatrixWorld(true);
  const v = new THREE.Vector3(...p).project(_cam);
  return {x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H, visible: v.z < 1};
}
