// Episode 6 — « Azazel enchaîné » (1 Hénoch 10). Heaven → the desert of Dudaël → Hermon → a healed village → heaven.
import { ramp } from "./common.ts";
import type { Cam, SetName, V3 } from "./common.ts";
import type { Timeline } from "./ep1.ts";
import { makeStory } from "./story.ts";

const SPEAKER: Record<string, string> = { "HÉNOCH": "narr", "RAPHAËL": "raphael", AZAZEL: "azazel", MICHEL: "michel", SHEMIHAZA: "shem" };

export const makeEp6 = (tl: Timeline, mouth: Record<string, number[]>) => makeStory(tl, mouth, SPEAKER, (h) => {
  const { s, e, cut, T, C, A, look, head, ch } = h;
  const D = { raphael: [0, 0, -3.5] as V3, azazel: [0, 0, -6] as V3 };
  const M = { michel: [0, 0, 1.3] as V3, shem: [0, 0, -1.3] as V3 };
  const rD = head(D.raphael, 2.35, "desert"), aD = head(D.azazel, 2.3, "desert");
  const mM = head(M.michel, 2.4, "mountain"), sM = head(M.shem, 2.45, "mountain");
  const START = C([0, 3.6, -5.5], [0, -8, 40], 50);   // behind Raphaël and Michel, looking down through the opening

  const shots: [string, SetName, number, number][] = [
    ["A_sent", "heaven", 0, cut(2)], ["B_bind", "desert", cut(2), cut(3)], ["C_azazel", "desert", cut(3), cut(4)],
    ["D_chains", "desert", cut(4), cut(5)], ["E_pit", "desert", cut(5), cut(6)], ["F_rocks", "desert", cut(6), cut(7)],
    ["G_michel", "mountain", cut(7), cut(8)], ["H_shem", "mountain", cut(8), cut(9)], ["I_notalone", "mountain", cut(9), cut(10)],
    ["J_heal", "village", cut(10), cut(11)], ["K_question", "heaven", cut(11), T + 1],
  ];
  const cams: Record<string, { keys: [number, Cam][]; shake?: number }> = {
    A_sent: { keys: [[0, START], [cut(2), C([0, 4.0, -6.4], [0, -10, 40], 52)]] },
    B_bind: { keys: [[s(2), C([0.9, 2.05, -5.1], rD, 32)], [s(3), C([0.85, 2.05, -4.9], rD, 30)]] },
    C_azazel: { keys: [[s(3), C([-0.8, 1.95, -4.3], aD, 32)], [s(4), C([-0.75, 1.95, -4.5], aD, 28)]], shake: 0.012 },
    D_chains: { keys: [[s(4), C([0.95, 2.05, -5.0], rD, 30)], [s(5), C([0.9, 2.05, -4.8], rD, 27)]] },
    E_pit: { keys: [[s(5), C([7, 6, 4], [0, 0.6, -5.5], 46)], [s(6), C([6, 7.5, 2], [0, 0.3, -6], 46)]], shake: 0.02 },
    F_rocks: { keys: [[s(6), C([6, 7.5, 2], [0, 0.3, -6], 46)], [s(7), C([10, 12, 6], [0, 0, -6], 44)]], shake: 0.02 },
    G_michel: { keys: [[s(7), C([0.8, mM[1] - 0.2, -0.3], mM, 34)], [s(8), C([0.75, mM[1] - 0.2, -0.05], mM, 30)]] },
    H_shem: { keys: [[s(8), C([-0.8, sM[1] - 0.3, 0.2], sM, 32)], [s(9), C([-0.75, sM[1] - 0.3, 0.0], sM, 28)]] },
    I_notalone: { keys: [[s(9), C([-1.6, mM[1] + 0.6, -4.2], [0, mM[1] - 0.3, 0.6], 44)], [s(10), C([-2.2, mM[1] + 2.2, -6.5], [0, mM[1] - 0.6, 0.6], 50)]] },
    J_heal: { keys: [[s(10), C([0.3, 1.9, 5.5], head([0, 0, 0], 2.35, "village"), 40)], [s(11), C([0.3, 2.3, 7.5], [0, 3, 0], 46)]] },
    K_question: { keys: [[s(11), C([0, 4.2, -6.6], [0, -10, 40], 52)], [T - 1.2, START], [T + 1, START]] },
  };
  const pitK = (t: number) => ramp(t, s(5) + 0.4, s(5) + 2.4) + ramp(t, s(6) + 0.2, e(6));   // 0→1 opens, 1→2 rocks fall and the light dies
  const bound = { lArm: A(0.9, -0.35, 1.9), rArm: A(0.9, -0.35, 1.9) };                         // wrists together in front

  return {
    shots, cams,
    fx: (t, shot) => ({
      glory: shot === "A_sent" || shot === "K_question" ? 0.6 : 0, pit: shot === "E_pit" || shot === "F_rocks" ? pitK(t) : 0,
      crowdRaise: shot === "G_michel" || shot === "H_shem" || shot === "I_notalone" ? 0.01 : 0, day: shot === "J_heal" ? 1 : 0,
      mountainGlow: shot === "J_heal" ? 0.3 : 0,
    }),
    chars: (t, f, shot) => {
      if (shot === "A_sent" || shot === "K_question") return [
        ch("raphael", "raphael", [-0.8, 0, 1.4], 0, t, f, [[0, { ...look(0, -0.4), wings: 0.7 }]], { prop: "chains" }),
        ch("michel", "michel", [0.8, 0, 1.4], 0, t, f, [[0, { ...look(0, -0.4), wings: 0.7 }]], { prop: "sword" }),
      ];
      if (shot === "J_heal") return [ch("raphael", "raphael", [0, 0, 0], 0, t, f, [[0, { ...look(0, 0.1), brow: 0.3, wings: 0.6 }], [s(10) + 1.2, { ...look(0, 0.25), brow: 0.4, lArm: A(1.7, 0.6, 0.2), rArm: A(1.7, 0.6, 0.2), wings: 0.9 }]])];
      if (["B_bind", "C_azazel", "D_chains", "E_pit", "F_rocks"].includes(shot)) {
        const out = [ch("raphael", "raphael", D.raphael, Math.PI, t, f, [
          [0, { ...look(0, 0), brow: -0.4, rArm: A(0.8, 0.2, 0.4), wings: 0.4 }],
          [s(4), { ...look(0.15, 0.05), brow: 0.5, gaze: [0.2, 0], rArm: A(1.2, 0.2, 0.6) }],     // lifts the chains: « Merci pour ça. »
          [s(5), { ...look(0, -0.3), brow: -0.3, rArm: A(0.3, 0.2, 0.3), wings: 0.6 }],
        ], { prop: "chains" })];
        if (pitK(t) < 0.85) out.push(ch("azazel", "azazel", D.azazel, 0, t, f, [
          [0, { ...look(0, 0.05), brow: -0.8, ...bound, wings: 0.05 }],
          [s(3), { ...look(0, 0.1), brow: -1, ...bound, lean: -0.05 }],                          // angry
          [s(4), { ...look(-0.2, -0.2), brow: -0.6, ...bound }],
          [s(5) + 0.6, { ...look(0, -0.5), brow: 1, ...bound, lean: 0.1 }],
        ]));
        return out;
      }
      return [
        ch("michel", "michel", M.michel, Math.PI, t, f, [[0, { ...look(0, -0.05), brow: -0.3, wings: 0.5 }], [s(9), { ...look(0, -0.05), brow: 0.4, wings: 0.4 }]], { prop: "chains" }),
        ch("shem", "shem", M.shem, 0, t, f, [[0, { ...look(0, -0.4), brow: 0.8, ...bound, wings: 0.05 }], [s(8), { ...look(0, 0.05), brow: 1, ...bound }], [s(9) + 0.5, { ...look(0.5, -0.1), brow: 1, ...bound, gaze: [0.3, 0] }]]),
      ];
    },
    audio: {
      score: "music/dark.mp3", scoreVol: 0.3,
      beds: [["sfx/wind_bed.wav", cut(2), cut(7), 0.35], ["sfx/wind_bed.wav", cut(7), cut(10), 0.3]],
      sfx: [["sfx/wings.mp3", 0.6, 0.45], ["sfx/anvil.mp3", s(2) + 2.4, 0.45], ["sfx/rumble.wav", s(5) + 0.4, 0.8], ["sfx/boom.mp3", s(5) + 2.0, 0.6],
        ["sfx/giant_step.mp3", s(6) + 0.6, 0.6], ["sfx/giant_step.mp3", s(6) + 1.6, 0.55], ["sfx/giant_step.mp3", s(6) + 2.6, 0.5], ["sfx/anvil.mp3", s(7) + 2.8, 0.4]],
    },
    keywords: { archanges: "#9FD8FF", azazel: "#FF6B5B", liés: "#FFD60A", forger: "#F2A65A", chaînes: "#FFD60A", "dudaël": "#E9C46A", pierres: "#E9C46A", ténèbres: "#FF6B5B", lumière: "#FFD60A", shemihaza: "#E8E4DA", "soixante-dix": "#FFD60A", générations: "#FFD60A", seul: "#FF6B5B", guéris: "#7EE08A", terre: "#7EE08A", justice: "#FFD60A", vengeance: "#FF6B5B" },
  };
});
