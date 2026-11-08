// Episode 2 — Les secrets interdits (1 Hénoch 8). Shot plan, blocking and acting, keyed to the VO timeline.
import { NEUTRAL, blinkAt, camPath, idle, posePath, ramp } from "./common.ts";
import type { Arm, Cam, CamKey, Char, Frame, Fx, Kind, Pose, PoseKey, SetName, V3 } from "./common.ts";
import type { Timeline } from "./ep1.ts";

type Mouth = Record<string, number[]>;
const SPEAKER: Record<string, string> = { AZAZEL: "azazel", FORGERON: "smith", FEMME: "woman", KOKABIEL: "kokabiel" };

export const makeEp2 = (tl: Timeline, mouth: Mouth) => {
  const L = (k: number) => tl.lines[k - 1];
  const s = (k: number) => L(k).start, e = (k: number) => L(k).start + L(k).duration;
  const T = tl.duration;

  const shots: [string, SetName, number, number][] = [
    ["A_fire", "forge", 0, s(2) - 0.1],
    ["B_azazel_beckons", "forge", s(2) - 0.1, s(3) - 0.1],
    ["C_smith_curious", "forge", s(3) - 0.1, s(4) - 0.1],
    ["D_anvil", "forge", s(4) - 0.1, s(5) - 0.1],
    ["E_weapons", "forge", s(5) - 0.1, s(6) - 0.1],
    ["F_safety", "forge", s(6) - 0.1, s(7) - 0.1],
    ["G_deadpan", "forge", s(7) - 0.1, s(8) - 0.1],
    ["H_jewels", "village", s(8) - 0.1, s(9) - 0.1],
    ["I_woman", "village", s(9) - 0.1, s(10) - 0.1],
    ["J_stars", "village", s(10) - 0.1, s(11) - 0.1],
    ["K_swords", "village", s(11) - 0.1, s(12) - 0.1],
    ["L_cry", "village", s(12) - 0.1, s(13) - 0.1],
    ["M_question", "forge", s(13) - 0.1, T + 1],
  ];
  const cuts = shots.slice(1).map((x) => Math.ceil(x[2] * tl.fps - 1e-9));

  const speakingMouth = (id: string, t: number) => {
    const k = tl.lines.findIndex((l) => SPEAKER[l.speaker] === id && t >= l.start && t < l.start + l.duration);
    if (k < 0) return 0;
    return mouth[String(k + 1)][Math.floor((t - tl.lines[k].start) * tl.fps)] ?? 0;
  };
  const look = (yaw: number, pitch: number): Partial<Pose> => ({ head: [yaw, pitch] });
  const A = (p: number, r: number, el: number): Arm => [p, r, el];

  // hammer blows land on each of Azazel's five words in line 4
  const blows = L(4).words.map((w) => w.start + 0.05);
  const hammerArm = (t: number): Arm => {
    const nearest = blows.reduce((b, x) => (Math.abs(t - x) < Math.abs(t - b) ? x : b), blows[0]);
    const d = t - nearest, k = d < 0 ? Math.max(0, 1 + d / 0.35) : Math.max(0, 1 - d / 0.12);   // raise slowly, strike fast
    return A(0.55 + 1.3 * (1 - k), 0.15, 0.6 + 0.6 * (1 - k));
  };
  const sparksAt = (t: number) => Math.max(0, ...blows.map((b) => (t >= b ? Math.max(0, 1 - (t - b) / 0.5) : 0)));

  // ---------- blocking ----------
  const FORGE = { azazel: { pos: [1.55, 0, -0.55] as V3, yaw: -1.35 }, smith: { pos: [0.4, 0, -1.35] as V3, yaw: 0.25 } };
  const VILLAGE_DUSK = { azazel: { pos: [0.95, 0, 0] as V3, yaw: -1.25 }, woman: { pos: [-0.55, 0, 0.15] as V3, yaw: 1.2 } };

  const ACT: Record<string, PoseKey[]> = {
    azazel: [
      [0, { ...look(0, 0.05), wings: 0.05, brow: -0.2 }],
      [s(2) + 0.2, { ...look(0.15, 0), brow: -0.3, rArm: A(0.7, 0.45, 0.8), lean: 0.06 }],                // beckoning hand
      [s(2) + 1.2, { ...look(0.15, 0), brow: -0.35, rArm: A(0.75, 0.45, 1.3) }],
      [s(2) + 2.0, { ...look(0.15, 0), brow: -0.35, rArm: A(0.7, 0.45, 0.75) }],
      [s(3), { ...look(0.1, -0.05), rArm: A(0.1, 0.15, 0.4) }],
      [s(4) + 0.1, { ...look(0.2, -0.25), brow: -0.6, lArm: A(0.9, -0.1, 0.3) }],                          // points at the anvil
      [e(4), { ...look(0.2, -0.25), brow: -0.6, lArm: A(0.95, -0.1, 0.25) }],
      [s(7) - 0.3, { ...look(0.25, 0), brow: 0, lArm: A(0.05, 0.12, 0.25) }],
      [s(7) + 0.4, { ...look(0.3, 0.05), brow: 0.35, gaze: [0.2, 0] }],                                     // deadpan, one beat
    ],
    smith: [
      [0, { ...look(0, -0.3) }],
      [s(2), { ...look(-0.2, 0.05), brow: 0.3 }],
      [s(3), { ...look(-0.35, 0.1), brow: 0.9, lean: -0.04, gaze: [-0.2, 0.05] }],                         // "Le métal… parle ?" head tilt
      [s(3) + 1.5, { ...look(-0.3, 0.12), brow: 1, gaze: [-0.25, 0.1] }],
      [s(4), { ...look(0, -0.4), brow: -0.3 }],
      [e(4) + 0.6, { ...look(0, -0.4), brow: -0.3 }],
      [s(6), { ...look(-0.35, 0), brow: 1, gaze: [-0.3, 0] }],                                              // nervous question
      [s(6) + 1.4, { ...look(-0.4, 0.05), brow: 1, gaze: [0.2, 0] }],
      [e(7) + 0.2, { ...look(-0.45, -0.05), brow: 0.8, gaze: [-0.2, -0.05] }],
    ],
    woman: [
      [0, { ...look(0, 0) }],
      [s(8) + 1.0, { ...look(0.1, -0.15), brow: 0.5, lArm: A(1.1, 0.1, 1.3) }],                           // admires the bracelet
      [s(9), { ...look(0.05, -0.05), brow: 0.9, lArm: A(1.3, 0.05, 1.5), gaze: [0, -0.15] }],
      [s(9) + 2.0, { ...look(-0.15, 0.08), brow: 0.6, lArm: A(1.2, 0.2, 1.4), gaze: [-0.3, 0.05] }],
    ],
    kokabiel: [
      [0, { ...look(0, 0.3), wings: 0.4 }],
      [s(10), { ...look(0.15, 0.55), brow: 0.2, rArm: A(2.6, 0.3, 0.1), wings: 0.5 }],                      // points to the stars
      [e(10), { ...look(0.2, 0.6), brow: 0.2, rArm: A(2.7, 0.35, 0.05), wings: 0.55 }],
    ],
  };
  const pose = (id: string, t: number, f: number, keys: PoseKey[], mouthNow: number): Pose => ({ ...idle(id, t, posePath(t, NEUTRAL, keys)), mouth: mouthNow, blink: blinkAt(id, f) });

  // ---------- cameras ----------
  const C = (pos: V3, target: V3, fov = 40): Cam => ({ pos, target, fov });
  const head = (p: V3, H: number): V3 => [p[0], H * 0.93, p[2]];
  const azF = head(FORGE.azazel.pos, 2.3), smF = head(FORGE.smith.pos, 1.8);
  const START = C([0.6, 1.7, 1.6], [-1.5, 1.1, -2.3], 46);   // frame 0 and the loop target: the forge fire
  const CAMS: Record<string, { keys: CamKey[]; shake?: number }> = {
    A_fire: { keys: [[0, START], [0.8, START], [s(2) - 0.1, C([-0.4, 1.9, 3.6], [0.7, 1.45, -0.8], 42)]] },
    B_azazel_beckons: { keys: [[s(2), C([0.55, 1.95, 1.0], azF, 32)], [s(3), C([0.65, 1.98, 0.75], azF, 30)]] },
    C_smith_curious: { keys: [[s(3), C([0.75, 1.62, 0.15], smF, 32)], [s(4), C([0.72, 1.6, -0.05], smF, 30)]] },
    D_anvil: { keys: [[s(4), C([-0.45, 1.0, 1.7], [0.95, 1.5, -0.8], 54)], [s(5), C([-0.3, 0.95, 1.35], [0.95, 1.55, -0.8], 52)]], shake: 0.025 },
    E_weapons: { keys: [[s(5), C([1.6, 1.55, 0.6], [3.0, 1.25, -2.9], 40)], [s(6), C([3.3, 1.5, -0.9], [3.1, 1.2, -2.9], 40)]] },
    F_safety: { keys: [[s(6), C([0.85, 1.6, 0.1], smF, 30)], [s(7), C([0.8, 1.6, -0.1], smF, 26)]] },
    G_deadpan: { keys: [[s(7), C([0.6, 2.0, 0.55], azF, 26)], [s(8), C([0.62, 2.0, 0.5], azF, 26)]] },
    H_jewels: { keys: [[s(8), C([0.3, 1.8, 6.4], [0.2, 1.4, 0], 40)], [s(9), C([0.25, 1.7, 5.2], [0.2, 1.4, 0], 40)]] },
    I_woman: { keys: [[s(9), C([-0.1, 1.45, 1.6], head(VILLAGE_DUSK.woman.pos, 1.62), 30)], [s(10), C([-0.15, 1.45, 1.35], head(VILLAGE_DUSK.woman.pos, 1.62), 28)]] },
    J_stars: { keys: [[s(10), C([1.4, 0.9, 5.4], [0, 2.4, 1.0], 48)], [s(11), C([1.1, 0.7, 4.6], [-0.3, 3.4, 0.5], 52)]] },
    K_swords: { keys: [[s(11), C([0.1, 1.6, 7.0], [0, 1.5, 0], 44)], [s(12), C([0.05, 1.5, 5.6], [0, 1.6, 0], 44)]], shake: 0.02 },
    L_cry: { keys: [[s(12), C([0, 3, 9], [0, 4, -10], 44)], [s(13), C([0, 34, 30], [0, 60, -40], 50)]] },
    M_question: { keys: [[s(13), C([-0.3, 1.9, 3.4], [-0.8, 1.3, -1.5], 42)], [T - 1.0, START], [T + 1, START]] },
  };

  const fxAt = (t: number, shot: string): Fx => ({
    streaks: 0, lightning: 0, shock: 0, pillar: 0, flash: 0, crowdRaise: 0, crowdLook: 0, crowd: 0, feathers: 0, mountainGlow: 0,
    sparks: shot === "D_anvil" ? sparksAt(t) : shot === "A_fire" || shot === "M_question" ? 0.35 : 0,
    forgeGlow: shot === "D_anvil" ? 1 : 0.6,
    constellation: shot === "J_stars" ? ramp(t, s(10) + 0.3, e(10)) : 0,
    cries: shot === "L_cry" ? ramp(t, s(12) + 0.4, s(12) + 1.6) : 0,
    fight: shot === "K_swords" ? ramp(t, s(11) + 3.5, s(11) + 4.5) : 0,
  });

  const charsAt = (t: number, f: number, shot: string, set: SetName): Char[] => {
    if (set === "forge") {
      if (shot === "A_fire" && t < 0.9) return [];
      const out: Char[] = [];
      if (shot !== "M_question") out.push({ id: "azazel", kind: "azazel", pos: FORGE.azazel.pos, yaw: FORGE.azazel.yaw, pose: pose("azazel", t, f, ACT.azazel, speakingMouth("azazel", t)) });
      const sp = pose("smith", t, f, ACT.smith, speakingMouth("smith", t));
      out.push({ id: "smith", kind: "smith", pos: FORGE.smith.pos, yaw: FORGE.smith.yaw, prop: shot === "M_question" ? "sword" : "hammer", pose: shot === "D_anvil" ? { ...sp, rArm: hammerArm(t) } : shot === "M_question" ? { ...sp, rArm: A(1.2, 0.1, 0.4), head: [0, 0.1] } : sp });
      return out;
    }
    if (shot === "H_jewels" || shot === "I_woman") return [
      { id: "azazel", kind: "azazel", pos: VILLAGE_DUSK.azazel.pos, yaw: VILLAGE_DUSK.azazel.yaw, prop: "gems", pose: { ...pose("azazel", t, f, [[0, { ...look(0, -0.1), rArm: A(1.1, 0.1, 0.9), wings: 0.1 }]], 0) } },
      { id: "woman", kind: "woman", pos: VILLAGE_DUSK.woman.pos, yaw: VILLAGE_DUSK.woman.yaw, prop: "bracelet", pose: pose("woman", t, f, ACT.woman, speakingMouth("woman", t)) },
    ];
    if (shot === "J_stars") return [
      { id: "kokabiel", kind: "kasdeja", pos: [0, 0, 1.0], yaw: 0.35, pose: pose("kokabiel", t, f, ACT.kokabiel, speakingMouth("kokabiel", t)) },
      ...([[-2.2, 2.8, 2.6], [2.4, 3.1, -2.6], [-1.0, 4.4, 2.9]] as [number, number, number][]).map(([x, z, yaw], i) => ({
        id: "v_watch" + i, kind: (i === 1 ? "woman" : "villager") as Kind, pos: [x, 0, z] as V3, yaw, pose: pose("v_watch" + i, t, f, [[0, { ...look(0, 0.5), brow: 0.6 }]], 0),
      })),
    ];
    if (shot === "K_swords") return [
      { id: "fighter1", kind: "villager", pos: [-0.75, 0, 0], yaw: 1.45, prop: "sword", pose: pose("fighter1", t, f, [[s(11), { ...look(0, 0), brow: -0.8, rArm: A(0.6, 0.2, 0.4) }], [s(11) + 4.2, { ...look(0, 0.05), brow: -1, rArm: A(2.8, 0.25, 0.3), lean: -0.06 }]], 0) },
      { id: "fighter2", kind: "smith", pos: [0.75, 0, 0.05], yaw: -1.45, prop: "sword", pose: pose("fighter2", t, f, [[s(11), { ...look(0, 0), brow: -0.8, rArm: A(0.7, 0.2, 0.5) }], [s(11) + 4.4, { ...look(0, 0.05), brow: -1, rArm: A(2.7, 0.3, 0.3), lean: -0.05 }]], 0) },
    ];
    return [];
  };

  const frameAt = (f: number): Frame => {
    const t = f / tl.fps;
    const [shot, set] = shots.find((x) => t >= x[2] && t < x[3])!;
    const c = CAMS[shot];
    return { t, shot, set, cam: camPath(t, c.keys, c.shake ?? 0), chars: charsAt(t, f, shot, set), fx: fxAt(t, shot) };
  };
  return { frameAt, shots, cuts, frames: tl.frames, speakerOf: (k: number) => SPEAKER[L(k).speaker] };
};
