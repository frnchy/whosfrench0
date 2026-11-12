// Episode 4 — « Le cri de la Terre » (1 Hénoch 9). Four archangels at the opening in the clouds; the Earth's lamps below turn red.
import { ramp } from "./common.ts";
import type { Cam, V3 } from "./common.ts";
import type { Timeline } from "./ep1.ts";
import { makeStory } from "./story.ts";

const SPEAKER: Record<string, string> = { "HÉNOCH": "narr", MICHEL: "michel", GABRIEL: "gabriel", "RAPHAËL": "raphael", URIEL: "uriel" };

export const makeEp4 = (tl: Timeline, mouth: Record<string, number[]>) => makeStory(tl, mouth, SPEAKER, (h) => {
  const { s, e, cut, T, C, A, look, head, ch } = h;
  const P: Record<string, V3> = { michel: [-2.4, 0, 1.5], uriel: [-0.8, 0, 1.5], raphael: [0.8, 0, 1.5], gabriel: [2.4, 0, 1.5] };
  const HT: Record<string, number> = { michel: 2.4, uriel: 2.35, raphael: 2.35, gabriel: 2.3 };
  const hd = (id: string) => head(P[id], HT[id]);
  const START = C([0, 6, 4.5], [0, -180, 95], 50);   // looking down through the opening at the Earth's lamps

  const shots: [string, "heaven", number, number][] = [
    ["A_cry", "heaven", 0, cut(2)], ["B_four", "heaven", cut(2), cut(3)], ["C_michel", "heaven", cut(3), cut(4)],
    ["D_gabriel", "heaven", cut(4), cut(5)], ["E_raphael", "heaven", cut(5), cut(6)], ["F_look", "heaven", cut(6), cut(7)],
    ["G_sigh", "heaven", cut(7), cut(8)], ["H_pray", "heaven", cut(8), cut(9)], ["I_pray2", "heaven", cut(9), cut(10)],
    ["J_answer", "heaven", cut(10), cut(11)], ["K_question", "heaven", cut(11), T + 1],
  ];
  const cams: Record<string, { keys: [number, Cam][]; shake?: number }> = {
    A_cry: { keys: [[0, START], [cut(2), C([0, 7.5, 3], [0, -180, 85], 48)]] },
    B_four: { keys: [[s(2), C([-3.2, 2.3, 5.2], [-2.4, 1.9, 1.5], 40)], [e(2), C([3.0, 2.3, 5.2], [2.2, 1.9, 1.5], 40)]] },
    C_michel: { keys: [[s(3), C([-2.1, 2.25, 3.2], hd("michel"), 32)], [s(4), C([-2.15, 2.25, 2.9], hd("michel"), 30)]] },
    D_gabriel: { keys: [[s(4), C([2.05, 2.15, 3.2], hd("gabriel"), 32)], [s(5), C([2.1, 2.15, 2.9], hd("gabriel"), 30)]] },
    E_raphael: { keys: [[s(5), C([1.1, 2.2, 3.1], hd("raphael"), 32)], [s(6), C([1.05, 2.2, 2.85], hd("raphael"), 30)]] },
    F_look: { keys: [[s(6), C([-0.6, 2.7, 10.5], [-0.6, 1.6, 1.5], 50)], [s(7), C([-0.9, 2.6, 9.5], [-0.9, 1.7, 1.5], 50)]] },
    G_sigh: { keys: [[s(7), C([-2.1, 2.25, 2.9], hd("michel"), 28)], [s(8), C([-2.12, 2.25, 2.75], hd("michel"), 27)]] },
    H_pray: { keys: [[s(8), C([-1.6, 2.0, -1.4], hd("michel"), 36)], [s(9), C([-1.75, 2.05, -1.1], hd("michel"), 34)]] },
    I_pray2: { keys: [[s(9), C([-0.3, 2.05, -1.5], hd("uriel"), 36)], [s(10), C([-0.4, 2.1, -1.2], hd("uriel"), 34)]] },
    J_answer: { keys: [[s(10), C([0, 3, 9], [0, 12, -70], 55)], [s(11), C([0, 2.4, 7], [0, 16, -70], 58)]], shake: 0.01 },
    K_question: { keys: [[s(11), C([0, 7, 3.5], [0, -180, 88], 49)], [T - 1.2, START], [T + 1, START]] },
  };
  const turn = (t: number, a: number) => Math.PI * ramp(t, a, a + 0.8);      // archangel turns from the Earth (+z) to the throne (−z)

  return {
    shots, cams,
    fx: (t, shot) => ({ blood: 1, glory: shot === "J_answer" ? 0.5 + ramp(t, s(10), s(10) + 2.5) : t >= cut(8) && shot !== "K_question" ? 0.45 : 0, flash: shot === "J_answer" ? Math.max(0, 1 - Math.abs(t - (s(10) + 2.4)) * 3) * 0.6 : 0 }),
    chars: (t, f) => [
      ch("michel", "michel", P.michel, turn(t, s(8) - 0.6), t, f, [
        [0, { ...look(0, -0.45), brow: 0.6, wings: 0.3 }],
        [s(3), { ...look(0.25, -0.25), brow: 0.7, wings: 0.3 }],
        [s(6) + 0.6, { ...look(0.5, 0), brow: 0.2, gaze: [0.3, 0] }],                      // feels three stares
        [s(7), { ...look(0.35, 0.05), brow: 0.9, lean: -0.03 }],                         // « Évidemment. »
        [s(8), { ...look(0, 0.25), brow: 0.5, wings: 0.6, lArm: A(1.6, 0.4, 0.3), rArm: A(1.6, 0.4, 0.3) }], // arms open to the throne
        [s(10), { ...look(0, 0.35), brow: 0.8, wings: 0.8, lArm: A(1.3, 0.5, 0.3), rArm: A(1.3, 0.5, 0.3) }],
      ], { prop: "sword" }),
      ch("uriel", "uriel", P.uriel, turn(t, s(9) - 0.7), t, f, [[0, { ...look(0, -0.45), brow: 0.6 }], [s(6) + 0.2, { ...look(-0.9, 0), brow: 0.3 }], [s(9) - 0.6, { ...look(0, 0.2), brow: 0.7, rArm: A(1.3, 0.3, 0.4) }], [s(10), { ...look(0, 0.3), brow: 0.6 }]]),
      ch("raphael", "raphael", P.raphael, turn(t, s(10) + 0.2), t, f, [
        [0, { ...look(0, -0.45), brow: 0.6 }],
        [s(5), { ...look(-0.35, 0), brow: 1, gaze: [-0.3, 0], rArm: A(0.6, 0.3, 1.2) }],    // nervous: "who tells Him?"
        [s(6) + 0.4, { ...look(-0.9, 0), brow: 0.3 }], [s(10), { ...look(0, 0.3), brow: 0.6 }],
      ]),
      ch("gabriel", "gabriel", P.gabriel, turn(t, s(10) + 0.4), t, f, [[0, { ...look(0, -0.45), brow: 0.8 }], [s(4), { ...look(-0.3, -0.2), brow: 1 }], [s(6) + 0.6, { ...look(-0.95, 0), brow: 0.3 }], [s(10), { ...look(0, 0.3), brow: 0.6 }]]),
    ],
    audio: {
      score: "music/celest.mp3", scoreVol: 0.3,
      beds: [["sfx/wind_bed.wav", 0, T, 0.22]],
      sfx: [["sfx/rumble.wav", 0.6, 0.4], ["sfx/wings.mp3", s(2) + 0.3, 0.5], ["sfx/wings.mp3", s(8) - 0.5, 0.45], ["sfx/boom.mp3", s(10) + 2.3, 0.6]],
    },
    keywords: { cri: "#FF6B5B", ciel: "#9FD8FF", quatre: "#FFD60A", archanges: "#9FD8FF", michel: "#FF8A6B", uriel: "#FFB84D", "raphaël": "#8FD3FF", gabriel: "#9FF0C0", sang: "#FF6B5B", âmes: "#FF6B5B", crient: "#FF6B5B", annonce: "#FFD60A", "évidemment": "#FFD60A", azazel: "#FF6B5B", injustice: "#FF6B5B", secrets: "#FFD60A", shemihaza: "#E8E4DA", répondit: "#E9C46A", changer: "#E9C46A", parler: "#E9C46A" },
  };
});
