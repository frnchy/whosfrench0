// Episode 3 — « La naissance des géants » (1 Hénoch 7). Village at dusk, a 1 350 m giant beyond the river.
import { ramp } from "./common.ts";
import type { V3 } from "./common.ts";
import type { Timeline } from "./ep1.ts";
import { makeStory } from "./story.ts";

const SPEAKER: Record<string, string> = { "HÉNOCH": "narr", VILLAGEOIS: "villager", FEMME: "woman" };

export const makeEp3 = (tl: Timeline, mouth: Record<string, number[]>) => makeStory(tl, mouth, SPEAKER, (h) => {
  const { s, e, cut, T, C, A, look, head, ch } = h;
  const MAN: V3 = [-0.45, 0, 0.2], WOMAN: V3 = [0.45, 0, 0.1];
  const GIANT0: V3 = [-260, 0, -700], GIANT1: V3 = [-120, 0, -760];      // he walks along the far hills during lines 5–9
  const giantAt = (t: number): V3 => { const k = ramp(t, s(5), e(9)); return [GIANT0[0] + (GIANT1[0] - GIANT0[0]) * k, 0, GIANT0[2] + (GIANT1[2] - GIANT0[2]) * k]; };
  const manH = head(MAN, 1.74, "village"), womanH = head(WOMAN, 1.62, "village");
  const START = C([0.5, 1.7, 6.5], [-0.3, 2.6, -40], 46);

  const shots: [string, "village", number, number][] = [
    ["A_dusk", "village", 0, cut(2)], ["B_man", "village", cut(2), cut(3)], ["C_woman", "village", cut(3), cut(4)],
    ["D_giant", "village", cut(4), cut(5)], ["E_harvest", "village", cut(5), cut(6)], ["F_panic", "village", cut(6), cut(7)],
    ["G_eyes", "village", cut(7), cut(8)], ["H_hide", "village", cut(8), cut(9)], ["I_walk", "village", cut(9), cut(10)],
    ["J_earth", "village", cut(10), cut(11)], ["K_question", "village", cut(11), T + 1],
  ];
  const gHead = (t: number): V3 => { const g = giantAt(t); return [g[0], 1255, g[2]]; };
  const cams = {
    A_dusk: { keys: [[0, START], [cut(2), C([0.4, 1.65, 5.0], [-0.2, 2.4, -40], 44)]] },
    B_man: { keys: [[s(2), C([0.55, 1.62, 1.6], manH, 32)], [s(3), C([0.5, 1.6, 1.35], manH, 30)]] },
    C_woman: { keys: [[s(3), C([-0.4, 1.5, 1.4], womanH, 30)], [s(4), C([-0.38, 1.5, 1.2], womanH, 28)]] },
    D_giant: { keys: [[s(4), C([1.0, 0.6, 3.0], [-60, 200, -700], 58)], [s(5), C([1.0, 0.5, 3.0], gHead(s(5)), 62)]], shake: 0.015 },
    E_harvest: { keys: [[s(5), C([3, 6, 14], [-230, 350, -710], 52)], [s(6), C([2, 4, 11], [-190, 500, -720], 54)]] },
    F_panic: { keys: [[s(6), C([0.6, 1.6, 1.7], manH, 34)], [s(7), C([0.55, 1.55, 1.45], manH, 32)]], shake: 0.02 },
    G_eyes: { keys: [[s(7), C([-60, 1050, 200], gHead(s(7)), 38)], [s(8), C([-62, 1060, 170], gHead(s(8)), 34)]] },
    H_hide: { keys: [[s(8), C([0.05, 1.1, 2.1], [0.2, 1.3, 0.1], 44)], [s(9), C([0.05, 1.05, 1.85], [0.2, 1.3, 0.1], 42)]] },
    I_walk: { keys: [[s(9), C([6, 3, 18], [-120, 500, -720], 50)], [s(10), C([5, 2.5, 16], [-110, 650, -740], 52)]], shake: 0.012 },
    J_earth: { keys: [[s(10), C([0, 2, 10], [0, 6, -40], 46)], [s(11), C([0, 22, 30], [0, 60, -60], 52)]] },
    K_question: { keys: [[s(11), C([0.9, 1.9, 7.8], [-0.3, 2.8, -40], 46)], [T - 1.2, START], [T + 1, START]] },
  } as Record<string, { keys: [number, ReturnType<typeof C>][]; shake?: number }>;

  return {
    shots, cams,
    fx: (t, shot) => ({ day: 1, giants: 1, mountainGlow: 1, cries: shot === "J_earth" ? ramp(t, s(10) + 0.3, s(10) + 1.4) : 0 }),
    chars: (t, f, shot) => {
      const huddle = t >= cut(8) && t < cut(10);
      const man = ch("villager", "villager", MAN, 0.9, t, f, [
        [0, { ...look(-0.3, 0.35), brow: 0.6 }],
        [s(2), { ...look(-0.5, 0.45), brow: 1, gaze: [-0.2, 0.1] }],
        [s(3), { ...look(0.6, 0), brow: 0.8 }],                                                  // turns to his wife
        [s(6), { ...look(-0.4, 0.3), brow: 1, lArm: A(2.6, 0.5, 0.4), rArm: A(2.6, 0.5, 0.4) }], // both hands up: the harvest!
        [e(6), { ...look(-0.3, 0.3), brow: 1, lArm: A(2.4, 0.5, 0.6), rArm: A(2.4, 0.5, 0.6) }],
        [s(8), { ...look(0.5, -0.1), brow: 1, lean: 0.25 }],
        [s(11), { ...look(-0.3, 0.35), brow: 0.6 }],
      ]);
      const woman = ch("woman", "woman", WOMAN, -0.9, t, f, [
        [0, { ...look(0.2, 0.3), brow: 0.3 }],
        [s(3), { ...look(-0.5, 0), brow: -0.2, gaze: [-0.2, 0] }],                                 // deadpan: he ate the roof
        [s(4), { ...look(0.4, 0.35), brow: 0.5 }],
        [s(8), { ...look(-0.6, -0.1), brow: 1, lean: 0.25, rArm: A(1.0, -0.2, 1.6) }],            // finger to lips
        [e(8), { ...look(-0.6, -0.1), brow: 1, lean: 0.25, rArm: A(1.0, -0.2, 1.6) }],
        [s(11), { ...look(0.2, 0.3), brow: 0.4 }],
      ], { prop: huddle ? undefined : "jar" });
      const giant = ch("giant", "giant", giantAt(t), 0.4, t, f, [
        [0, { ...look(0.3, -0.2), brow: -0.4 }],
        [s(5), { ...look(0.2, -0.3), brow: -0.5, rArm: A(1.2, 0.2, 0.9) }],
        [s(7), { ...look(0.35, -0.5), brow: -1, lean: 0.08 }],                                    // he turns his eyes to the village
      ]);
      return shot === "G_eyes" ? [giant] : [man, woman, giant];
    },
    audio: {
      score: "music/dark.mp3", scoreVol: 0.32,
      beds: [["sfx/wind_bed.wav", 0, T, 0.25]],
      sfx: [["sfx/giant_step.mp3", s(4) + 0.3, 0.9], ["sfx/rumble.wav", s(4) + 0.5, 0.6], ["sfx/giant_step.mp3", s(5) + 1.5, 0.8], ["sfx/giant_step.mp3", s(7) + 0.8, 0.9], ["sfx/giant_step.mp3", s(9) + 0.6, 0.8], ["sfx/giant_step.mp3", s(9) + 2.4, 0.8], ["sfx/boom.mp3", s(10) + 0.3, 0.5]],
    },
    keywords: { veilleurs: "#E9C46A", épouses: "#F5B7C5", enfants: "#FF6B5B", ordinaires: "#FF6B5B", grandi: "#FFD60A", toit: "#FFD60A", géants: "#FF6B5B", trois: "#FFD60A", mille: "#FFD60A", coudées: "#FFD60A", dévorèrent: "#FF6B5B", récolte: "#F2A65A", année: "#F2A65A", contre: "#FF6B5B", "cache-toi": "#9FD8FF", oiseaux: "#9FD8FF", bêtes: "#9FD8FF", poissons: "#9FD8FF", terre: "#7EE08A", accusa: "#FF6B5B", fui: "#E9C46A" },
  };
});
