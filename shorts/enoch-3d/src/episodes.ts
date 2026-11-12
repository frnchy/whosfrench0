import type { EpisodeDef, TL } from "./Episode";
import { makeEp1 } from "./story/ep1.ts";
import tl1 from "./timeline_ep1.json";
import mouth1 from "./mouth_ep1.json";
import { makeEp2 } from "./story/ep2.ts";
import tl2 from "./timeline_ep2.json";
import mouth2 from "./mouth_ep2.json";
import { makeWhatif } from "./story/whatif.ts";
import tlW from "./timeline_whatif.json";
import mouthW from "./mouth_whatif.json";
import { makeEp3 } from "./story/ep3.ts";
import tl3 from "./timeline_ep3.json";
import mouth3 from "./mouth_ep3.json";
import { makeEp4 } from "./story/ep4.ts";
import tl4 from "./timeline_ep4.json";
import mouth4 from "./mouth_ep4.json";
import { makeEp5 } from "./story/ep5.ts";
import tl5 from "./timeline_ep5.json";
import mouth5 from "./mouth_ep5.json";
import { makeEp6 } from "./story/ep6.ts";
import tl6 from "./timeline_ep6.json";
import mouth6 from "./mouth_ep6.json";
import { makeEp7 } from "./story/ep7.ts";
import tl7 from "./timeline_ep7.json";
import mouth7 from "./mouth_ep7.json";
import { makeEp8 } from "./story/ep8.ts";
import tl8 from "./timeline_ep8.json";
import mouth8 from "./mouth_ep8.json";
import { WhatifOverlay } from "./overlays/WhatifOverlay";

