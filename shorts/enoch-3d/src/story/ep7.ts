// Episode 7 — « Le voyage d'Hénoch » (1 Hénoch 14–21). Four stations of the vision; Uriel guides a nervous scribe.
import { ramp } from "./common.ts";
import type { Cam, V3 } from "./common.ts";
import type { Timeline } from "./ep1.ts";
import { makeStory } from "./story.ts";

const SPEAKER: Record<string, string> = { "HÉNOCH": "narr", SCRIBE: "henoch", URIEL: "uriel" };

export const makeEp7 = (tl: Timeline, mouth: Record<string, number[]>) => makeStory(tl, mouth, SPEAKER, (h) => {
  const { s, cut, T, C, A, look, ch } = h;
  // where the pair stands at each station (the station's scenery is in Sets2.Cosmos)
  const WALL: V3 = [0, 0, -40], THRONE: V3 = [0, 0, -270], MOUNTS: V3 = [400, 0, -35], STARS: V3 = [-400, 0, -30];
  const at = (o: V3, dx: number): V3 => [o[0] + dx, 0, o[2]];
  const hen = (o: V3) => at(o, -0.6), uri = (o: V3) => at(o, 0.6);
  const hh = (o: V3): V3 => [o[0] - 0.6, 1.6, o[2]], uh = (o: V3): V3 => [o[0] + 0.6, 2.18, o[2]];
  const START = C([3, 9, -26], [0, 5, -60], 50);

  const shots: [string, "cosmos", number, number][] = [
    ["A_lift", "cosmos", 0, cut(2)], ["B_up", "cosmos", cut(2), cut(3)], ["C_uriel", "cosmos", cut(3), cut(4)],
    ["D_wall", "cosmos", cut(4), cut(5)], ["E_throne", "cosmos", cut(5), cut(6)], ["F_fall", "cosmos", cut(6), cut(7)],
    ["G_mounts", "cosmos", cut(7), cut(8)], ["H_stars", "cosmos", cut(8), cut(9)], ["I_why", "cosmos", cut(9), cut(10)],
    ["J_prison", "cosmos", cut(10), cut(11)], ["K_tidy", "cosmos", cut(11), cut(12)], ["L_question", "cosmos", cut(12), T + 1],
  ];
  const station: Record<string, V3> = { A_lift: WALL, B_up: WALL, C_uriel: WALL, D_wall: WALL, E_throne: THRONE, F_fall: THRONE, G_mounts: MOUNTS, H_stars: STARS, I_why: STARS, J_prison: STARS, K_tidy: STARS, L_question: WALL };
  const off = (o: V3, d: V3): V3 => [o[0] + d[0], d[1], o[2] + d[2]];
  const cams: Record<string, { keys: [number, Cam][]; shake?: number }> = {
    A_lift: { keys: [[0, START], [cut(2), C([2.2, 6, -30], [0, 4, -60], 50)]] },
    B_up: { keys: [[s(2), C(off(WALL, [-0.25, 1.6, -1.6]), hh(WALL), 32)], [s(3), C(off(WALL, [-0.3, 1.6, -1.4]), hh(WALL), 30)]] },
    C_uriel: { keys: [[s(3), C(off(WALL, [0.25, 2.1, -1.7]), uh(WALL), 32)], [s(4), C(off(WALL, [0.25, 2.1, -1.6]), uh(WALL), 31)]] },
    D_wall: { keys: [[s(4), C(off(WALL, [0, 2.5, 7]), off(WALL, [0, 14, -20]), 56)], [s(5), C(off(WALL, [0, 2.2, 5]), off(WALL, [0, 16, -20]), 56)]] },
    E_throne: { keys: [[s(5), C(off(THRONE, [1.5, 1.8, 8]), off(THRONE, [0, 18, -75]), 55)], [s(6), C(off(THRONE, [1.2, 1.5, 5.5]), off(THRONE, [0, 22, -75]), 56)]] },
    F_fall: { keys: [[s(6), C(off(THRONE, [-0.2, 1.3, -1.9]), off(THRONE, [-0.6, 1.25, 0]), 36)], [s(7), C(off(THRONE, [-0.25, 1.3, -1.7]), off(THRONE, [-0.6, 1.2, 0]), 34)]] },
    G_mounts: { keys: [[s(7), C(off(MOUNTS, [3, 3, 9]), off(MOUNTS, [0, 18, -45]), 56)], [s(8), C(off(MOUNTS, [2, 2.6, 6.5]), off(MOUNTS, [0, 20, -45]), 56)]] },
    H_stars: { keys: [[s(8), C(off(STARS, [3, 2.5, 9]), off(STARS, [0, 8, -35]), 58)], [s(9), C(off(STARS, [2, 2.2, 6]), off(STARS, [0, 9.5, -35]), 56)]] },
    I_why: { keys: [[s(9), C(off(STARS, [-0.25, 1.6, -1.6]), hh(STARS), 32)], [s(10), C(off(STARS, [-0.3, 1.6, -1.45]), hh(STARS), 30)]] },
    J_prison: { keys: [[s(10), C(off(STARS, [0.3, 2.1, -1.8]), uh(STARS), 34)], [s(11), C(off(STARS, [0.3, 2.1, -1.6]), uh(STARS), 31)]] },
    K_tidy: { keys: [[s(11), C(off(STARS, [-0.3, 1.55, -1.5]), hh(STARS), 30)], [s(12), C(off(STARS, [-0.3, 1.55, -1.35]), hh(STARS), 27)]] },
    L_question: { keys: [[s(12), C([2.6, 7.5, -28], [0, 5, -60], 50)], [T - 1.2, START], [T + 1, START]] },
  };

  return {
    shots, cams,
    fx: (t, shot) => ({ glory: shot === "E_throne" ? ramp(t, s(5) + 0.5, s(5) + 3) : shot === "F_fall" ? 1 : 0 }),
    chars: (t, f, shot) => {
      const o = station[shot];
      return [
        ch("henoch", "henoch", hen(o), Math.PI, t, f, [
          [0, { ...look(0, 0.3), brow: 0.6 }],
          [s(2), { ...look(0.5, 0.05), brow: 1, gaze: [0.3, 0] }],                                   // « on monte encore beaucoup ? »
          [s(4), { ...look(0, 0.35), brow: 0.7 }],
          [s(6), { ...look(0, -0.3), brow: 1, lean: 0.4, lArm: A(1.2, 0.2, 0.3), rArm: A(1.2, 0.2, 0.3) }], // falls forward, arms out
          [s(7), { ...look(0, 0.3), brow: 0.6 }],
          [s(9), { ...look(0.45, 0.05), brow: 0.9, gaze: [0.3, 0] }],
          [s(11), { ...look(0.3, -0.05), brow: 1, gaze: [0.2, -0.1], lArm: A(0.9, -0.3, 1.7), rArm: A(0.9, -0.3, 1.7) }], // hugs his scroll
          [s(12), { ...look(0, 0.3), brow: 0.6 }],
        ], { prop: "scroll" }),
        ch("uriel", "uriel", uri(o), Math.PI, t, f, [
          [0, { ...look(0, 0.2), wings: 0.6 }],
          [s(3), { ...look(-0.5, -0.1), brow: -0.1, wings: 0.6 }],
          [s(4), { ...look(0, 0.25), wings: 0.6 }],
          [s(10), { ...look(-0.3, 0), brow: -0.3, rArm: A(1.6, 0.35, 0.2), wings: 0.7 }],               // points at the bound stars
          [s(11), { ...look(-0.55, -0.1), brow: 0.4, rArm: A(0.2, 0.1, 0.3), gaze: [-0.2, 0] }],
        ]),
      ];
    },
    audio: {
      score: "music/celest.mp3", scoreVol: 0.32,
      beds: [["sfx/wind_bed.wav", 0, cut(4), 0.4]],
      sfx: [["sfx/wind.mp3", 0.3, 0.6], ["sfx/wings.mp3", 1.6, 0.4], ["sfx/rumble.wav", s(5) + 0.4, 0.5], ["sfx/boom.mp3", s(6) + 2.0, 0.35], ["sfx/pings.mp3", s(7) + 1.2, 0.35], ["sfx/meteors.mp3", s(8) + 1.8, 0.45], ["sfx/anvil.mp3", s(10) + 2.8, 0.3]],
    },
    keywords: { vision: "#C9A6FF", nuées: "#9FD8FF", vents: "#9FD8FF", monte: "#FFD60A", cristal: "#9FD8FF", feu: "#FF6B5B", trône: "#FFD60A", fleuves: "#FF6B5B", tremblais: "#9FD8FF", sept: "#FFD60A", montagnes: "#E9C46A", magnifiques: "#E9C46A", étoiles: "#C9A6FF", liées: "#FF6B5B", enchaînées: "#FF6B5B", prison: "#FF6B5B", range: "#7EE08A", peur: "#FF6B5B" },
  };
});
