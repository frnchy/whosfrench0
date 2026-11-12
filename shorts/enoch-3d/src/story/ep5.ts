// Episode 5 — « Hénoch le messager » (1 Hénoch 12–13). Heaven: Michel sends the scribe. Hermon: the Watchers beg him to write.
import type { Cam, V3 } from "./common.ts";
import type { Timeline } from "./ep1.ts";
import { makeStory } from "./story.ts";

const SPEAKER: Record<string, string> = { "HÉNOCH": "narr", SCRIBE: "henoch", MICHEL: "michel", AZAZEL: "azazel", SHEMIHAZA: "shem" };

export const makeEp5 = (tl: Timeline, mouth: Record<string, number[]>) => makeStory(tl, mouth, SPEAKER, (h) => {
  const { s, cut, T, C, A, look, head, ch } = h;
  const HV = { henoch: [0, 0, 1] as V3, michel: [0, 0, -1] as V3 };
  const MT = { henoch: [0, 0, 1.6] as V3, azazel: [0, 0, -1.4] as V3, shem: [2.3, 0, -0.9] as V3 };
  const hH = head(HV.henoch, 1.72), mH = head(HV.michel, 2.4);
  const hM = head(MT.henoch, 1.72, "mountain"), aM = head(MT.azazel, 2.3, "mountain"), sM = head(MT.shem, 2.45, "mountain");
  const START = C([3.2, 2.6, 6.5], [0, 1.2, 0], 44);

  const shots: [string, "heaven" | "mountain", number, number][] = [
    ["A_hidden", "heaven", 0, cut(2)], ["B_michel", "heaven", cut(2), cut(3)], ["C_scribe", "heaven", cut(3), cut(4)],
    ["D_michel", "heaven", cut(4), cut(5)], ["E_arrive", "mountain", cut(5), cut(6)], ["F_verdict", "mountain", cut(6), cut(7)],
    ["G_azazel", "mountain", cut(7), cut(8)], ["H_ring", "mountain", cut(8), cut(9)], ["I_shem", "mountain", cut(9), cut(10)],
    ["J_write", "mountain", cut(10), cut(11)], ["K_question", "heaven", cut(11), T + 1],
  ];
  const cams: Record<string, { keys: [number, Cam][]; shake?: number }> = {
    A_hidden: { keys: [[0, START], [cut(2), C([2.6, 2.3, 5.2], [0, 1.2, 0], 42)]] },
    B_michel: { keys: [[s(2), C([0.6, 1.95, 2.9], mH, 32)], [s(3), C([0.55, 1.95, 2.6], mH, 30)]] },
    C_scribe: { keys: [[s(3), C([-0.9, 1.8, -1.6], hH, 30)], [s(4), C([-0.85, 1.75, -1.3], hH, 26)]] },
    D_michel: { keys: [[s(4), C([0.55, 1.9, 2.7], mH, 30)], [s(5), C([0.5, 1.9, 2.3], mH, 28)]] },
    E_arrive: { keys: [[s(5), C([16, 64, 30], [0, 49, 0], 44)], [s(6), C([12, 58, 22], [0, 49, 0], 42)]] },
    F_verdict: { keys: [[s(6), C([-0.8, hM[1] + 0.2, -0.6], hM, 34)], [s(7), C([-0.75, hM[1] + 0.2, -0.35], hM, 30)]] },
    G_azazel: { keys: [[s(7), C([0.7, aM[1] - 0.3, 0.6], aM, 34)], [s(8), C([0.65, aM[1] - 0.3, 0.3], aM, 30)]] },
    H_ring: { keys: [[s(8), C([-6, 54, 13], [0.5, 49, -0.5], 46)], [s(9), C([-4.5, 52.5, 10], [0.5, 49, -0.5], 46)]] },
    I_shem: { keys: [[s(9), C([1.6, sM[1] - 0.25, 1.1], sM, 32)], [s(10), C([1.65, sM[1] - 0.25, 0.85], sM, 28)]] },
    J_write: { keys: [[s(10), C([1.3, hM[1] + 0.05, -0.1], [0, hM[1] - 0.45, 1.5], 40)], [s(11), C([1.15, hM[1], 0.1], [0, hM[1] - 0.45, 1.5], 36)]] },
    K_question: { keys: [[s(11), C([3.8, 2.9, 7.6], [0, 1.2, 0], 45)], [T - 1.2, START], [T + 1, START]] },
  };
  const tremble = (t: number) => Math.sin(t * 31) * 0.05 + Math.sin(t * 17) * 0.03;

  return {
    shots, cams,
    fx: (_t, shot) => ({ crowdRaise: ["E_arrive", "F_verdict", "G_azazel", "H_ring", "I_shem", "J_write"].includes(shot) ? 0.01 : 0, mountainGlow: 0.4 }),
    chars: (t, f, shot) => {
      const inHeaven = shot === "A_hidden" || shot === "B_michel" || shot === "C_scribe" || shot === "D_michel" || shot === "K_question";
      const scroll = { prop: "scroll" };
      if (inHeaven) return [
        ch("henoch", "henoch", HV.henoch, Math.PI, t, f, [
          [0, { ...look(0, -0.4), rArm: A(0.9, 0.1, 1.2) }],                                     // writing
          [s(2), { ...look(0, 0.25), brow: 0.4 }],
          [s(3), { ...look(0.25, 0.25), brow: 1, gaze: [0.25, 0], lArm: A(0.6, 0.2, 1.6) }],          // « Moi ? » hand on chest
          [s(4), { ...look(0, 0.3), brow: 1 }],
          [s(11), { ...look(0, -0.4), rArm: A(0.9, 0.1, 1.2) }],
        ], scroll),
        ...([0].map(() => ch("michel", "michel", HV.michel, 0, t, f, [
          [0, { ...look(0, -0.2), wings: 0.4 }],
          [s(2), { ...look(0, -0.2), brow: 0.2, rArm: A(1.1, 0.2, 0.3), wings: 0.4 }],             // points to Earth
          [s(4), { ...look(0, -0.25), brow: -0.4, rArm: A(0.2, 0.1, 0.3) }],
        ], { prop: "sword" }))),
      ];
      const writing = t >= cut(10);
      return [
        ch("henoch", "henoch", MT.henoch, Math.PI, t, f, [
          [0, { ...look(0, 0.2), brow: 0.6 }],
          [s(6), { ...look(0, 0.3), brow: -0.2, rArm: A(1.0, 0.1, 0.6) }],                      // reads the sentence from the scroll
          [s(7), { ...look(0, 0.3), brow: 0.5, rArm: A(0.8, 0.1, 0.9) }],
          [s(10), { ...look(0, -0.5), brow: 0.8, rArm: A(0.9, 0.1, 1.2) }],
        ], { ...scroll, pose: writing ? { lArm: [0.8 + tremble(t), 0.1, 1.3] } : {} }),
        ch("azazel", "azazel", MT.azazel, 0, t, f, [
          [0, { ...look(0, -0.3), brow: 0.6, wings: 0.05 }],
          [s(7), { ...look(0, 0.1), brow: 1, lArm: A(1.1, -0.3, 1.0), rArm: A(1.1, -0.3, 1.0), lean: 0.1 }],  // pleading
          [s(8), { ...look(0, -0.55), brow: 1, lean: 0.12 }],
        ]),
        ch("shem", "shem", MT.shem, -0.75, t, f, [
          [0, { ...look(0, -0.5), brow: 0.8, wings: 0.05 }],
          [s(9), { ...look(-0.3, 0), brow: 1, gaze: [-0.2, 0] }],
          [s(10), { ...look(-0.3, -0.4), brow: 0.9 }],
        ]),
      ];
    },
    audio: {
      score: "music/hope.mp3", scoreVol: 0.3,
      beds: [["sfx/wind_bed.wav", cut(5), cut(11), 0.35]],
      sfx: [["sfx/wings.mp3", s(2) - 0.3, 0.4], ["sfx/wind.mp3", s(5), 0.5], ["sfx/rumble.wav", s(6) + 2.9, 0.35]],
    },
    keywords: { disparu: "#E9C46A", caché: "#E9C46A", "hénoch": "#E9C46A", scribe: "#E9C46A", justice: "#FFD60A", veilleurs: "#E9C46A", déchus: "#FF6B5B", paix: "#FF6B5B", pardon: "#FF6B5B", azazel: "#FF6B5B", sentence: "#FF6B5B", prière: "#9FD8FF", seigneur: "#9FD8FF", puissants: "#E8E4DA", ciel: "#9FD8FF", "t'écoutera": "#FFD60A", tremblaient: "#9FD8FF", écrit: "#E9C46A" },
  };
});
