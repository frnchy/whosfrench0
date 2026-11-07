// Screen time t (seconds of video) -> real time T (seconds of the 5-second event).
// T = 0 is the moment everyone turns 6, T = 5 is the switch back.
import story from '../../story.json';

export const FPS = story.fps;
export const DURATION = story.duration;
export const NF = Math.round(FPS * DURATION);
export const B = story.beats;
export const LOOP_FRAME = Math.round(B.loopCut * FPS);

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (x: number) => {
  const u = clamp(x);
  return u * u * (3 - 2 * u);
};
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const easeInOut = (u: number) => {
  u = clamp(u);
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
};
export const easeOut = (u: number) => 1 - Math.pow(1 - clamp(u), 3);

// playback rate (real seconds per screen second)
function rate(t: number): number {
  if (t < B.slowStart) return 1;
  if (t < B.t0) return lerp(1, 1 / 8, smooth((t - B.slowStart) / (B.t0 - B.slowStart)));
  if (t < 40) return 1 / 8;
  if (t < 46) return 1 / 6;
  if (t < 47.5) return lerp(1 / 6, 1, smooth((t - 46) / 1.5));
  return 1;
}

const STEP = 1 / 1200;
const N = Math.ceil(DURATION / STEP) + 2;
const table = new Float64Array(N);
(() => {
  let acc = 0;
  for (let i = 0; i < N; i++) {
    table[i] = acc;
    const t = i * STEP;
    acc += rate(t + STEP / 2) * STEP;
  }
  const at0 = table[Math.round(B.t0 / STEP)];
  for (let i = 0; i < N; i++) table[i] -= at0;
})();

export function realTime(t: number): number {
  const x = clamp(t / STEP, 0, N - 1.001);
  const i = Math.floor(x);
  return lerp(table[i], table[i + 1], x - i);
}

// Deterministic RNG
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// which "second" of the five (1..5) we are in, or 0 outside
export function secondIndex(t: number): number {
  const s = B.seconds;
  for (let i = 0; i < 5; i++) if (t >= s[i] && t < s[i + 1]) return i + 1;
  return 0;
}
