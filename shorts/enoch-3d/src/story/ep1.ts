// Episode 1 — Le serment du mont Hermon (1 Hénoch 6). Shot plan, blocking and acting, keyed to the VO timeline.
import { NEUTRAL, blinkAt, camPath, groundAt, idle, posePath, ramp, SUMMIT_Y } from "./common.ts";
import type { Cam, CamKey, Char, Frame, Fx, Kind, Pose, PoseKey, SetName, V3 } from "./common.ts";

type Line = { id: number; speaker: string; start: number; duration: number; words: { text: string; start: number; end: number }[] };
export type Timeline = { fps: number; duration: number; frames: number; lines: Line[] };
type Mouth = Record<string, number[]>;

const SPEAKER: Record<string, string> = { SHEMIHAZA: "shem", AZAZEL: "azazel", ANGE: "ange" };
export const ep1Speakers = SPEAKER;

export const makeEp1 = (tl: Timeline, mouth: Mouth) => {
  const L = (k: number) => tl.lines[k - 1];
  const s = (k: number) => L(k).start, e = (k: number) => L(k).start + L(k).duration;
  const w = (k: number, text: string) => L(k).words.find((x) => x.text.replace(/[.,!?…:]/g, "") === text)!.start;
  const T = tl.duration;
  const tMais = w(2, "Mais"), tEt11 = w(11, "et");

  // ---------- shots: [id, set, start, end] ----------
  const shots: [string, SetName, number, number][] = [
    ["A_reveal", "heaven", 0, s(2)],
    ["B1_watchers", "heaven", s(2), tMais - 0.1],
    ["B2_pov_village", "village", tMais - 0.1, s(3) - 0.1],
    ["C_azazel", "heaven", s(3) - 0.1, s(4) - 0.1],
    ["D_shemihaza", "heaven", s(4) - 0.1, s(5) - 0.1],
    ["E_ange", "heaven", s(5) - 0.1, s(6) - 0.15],
    ["F_stare", "heaven", s(6) - 0.15, s(7) - 0.1],
    ["G_oath_call", "heaven", s(7) - 0.1, s(8) - 0.1],
    ["H_descent", "mountain", s(8) - 0.1, s(9) - 0.1],
    ["I_circle", "mountain", s(9) - 0.1, s(10) - 0.1],
    ["J_shockwave", "mountain", s(10) - 0.1, s(11) - 0.1],
    ["K1_empty_heaven", "heaven", s(11) - 0.1, tEt11 - 0.1],
    ["K2_village", "village", tEt11 - 0.1, s(12) - 0.1],
    ["L_question", "heaven", s(12) - 0.1, T + 1],
  ];
  const cuts = shots.slice(1).map((x) => Math.ceil(x[2] * tl.fps - 1e-9));   // first frame whose time ≥ the shot start

  // ---------- blocking (heaven: cloud floor y=0, the opening in the clouds is at +z) ----------
  const HEAVEN: Record<string, { kind: Kind; pos: V3; yaw: number }> = {
    azazel: { kind: "azazel", pos: [-1.05, 0, 0], yaw: 0.25 },
    shem: { kind: "shem", pos: [1.05, 0, 0.1], yaw: -0.2 },
    ange: { kind: "ange", pos: [0.05, 0, -2.3], yaw: 0 },
    w1: { kind: "watcher", pos: [-2.6, 0, -1.6], yaw: 0.15 },
    w2: { kind: "watcher", pos: [2.7, 0, -1.4], yaw: -0.15 },
  };
  const R = 7.5; // oath circle radius on the summit plateau
  const circleSpot = (i: number, n: number): V3 => { const a = (i / n) * Math.PI * 2 + 0.3; return [Math.sin(a) * R, SUMMIT_Y, Math.cos(a) * R]; };

  const speakingMouth = (id: string, t: number) => {
    const k = tl.lines.findIndex((l) => SPEAKER[l.speaker] === id && t >= l.start && t < l.start + l.duration);
    if (k < 0) return 0;
    const arr = mouth[String(k + 1)], i = Math.floor((t - tl.lines[k].start) * tl.fps);
    return arr[i] ?? 0;
  };
  const choirMouth = (t: number) => (t >= s(10) && t < e(10) ? 0.4 + 0.5 * Math.abs(Math.sin((t - s(10)) * 9)) * (t < s(10) + 1.4 ? 1 : 0) : 0);

  // ---------- acting: pose keys per character (absolute times) ----------
  const look = (yaw: number, pitch: number): Partial<Pose> => ({ head: [yaw, pitch] });
  const ACT: Record<string, PoseKey[]> = {
    azazel: [
      [0, { ...look(0, -0.35), wings: 0.3 }],
      [s(3) - 0.2, { ...look(0, -0.3) }],
      [s(3) + 0.3, { ...look(0.45, 0.05), brow: -0.3, rArm: [0.9, 0.35, 0.9], lean: 0.05 }],                 // turns to the others, open hand
      [s(3) + 2.2, { ...look(0.5, 0.05), brow: -0.4, rArm: [1.1, 0.5, 0.5], lArm: [0.3, 0.2, 0.6] }],
      [s(4) + 0.3, { ...look(0.7, 0), brow: -0.2, rArm: [0.1, 0.15, 0.4], lArm: [0.05, 0.12, 0.25] }],     // listens to Shemihaza
      [s(6) - 0.1, { ...look(0.7, 0) }],
      [s(6) + 0.4, { ...look(1.25, -0.05), brow: 0.2, gaze: [0.3, 0] }],                                    // slow turn: stares at the nervous one
      [s(7) - 0.15, { ...look(1.25, -0.05), brow: 0.2 }],
      [s(7) + 0.35, { ...look(0.1, 0.25), brow: -0.9, rArm: [2.6, 0.2, 0.15], lArm: [0.4, 0.5, 0.8], wings: 1, lean: -0.08 }], // fist up, wings flare
      [e(7), { ...look(0.1, 0.3), brow: -0.9, rArm: [2.75, 0.15, 0.05], wings: 1, lean: -0.1 }],
    ],
    shem: [
      [0, { ...look(0, -0.35), wings: 0.3 }],
      [s(4) - 0.3, { ...look(-0.5, -0.05), brow: 0.4 }],
      [s(4) + 0.6, { ...look(-0.55, 0), brow: 0.7, lArm: [0.35, -0.5, 1.8], lean: 0.04 }],                 // hand on chest, grave
      [e(4) - 0.4, { ...look(-0.45, -0.1), brow: 0.8, lArm: [0.38, -0.5, 1.85] }],
      [s(6) - 0.1, { ...look(-0.4, -0.05), lArm: [0.05, 0.12, 0.25] }],
      [s(6) + 0.5, { ...look(-1.2, -0.05), brow: -0.3, gaze: [-0.3, 0] }],
      [s(7) + 0.6, { ...look(-0.6, 0.1), brow: -0.5, lArm: [2.3, -0.2, 0.2], wings: 0.95 }],
      [e(7), { ...look(-0.5, 0.15), brow: -0.6, lArm: [2.5, -0.15, 0.1], wings: 1 }],
    ],
    ange: [
      [0, { ...look(0, -0.3), wings: 0.2 }],
      [s(5) - 0.4, { ...look(0, -0.05), brow: 0.6 }],
      [s(5) + 0.3, { ...look(-0.2, 0.05), brow: 1, rArm: [1.4, 0.4, 1.6], gaze: [-0.25, 0], lean: -0.03 }], // timid half-raised hand
      [s(5) + 1.3, { ...look(0.25, 0.05), brow: 1, rArm: [1.5, 0.45, 1.5], gaze: [0.3, 0] }],               // eyes dart left/right
      [e(5), { ...look(0, 0.08), brow: 1, rArm: [1.5, 0.45, 1.5], gaze: [0, 0] }],
      [s(6) + 0.4, { ...look(0.15, -0.12), brow: 1, rArm: [1.3, 0.4, 1.7], gaze: [0.35, -0.1] }],
      [e(6) + 0.3, { ...look(0, -0.3), brow: 1, rArm: [0.1, 0.12, 0.3], wings: 0.1, gaze: [0, -0.2] }],    // hand slowly down, shrinks
      [s(7) + 0.5, { ...look(-0.3, 0.1), brow: 0.8, rArm: [1.9, 0.3, 0.6], wings: 0.6 }],                   // joins in, half-hearted
      [e(7), { ...look(-0.3, 0.12), brow: 0.8, rArm: [2.0, 0.3, 0.5], wings: 0.6 }],
    ],
    w1: [[0, look(0.1, -0.3)], [s(6) - 0.1, look(0.1, -0.3)], [s(6) + 0.7, look(0.9, -0.1)], [s(7) + 0.5, { ...look(0.3, 0.2), rArm: [2.4, 0.2, 0.2], wings: 1 }]],
    w2: [[0, look(-0.1, -0.3)], [s(6) - 0.1, look(-0.1, -0.3)], [s(6) + 0.9, look(-0.95, -0.1)], [s(7) + 0.6, { ...look(-0.3, 0.2), lArm: [2.4, 0.2, 0.2], wings: 1 }]],
  };
  const SUMMIT_ACT: PoseKey[] = [
    [s(9) - 0.2, { ...look(0, 0.1), brow: -0.5, lArm: [0.3, 0.3, 0.4], rArm: [0.3, 0.3, 0.4], wings: 0.7 }],
    [s(9) + 1.0, { ...look(0, 0.45), brow: -0.8, lArm: [2.7, 0.5, 0.1], rArm: [2.7, 0.5, 0.1], wings: 1 }],   // both arms to the sky
    [e(10), { ...look(0, 0.55), brow: -0.9, lArm: [2.9, 0.45, 0.05], rArm: [2.9, 0.45, 0.05], wings: 1 }],
  ];

  const pose = (id: string, t: number, f: number, keys: PoseKey[], mouthNow: number): Pose => {
    const p = idle(id, t, posePath(t, NEUTRAL, keys));
    return { ...p, mouth: mouthNow, blink: blinkAt(id, f) };
  };

  // ---------- cameras ----------
  const C = (pos: V3, target: V3, fov = 40): Cam => ({ pos, target, fov });
  const head = (id: string): V3 => { const h = HEAVEN[id]; const H = id === "shem" ? 2.45 : id === "azazel" ? 2.3 : id === "ange" ? 2.0 : 2.2; return [h.pos[0], H * 0.9, h.pos[2]]; };
  const START = C([0, 10, -36], [0, 52, 40], 50);   // frame 0: stars over the cloud sea (and the loop target)
  const CAMS: Record<string, { keys: CamKey[]; shake?: number }> = {
    A_reveal: { keys: [[0, START], [0.6, START], [4.2, C([0, 9, -33], [0, 1, 20], 46)], [s(2), C([0, 7, -27], [0, 1.5, 15], 44)]] },
    B1_watchers: { keys: [[s(2), C([0.9, 1.4, 5.6], [0, 2.0, 0], 34)], [tMais, C([0.5, 1.5, 4.6], [0, 2.05, 0], 32)]] },
    B2_pov_village: { keys: [[tMais, C([5, 46, 40], [0, 0, -4], 40)], [s(3), C([3, 16, 13], [-0.5, 0.8, -3.5], 38)]] },
    C_azazel: { keys: [[s(3), C([-0.1, 1.95, 2.9], [...head("azazel")].map((v, i) => v + [0.15, 0, 0][i]) as V3, 30)], [s(4), C([-0.2, 1.98, 2.4], head("azazel"), 28)]] },
    D_shemihaza: { keys: [[s(4), C([0.3, 2.05, 3.1], head("shem"), 30)], [s(5), C([0.5, 2.1, 2.5], head("shem"), 27)]] },
    E_ange: { keys: [[s(5), C([0.1, 2.05, 1.2], head("ange"), 30)], [s(6), C([0.08, 1.95, 0.6], head("ange"), 30)]] },
    F_stare: { keys: [[s(6), C([0.0, 3.2, 4.6], [0, 1.6, -1.2], 40)], [s(7), C([0.0, 3.0, 4.0], [0, 1.6, -1.4], 40)]] },
    G_oath_call: { keys: [[s(7), C([-1.6, 0.7, 2.2], [-1.05, 2.4, 0], 38)], [e(7), C([-1.9, 0.6, 2.9], [-1.05, 2.6, 0], 42)]], shake: 0.03 },
    H_descent: { keys: [[s(8), C([30, 22, 150], [0, 70, 0], 46)], [s(9), C([22, 26, 112], [0, 58, 0], 44)]] },
    I_circle: { keys: [[s(9), C([12, SUMMIT_Y + 3.2, 6], [0, SUMMIT_Y + 2.2, 0], 44)], [s(10), C([6, SUMMIT_Y + 3.6, 12.5], [0, SUMMIT_Y + 2.4, 0], 42)]], shake: 0.02 },
    J_shockwave: { keys: [[s(10), C([5, SUMMIT_Y + 4, 13], [0, SUMMIT_Y + 3, 0], 44)], [s(10) + 1.2, C([10, SUMMIT_Y + 14, 30], [0, SUMMIT_Y + 6, 0], 50)], [s(11), C([18, SUMMIT_Y + 30, 70], [0, SUMMIT_Y + 4, 0], 50)]], shake: 0.08 },
    K1_empty_heaven: { keys: [[s(11), C([0, 9, -33], [0, 1, 20], 46)], [tEt11, C([0, 7, -26], [0, 1, 20], 44)]] },
    K2_village: { keys: [[tEt11, C([1.6, 1.55, 9.5], [0, 14, -160], 40)], [s(12), C([1.4, 1.5, 8.2], [0, 18, -160], 38)]] },
    L_question: { keys: [[s(12), C([0, 9, -33], [0, 1, 20], 46)], [T - 1.2, START], [T + 1, START]] },
  };

  const crowdLook = (t: number) => ramp(t, s(6) + 0.1, s(6) + 0.9) * (1 - ramp(t, s(7) + 0.1, s(7) + 0.5));
  const fxAt = (t: number, shot: string): Fx => ({
    streaks: shot === "H_descent" ? ramp(t, s(8) + 0.3, s(9) - 0.3) : 0,
    lightning: shot === "I_circle" || shot === "J_shockwave" ? Math.max(0, Math.sin(t * 23) * Math.sin(t * 7.3)) * (t > s(9) + 0.8 ? 1 : 0) : 0,
    shock: shot === "J_shockwave" ? ramp(t, s(10) + 0.25, s(10) + 2.4) : 0,
    pillar: shot === "J_shockwave" ? ramp(t, s(10) + 0.2, s(10) + 0.5) * (1 - ramp(t, s(11) - 1.2, s(11) - 0.2)) : 0,
    flash: shot === "J_shockwave" ? Math.max(0, 1 - Math.abs(t - (s(10) + 0.3)) * 3) : shot === "G_oath_call" ? Math.max(0, 1 - Math.abs(t - (s(7) + 0.4)) * 4) * 0.5 : 0,
    crowdRaise: shot === "G_oath_call" ? ramp(t, s(7) + 0.4, s(7) + 1.4) : shot === "I_circle" ? ramp(t, s(9) + 0.6, s(9) + 1.6) : shot === "J_shockwave" ? 1 : 0,
    crowdLook: crowdLook(t),
    crowd: shot.startsWith("K1") || shot.startsWith("L_") ? 0 : 1,
    feathers: shot.startsWith("K1") || shot.startsWith("L_") ? 1 : 0,
    mountainGlow: shot === "K2_village" ? 1 : 0,
    sparks: 0, forgeGlow: 0, constellation: 0, cries: 0, fight: 0,
  });

  const charsAt = (t: number, f: number, shot: string, set: SetName): Char[] => {
    if (set === "heaven") {
      if (shot.startsWith("K1") || shot.startsWith("L_") || shot === "A_reveal") return [];
      return Object.entries(HEAVEN).map(([id, b]) => {
        let yaw = b.yaw;
        if (id === "azazel" && t > s(6)) yaw += 0.6 * ramp(t, s(6), s(6) + 0.8) * (1 - ramp(t, s(7), s(7) + 0.4));
        if (id === "shem" && t > s(6)) yaw -= 0.6 * ramp(t, s(6), s(6) + 0.8) * (1 - ramp(t, s(7), s(7) + 0.4));
        return { id, kind: b.kind, pos: b.pos, yaw, pose: pose(id, t, f, ACT[id], speakingMouth(id, t)) };
      });
    }
    if (set === "mountain" && (shot === "I_circle" || shot === "J_shockwave")) {
      const ring: Char[] = ["azazel", "ange", "w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8"].map((id, i, all) => {
        const p = circleSpot(i, all.length), kind: Kind = id === "azazel" ? "azazel" : id === "ange" ? "ange" : "watcher";
        const pos: V3 = [p[0], groundAt("mountain", p[0], p[2]), p[2]];
        return { id: "c_" + id, kind, pos, yaw: Math.atan2(-p[0], -p[2]), pose: pose("c_" + id, t, f, SUMMIT_ACT, choirMouth(t)) };
      });
      const shemPos: V3 = [0, groundAt("mountain", 0, 0), 0];
      return [...ring, { id: "c_shem", kind: "shem", pos: shemPos, yaw: 0.9, pose: pose("c_shem", t, f, SUMMIT_ACT, Math.max(speakingMouth("shem", t), choirMouth(t))) }];
    }
    if (set === "village") {
      const lookUp: Partial<Pose> = shot === "K2_village" ? { head: [0, 0.45], brow: 0.8 } : {};
      const people: [string, Kind, V3, number][] = [
        ["v_woman1", "woman", [-2.2, 0, -3], 0.4], ["v_woman2", "woman", [-0.9, 0, -4.2], 0.2], ["v_woman3", "woman", [1.4, 0, -3.6], -0.3],
        ["v_man1", "villager", [0.4, 0, 6.6], Math.PI], ["v_man2", "villager", [3.2, 0, 2.5], Math.PI * 0.95], ["v_woman4", "woman", [-3.4, 0, 3.6], Math.PI * 1.05],
      ];
      return people.map(([id, kind, pos, yaw]) => ({
        id, kind, pos, yaw: shot === "K2_village" ? Math.PI : yaw,
        pose: pose(id, t, f, [[0, { ...NEUTRAL, ...(kind === "woman" && shot !== "K2_village" ? { lArm: [0.2, 1.9, 2.2] as [number, number, number] } : {}), ...lookUp }]], 0),
        prop: kind === "woman" && shot !== "K2_village" ? "jar" : undefined,
      }));
    }
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