const T1 = tl1 as TL;
const s1 = (k: number) => T1.lines[k - 1].start;
const e1 = makeEp1(T1, mouth1 as Record<string, number[]>);
export const EP1: EpisodeDef = {
  id: "ep1", n: 1, tl: T1, frameAt: e1.frameAt, score: "ep1/music/score_a.mp3", scoreVol: 0.32,
  beds: [["sfx/wind_bed.wav", 0, s1(2) + 4.6, 0.35], ["sfx/wind_bed.wav", s1(11), T1.duration, 0.3]],
  sfx: [
    ["sfx/crickets.mp3", s1(6) + 0.2, 0.55], ["sfx/wings.mp3", s1(7) + 0.3, 0.7],
    ["sfx/meteors.mp3", s1(8) + 0.6, 0.6], ["sfx/meteors.mp3", s1(8) + 1.6, 0.5], ["sfx/meteors.mp3", s1(8) + 2.5, 0.6], ["sfx/rumble.wav", s1(8) + 3.6, 0.6],
    ["sfx/boom.mp3", s1(9) + 1.0, 0.5], ["sfx/boom.mp3", s1(10) + 0.25, 0.9], ["sfx/rumble.wav", s1(10) + 0.3, 0.9],
  ],
  keywords: { anges: "#FFD60A", "deux": "#FFD60A", cents: "#FFD60A", veilleurs: "#E9C46A", désiré: "#FF6B5B", épouses: "#FF6B5B", péché: "#FF6B5B", ciel: "#9FD8FF", jurons: "#FFD60A", malédiction: "#FF6B5B", hermon: "#E9C46A", jared: "#E9C46A", trahira: "#FF6B5B", prix: "#FF6B5B", juré: "#FFD60A" },
};
const T2 = tl2 as TL;
const s2 = (k: number) => T2.lines[k - 1].start;
const e2 = makeEp2(T2, mouth2 as Record<string, number[]>);
export const EP2: EpisodeDef = {
  id: "ep2", n: 2, tl: T2, frameAt: e2.frameAt, score: "ep2/music/score.mp3", scoreVol: 0.3,
  beds: [["sfx/wind_bed.wav", s2(10), s2(13), 0.3]],
  sfx: [
    ...T2.lines[3].words.map((w) => ["sfx/anvil.mp3", w.start + 0.05, 0.55] as [string, number, number]),
    ["sfx/wings.mp3", s2(10) + 0.1, 0.4], ["sfx/rumble.wav", s2(11) + 4.2, 0.5], ["sfx/boom.mp3", s2(11) + 4.4, 0.45], ["sfx/meteors.mp3", s2(12) + 2.4, 0.35],
  ],
  keywords: { veilleurs: "#E9C46A", métal: "#F2A65A", épées: "#FF6B5B", couteaux: "#FF6B5B", boucliers: "#FF6B5B", cuirasses: "#FF6B5B", frappe: "#FFD60A", sécurité: "#7EE08A", "toi-même": "#7EE08A", bracelets: "#FFD60A", "précieuses": "#FFD60A", fard: "#F5B7C5", magnifique: "#F5B7C5", étoiles: "#C9A6FF", impiété: "#FF6B5B", périrent: "#FF6B5B", ciel: "#9FD8FF", secret: "#FFD60A" },
};
const TW = tlW as TL;
const sW = (k: number) => TW.lines[k - 1].start;
const eW = makeWhatif(TW, mouthW as Record<string, number[]>);
export const WHATIF: EpisodeDef = {
  id: "whatif", n: 0, tl: TW, frameAt: eW.frameAt, score: "whatif/music/score.mp3", scoreVol: 0.3, overlay: WhatifOverlay,
  beds: [["sfx/wind_bed.wav", 0, sW(3), 0.3]],
  sfx: [
    ["sfx/meteors.mp3", 0.6, 0.6], ["sfx/meteors.mp3", 1.8, 0.5], ["sfx/boom.mp3", sW(2) + 1.45, 0.9], ["sfx/rumble.wav", sW(2) + 1.5, 0.8],
    ["sfx/pings.mp3", sW(3) + 1.0, 0.5], ["sfx/pings.mp3", sW(3) + 2.0, 0.5], ["sfx/pings.mp3", sW(3) + 2.8, 0.55],
    ["sfx/anvil.mp3", sW(5) + 0.8, 0.45], ["sfx/anvil.mp3", sW(5) + 1.8, 0.45], ["sfx/anvil.mp3", sW(6) + 0.6, 0.45],
    ["sfx/pings.mp3", sW(7) + 0.6, 0.45], ["sfx/pings.mp3", sW(7) + 1.5, 0.45], ["sfx/pings.mp3", sW(7) + 2.4, 0.45],
    ["sfx/giant_step.mp3", sW(8) + 1.6, 0.9], ["sfx/giant_step.mp3", sW(10) + 0.4, 0.8], ["sfx/rumble.wav", sW(10) + 3.2, 0.6],
    ["sfx/boom.mp3", sW(12) + 0.3, 0.7], ["sfx/wings.mp3", sW(13) + 0.2, 0.5],
  ],
  keywords: { météores: "#FFD60A", "deux": "#FFD60A", cents: "#FFD60A", hermon: "#E9C46A", "ce": "#fff", soir: "#FF6B5B", quarante: "#FFD60A", millions: "#FFD60A", ailes: "#9FD8FF", "abonnez-vous": "#7EE08A", azazel: "#FF6B5B", "d'azazel": "#FF6B5B", épées: "#FF6B5B", sécurité: "#7EE08A", kokabiel: "#C9A6FF", premium: "#C9A6FF", géants: "#FF6B5B", trois: "#FFD60A", mille: "#FFD60A", cinquante: "#FFD60A", mètres: "#FFD60A", supermarché: "#7EE08A", livraison: "#FF6B5B", crier: "#FF6B5B", archanges: "#9FD8FF", "raphaël": "#9FD8FF", uber: "#7EE08A" },
};
// episodes built with makeStory carry their own audio and keywords
const fromStory = (id: string, n: number, tl: TL, st: { frameAt: EpisodeDef["frameAt"]; audio: { score: string; scoreVol: number; beds: EpisodeDef["beds"]; sfx: EpisodeDef["sfx"] }; keywords: Record<string, string> }): EpisodeDef =>
  ({ id, n, tl, frameAt: st.frameAt, ...st.audio, keywords: st.keywords });
const M = (m: unknown) => m as Record<string, number[]>;
export const EP3 = fromStory("ep3", 3, tl3 as TL, makeEp3(tl3 as TL, M(mouth3)));
export const EP4 = fromStory("ep4", 4, tl4 as TL, makeEp4(tl4 as TL, M(mouth4)));
export const EP5 = fromStory("ep5", 5, tl5 as TL, makeEp5(tl5 as TL, M(mouth5)));
export const EP6 = fromStory("ep6", 6, tl6 as TL, makeEp6(tl6 as TL, M(mouth6)));
export const EP7 = fromStory("ep7", 7, tl7 as TL, makeEp7(tl7 as TL, M(mouth7)));
export const EP8 = fromStory("ep8", 8, tl8 as TL, makeEp8(tl8 as TL, M(mouth8)));
export const EPISODES: EpisodeDef[] = [EP1, EP2, WHATIF, EP3, EP4, EP5, EP6, EP7, EP8];
