// "Et si les 200 anges revenaient ce soir ?" — what-if hook short. Shot plan, blocking and acting, keyed to the VO timeline.
import { NEUTRAL, blinkAt, camPath, groundAt, idle, posePath, ramp, SUMMIT_Y } from "./common.ts";
import type { Arm, Cam, CamKey, Char, Frame, Fx, Pose, PoseKey, SetName, V3 } from "./common.ts";
import type { Timeline } from "./ep1.ts";

type Mouth = Record<string, number[]>;
const SPEAKER: Record<string, string> = { MAX: "max" };

export const makeEp3 = (tl: Timeline, mouth: Mouth) => {
  const L = (k: number) => tl.lines[k - 1];
  const s = (k: number) => L(k).start, e = (k: number) => L(k).start + L(k).duration;
  const T = tl.duration;

  const shots: [string, SetName, number, number][] = [
    ["A_pov", "mountain", 0, s(2) - 0.1],
    ["B_landing", "mountain", s(2) - 0.1, s(3) - 0.1],
    ["C_views", "city", s(3) - 0.1, s(4) - 0.1],
    ["D_selfie", "city", s(4) - 0.1, s(5) - 0.1],
    ["E_forge", "forge", s(5) - 0.1, s(6) - 0.1],
    ["F_tuto", "forge", s(6) - 0.1, s(7) - 0.1],
    ["G_horoscope", "city", s(7) - 0.1, s(8) - 0.1],
    ["H_giant", "city", s(8) - 0.1, s(9) - 0.1],
    ["I_max_giant", "city", s(9) - 0.1, s(10) - 0.1],
    ["J_store", "city", s(10) - 0.1, s(11) - 0.1],
    ["K_cry", "city", s(11) - 0.1, s(12) - 0.1],
    ["L_pillars", "city", s(12) - 0.1, s(13) - 0.1],
    ["M_uber", "city", s(13) - 0.1, s(14) - 0.1],
    ["N_end", "mountain", s(14) - 0.1, T + 1],
  ];
  const cuts = shots.slice(1).map((x) => Math.ceil(x[2] * tl.fps - 1e-9));
  const speakingMouth = (id: string, t: number) => {
    const k = tl.lines.findIndex((l) => SPEAKER[l.speaker] === id && t >= l.start && t < l.start + l.duration);
    return k < 0 ? 0 : mouth[String(k + 1)][Math.floor((t - tl.lines[k].start) * tl.fps)] ?? 0;
  };
  const look = (yaw: number, pitch: number): Partial<Pose> => ({ head: [yaw, pitch] });
  const A = (p: number, r: number, el: number): Arm => [p, r, el];
  const pose = (id: string, t: number, f: number, keys: PoseKey[], m: number): Pose => ({ ...idle(id, t, posePath(t, NEUTRAL, keys)), mouth: m, blink: blinkAt(id, f) });
  const C = (pos: V3, target: V3, fov = 40): Cam => ({ pos, target, fov });
  const head = (p: V3, H: number): V3 => [p[0], p[1] + H * 0.93, p[2]];

  // ---------- blocking ----------
  const MAX_CITY: V3 = [0, 0, 0];
  const GIANT: V3 = [70, 0, -760];
  const FORGE_MAX: V3 = [-0.9, 0, 0.7];
  const START = C([34, 26, 168], [0, 72, 0], 46);   // frame 0 and loop: a phone's view of Hermon at night

  const CAMS: Record<string, { keys: CamKey[]; shake?: number }> = {
    A_pov: { keys: [[0, START], [s(2) - 0.1, C([30, 25, 150], [0, 66, 0], 44)]] },
    B_landing: { keys: [[s(2), C([16, SUMMIT_Y + 9, 46], [0, SUMMIT_Y + 3, 0], 46)], [s(3), C([11, SUMMIT_Y + 6, 30], [0, SUMMIT_Y + 2.5, 0], 44)]], shake: 0.03 },
    C_views: { keys: [[s(3), C([0.7, 1.75, 1.8], [-6, 30, -1200], 40)], [s(4), C([0.6, 1.72, 1.4], [-4, 40, -1200], 38)]] },
    D_selfie: { keys: [[s(4), C([0.05, 1.68, 0.62], head(MAX_CITY, 1.78), 44)], [s(5), C([0.05, 1.68, 0.58], head(MAX_CITY, 1.78), 44)]], shake: 0.04 },
    E_forge: { keys: [[s(5), C([-0.6, 2.0, 4.2], [0.6, 1.4, -0.8], 44)], [s(6), C([-0.4, 1.9, 3.5], [0.6, 1.45, -0.8], 42)]] },
    F_tuto: { keys: [[s(6), C([-0.75, 1.6, 2.1], head(FORGE_MAX, 1.78), 34)], [s(7), C([-0.78, 1.6, 1.85], head(FORGE_MAX, 1.78), 32)]] },
    G_horoscope: { keys: [[s(7), C([1.6, 0.9, 6.2], [0, 3, 0], 50)], [s(8), C([1.3, 0.7, 5.4], [-0.3, 4, 0], 54)]] },
    H_giant: { keys: [[s(8), C([0, 1.5, 12], [10, 4, -60], 52)], [s(8) + 3.2, C([0, 1.4, 12], [60, 700, -760], 60)], [s(9), C([0, 1.4, 12], [62, 900, -760], 62)]], shake: 0.03 },
    I_max_giant: { keys: [[s(9), C([0.3, 0.95, 1.6], [0.1, 2.5, -1.0], 60)], [s(10), C([0.3, 0.9, 1.45], [0.12, 2.6, -1.0], 60)]] },
    J_store: { keys: [[s(10), C([4, 2.2, 10], [-11, 4, -18], 50)], [s(11), C([3, 1.8, 6], [-11, 4.5, -18], 50)]], shake: 0.02 },
    K_cry: { keys: [[s(11), C([0, 3, 10], [0, 8, -40], 48)], [s(12), C([0, 30, 40], [0, 70, -60], 54)]] },
    L_pillars: { keys: [[s(12), C([4, 2.5, 14], [-4, 20, -80], 56)], [s(13), C([3, 2.0, 11], [-4, 26, -80], 56)]] },
    M_uber: { keys: [[s(13), C([0.1, 1.75, 4.8], [0.2, 1.75, 0], 44)], [s(14), C([0.1, 1.72, 4.3], [0.2, 1.75, 0], 44)]] },
    N_end: { keys: [[s(14), C([16, SUMMIT_Y + 9, 46], [0, SUMMIT_Y + 3, 0], 46)], [T - 1.4, START], [T + 1, START]] },
  };

  const fxAt = (t: number, shot: string): Fx => ({
    streaks: shot === "A_pov" || shot === "B_landing" ? ramp(t, 0.4, s(2) + 1.6) : 0,
    lightning: 0, flash: shot === "B_landing" ? Math.max(0, 1 - Math.abs(t - (s(2) + 1.5)) * 2.5) : 0,
    shock: shot === "B_landing" ? ramp(t, s(2) + 1.4, s(2) + 3.4) : 0, pillar: 0,
    crowdRaise: shot === "B_landing" ? ramp(t, s(2) + 1.6, s(2) + 2.4) * 0.15 + (t > s(2) + 1.6 ? 0.01 : 0) : 0, crowdLook: 0, crowd: 0, feathers: 0,
    mountainGlow: shot === "C_views" || shot === "H_giant" ? 1 : 0,
    sparks: shot === "E_forge" || shot === "F_tuto" ? 0.8 : 0, forgeGlow: 1,
    constellation: shot === "G_horoscope" ? ramp(t, s(7) + 0.4, e(7)) : 0,
    cries: shot === "K_cry" ? ramp(t, s(11) + 0.2, s(11) + 1.2) : 0,
    fight: shot === "K_cry" ? 1 : 0,
    pillars: shot === "L_pillars" ? ramp(t, s(12) + 0.2, e(12) + 0.2) : shot === "M_uber" ? 1 : 0,
    storeLights: shot === "J_store" ? 1 - ramp(t, s(10) + 3.2, s(10) + 4.6) : shot === "K_cry" || shot === "L_pillars" || shot === "M_uber" ? 0.15 : 1,
  });

  const maxPose = (t: number, f: number, keys: PoseKey[]) => pose("max", t, f, keys, speakingMouth("max", t));
  const charsAt = (t: number, f: number, shot: string, set: SetName): Char[] => {
    const giant: Char = { id: "giant", kind: "giant", pos: GIANT, yaw: -0.15, pose: pose("giant", t, f, [[0, { ...look(0.2, -0.25), brow: -0.6, lean: 0.06 }], [s(10), { ...look(-0.3, -0.35), lean: 0.12, rArm: A(0.9, 0.2, 0.6) }]], 0) };
    if (set === "mountain") return [];
    if (set === "forge") return [
      { id: "azazel", kind: "azazel", pos: [1.55, 0, -0.55], yaw: -1.35, pose: pose("azazel", t, f, [[0, { ...look(0.1, -0.2), brow: -0.4, lArm: A(0.9, -0.1, 0.3) }]], 0) },
      { id: "smith", kind: "smith", pos: [0.4, 0, -1.35], yaw: 0.25, prop: "hammer", pose: { ...pose("smith", t, f, [[0, look(0, -0.4)]], 0), rArm: A(0.55 + 1.3 * Math.abs(Math.sin(t * 3.2)), 0.15, 0.6 + 0.5 * Math.abs(Math.sin(t * 3.2))) } },
      { id: "max", kind: "max", pos: FORGE_MAX, yaw: 0.9, prop: "phone", pose: maxPose(t, f, [[0, { ...look(-0.2, 0), rArm: A(1.45, 0.05, 0.3) }], [s(6), { ...look(-0.75, 0.1), brow: 0.6, rArm: A(1.3, 0.1, 0.5), lean: -0.06 }], [s(6) + 1.5, { ...look(-0.7, 0.05), brow: 0.8, rArm: A(1.2, 0.1, 0.6), lean: -0.1 }]]) },
    ];
    // city
    if (shot === "C_views") return [{ id: "max", kind: "max", pos: MAX_CITY, yaw: Math.PI, prop: "phone", pose: maxPose(t, f, [[0, { ...look(0, 0.1), rArm: A(1.5, 0.05, 0.4) }]]) }];
    if (shot === "D_selfie") return [
      { id: "max", kind: "max", pos: MAX_CITY, yaw: 0, prop: "phone", pose: maxPose(t, f, [[s(4), { ...look(0, 0.02), brow: 0.7, rArm: A(1.55, 0.05, 0.15) }], [s(4) + 2, { ...look(0.12, 0.04), brow: 0.9, rArm: A(1.55, 0.05, 0.15) }]]) },
      { id: "watcher_bg", kind: "watcher", pos: [0.9, 0, -3.2], yaw: 0, pose: pose("watcher_bg", t, f, [[s(4), { ...look(0.1, 0), wings: 0.8, rArm: A(2.5, 0.4, 0.3) }], [s(4) + 1, { wings: 0.8, rArm: A(2.6, 0.7, 0.4), ...look(-0.1, 0) }], [s(4) + 2, { wings: 0.8, rArm: A(2.5, 0.3, 0.3), ...look(0.1, 0) }]], 0) },
    ];
    if (shot === "G_horoscope") return [{ id: "kokabiel", kind: "kasdeja", pos: [0, 0, 0], yaw: 0.35, pose: pose("kokabiel", t, f, [[s(7), { ...look(0.2, 0.55), rArm: A(2.6, 0.3, 0.1), wings: 0.6 }]], 0) }];
    if (shot === "H_giant" || shot === "J_store") return [giant];
    if (shot === "I_max_giant") return [giant, { id: "max", kind: "max", pos: MAX_CITY, yaw: 0, prop: "phone", pose: maxPose(t, f, [[s(9), { ...look(0, 0.25), brow: 0.9, gaze: [0, 0.3] }], [s(9) + 1.6, { ...look(0.05, 0.05), brow: 0.6, gaze: [0, 0] }]]) }];
    if (shot === "K_cry") return [giant];
    if (shot === "M_uber") return [
      { id: "raphael", kind: "raphael", pos: [0.95, 0, -0.5], yaw: -0.5, prop: "chains", pose: pose("raphael", t, f, [[s(13), { ...look(-0.3, -0.05), brow: -0.2, wings: 1, rArm: A(0.5, 0.2, 0.5) }], [e(13), { ...look(-0.5, -0.1), brow: 0.3, wings: 1, rArm: A(0.6, 0.2, 0.5) }]], 0) },
      { id: "max", kind: "max", pos: [-0.5, 0, 0.35], yaw: 0.9, prop: "phone", pose: maxPose(t, f, [[s(13), { ...look(0.2, 0.1), brow: 0.8, rArm: A(1.4, 0.05, 0.4) }]]) },
    ];
    return [];
  };

  const frameAt = (f: number): Frame => {
    const t = f / tl.fps;
    const [shot, set] = shots.find((x) => t >= x[2] && t < x[3])!;
    const c = CAMS[shot];
    const chars = charsAt(t, f, shot, set).map((ch) => ({ ...ch, pos: [ch.pos[0], groundAt(set, ch.pos[0], ch.pos[2]), ch.pos[2]] as V3 }));
    return { t, shot, set, cam: camPath(t, c.keys, c.shake ?? 0), chars, fx: fxAt(t, shot) };
  };
  // line 1 is filmed from Max's own phone (POV): he is the camera, so he is off screen by design
  return { frameAt, shots, cuts, frames: tl.frames, offscreen: [1], speakerOf: (k: number) => SPEAKER[L(k).speaker] };
};
