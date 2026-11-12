// Episode 8 — « L'annonce du Déluge » (1 Hénoch 10:1–3). Night village: Uriel comes down in a pillar of light to wake Noé.
import { ramp } from "./common.ts";
import type { Cam, V3 } from "./common.ts";
import type { Timeline } from "./ep1.ts";
import { makeStory } from "./story.ts";

const SPEAKER: Record<string, string> = { "HÉNOCH": "narr", URIEL: "uriel", "NOÉ": "noe" };

export const makeEp8 = (tl: Timeline, mouth: Record<string, number[]>) => makeStory(tl, mouth, SPEAKER, (h) => {
  const { s, e, cut, T, C, A, look, head, ch } = h;
  const URIEL: V3 = [1.1, 0, -0.4], NOE0: V3 = [-0.6, 0, 0.6], NOE1: V3 = [4.4, 0, -0.6];
  const uH = head(URIEL, 2.35, "village"), nH = head(NOE0, 1.76, "village");
  const START = C([0.2, 2.0, 6.8], [-0.1, 2.2, -10], 46);

  const shots: [string, "village", number, number][] = [
    ["A_pillar", "village", 0, cut(2)], ["B_wake", "village", cut(2), cut(3)], ["C_sleepy", "village", cut(3), cut(4)],
    ["D_flood", "village", cut(4), cut(5)], ["E_ok", "village", cut(5), cut(6)], ["F_escape", "village", cut(6), cut(7)],
    ["G_boat", "village", cut(7), cut(8)], ["H_rain", "village", cut(8), cut(9)], ["I_work", "village", cut(9), cut(10)],
    ["J_end", "village", cut(10), cut(11)], ["K_question", "village", cut(11), T + 1],
  ];
  const overU = (k: number): Cam => C([-0.45 - k * 0.05, 1.95, 1.25 - k * 0.15], uH, 40 - k * 3);   // over Noé's shoulder onto Uriel
  const overN = (k: number): Cam => C([0.5 + k * 0.05, 1.62, 0.35 + k * 0.05], nH, 40 - k * 3);      // onto Noé
  const cams: Record<string, { keys: [number, Cam][]; shake?: number }> = {
    A_pillar: { keys: [[0, START], [cut(2), C([0.4, 2.3, 5.4], [0.3, 3.4, -10], 48)]] },
    B_wake: { keys: [[s(2), overU(0)], [s(3), overU(1)]] }, C_sleepy: { keys: [[s(3), overN(0)], [s(4), overN(1)]] },
    D_flood: { keys: [[s(4), overU(0)], [s(5), overU(1)]] }, E_ok: { keys: [[s(5), overN(0)], [s(6), overN(1)]] },
    F_escape: { keys: [[s(6), C([-1.6, 2.0, 2.8], [0.6, 1.9, -0.2], 40)], [s(7), C([-1.3, 2.0, 2.4], [0.7, 2.0, -0.3], 38)]] },
    G_boat: { keys: [[s(7), overN(0)], [s(8), overN(1)]] }, H_rain: { keys: [[s(8), overU(0.5)], [s(9), overU(1)]] },
    I_work: { keys: [[s(9), C([0.5, 3.0, 8.5], [6, 1.6, -2.5], 50)], [s(10), C([1.0, 3.4, 9.5], [6.5, 2, -2.5], 50)]] },
    J_end: { keys: [[s(10), C([1.0, 3.4, 9.5], [6.5, 2, -2.5], 50)], [s(11), C([-1.5, 6, 15], [6, 2, -3], 52)]] },
    K_question: { keys: [[s(11), C([0.3, 2.5, 8.6], [-0.1, 2.4, -10], 47)], [T - 1.2, START], [T + 1, START]] },
  };
  const ark = (t: number) => (t < cut(9) ? 0 : 0.08 + 0.52 * ramp(t, s(9) + 0.3, e(9)) + 0.4 * ramp(t, s(10), s(10) + 3.5));
  const rain = (t: number) => (t >= cut(10) ? ramp(t, s(10) + 2.5, s(11)) : 0);

  return {
    shots, cams,
    fx: (t) => ({ pillar: t < cut(9) ? ramp(t, s(1) + 1.2, s(1) + 2.8) * (1 - 0.8 * ramp(t, s(2), s(2) + 1)) : 0, flash: Math.max(0, 1 - Math.abs(t - (s(1) + 2.6)) * 3) * 0.4, ark: ark(t), rain: rain(t) }),
    chars: (t, f) => {
      const working = t >= cut(9);
      const noe = ch("noe", "noe", working ? [NOE1[0], 0, NOE1[2]] : NOE0, working ? -2.2 : 2.1, t, f, [
        [0, { ...look(0, -0.2), brow: 0.2, lean: 0.04 }],
        [s(1) + 2.6, { ...look(0.2, 0.25), brow: 1, lean: -0.06 }],                                 // the light wakes him
        [s(3), { ...look(0, 0.15), brow: 0.6, lArm: A(1.6, 0.2, 2.2) }],                            // rubs his eyes: « c'est le milieu de la nuit »
        [e(3), { ...look(0, 0.2), brow: 0.6 }],
        [s(4) + 2.2, { ...look(0, 0.2), brow: 1, lean: -0.08 }],
        [s(5), { ...look(0.15, 0.2), brow: 1, gaze: [0.2, 0], rArm: A(0.7, 0.4, 0.8) }],
        [s(7), { ...look(-0.2, 0.15), brow: 1, gaze: [-0.3, 0], lArm: A(0.6, 0.5, 0.6), rArm: A(0.6, 0.5, 0.6) }], // empty hands: never built a boat
        [s(9), { ...look(0, -0.1), brow: -0.2, rArm: A(1.6, 0.2, 0.7) }],
        [s(9) + 0.5, { ...look(0, -0.1), brow: -0.3, rArm: A(0.6, 0.2, 0.4) }],
        [s(9) + 1.0, { ...look(0, -0.1), brow: -0.3, rArm: A(1.6, 0.2, 0.7) }],
        [s(9) + 1.5, { ...look(0, -0.1), brow: -0.3, rArm: A(0.6, 0.2, 0.4) }],
        [s(10), { ...look(0, 0.4), brow: 0.6 }],                                                    // first drops
      ], { prop: working ? "hammer" : undefined });
      if (working || t < s(1) + 2.0) return [noe];
      return [noe, ch("uriel", "uriel", URIEL, -1.04, t, f, [
        [0, { ...look(0, -0.1), wings: 0.9 }],
        [s(2), { ...look(0, -0.15), wings: 0.5, brow: 0.1 }],
        [s(4), { ...look(0, -0.1), brow: 0.6, rArm: A(1.7, 0.3, 0.2) }],                            // points to the sky
        [s(5), { ...look(0, -0.15), brow: 0.3, rArm: A(0.2, 0.1, 0.3) }],
        [s(6), { ...look(0, -0.15), brow: 0.2, lArm: A(1.0, 0.4, 0.5) }],
        [s(8), { ...look(0.1, -0.1), brow: 0.5, gaze: [0.1, 0] }],                                   // the smile: « tu as jusqu'à la pluie »
      ])];
    },
    audio: {
      score: "music/hope.mp3", scoreVol: 0.3,
      beds: [["sfx/crickets.mp3", 0, s(10), 0.3], ["sfx/wind_bed.wav", s(10) + 2, T, 0.35]],
      sfx: [["sfx/wings.mp3", s(1) + 1.8, 0.5], ["sfx/boom.mp3", s(1) + 2.5, 0.35], ["sfx/anvil.mp3", s(9) + 0.45, 0.4], ["sfx/anvil.mp3", s(9) + 1.45, 0.4], ["sfx/anvil.mp3", s(9) + 2.4, 0.4], ["sfx/anvil.mp3", s(9) + 3.4, 0.4], ["sfx/rumble.wav", s(10) + 2.2, 0.5]],
    },
    keywords: { "très-haut": "#E9C46A", uriel: "#FFB84D", lamech: "#E9C46A", "noé": "#C9E07E", "réveille-toi": "#FFD60A", nuit: "#9FD8FF", "cache-toi": "#FF6B5B", fin: "#FF6B5B", déluge: "#9FD8FF", terre: "#7EE08A", "t'échapper": "#7EE08A", descendance: "#7EE08A", générations: "#7EE08A", bateau: "#FFD60A", pluie: "#9FD8FF", travail: "#F2A65A", veilleurs: "#E9C46A", secrets: "#FFD60A", cru: "#E9C46A", "l'ange": "#FFB84D" },
  };
});
