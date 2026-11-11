// One entry per video: everything Video.tsx needs that differs between episodes.
import * as C from './world';
import * as N from './bibi';
import type { World } from './world';

export type Ep = {
  world: (t: number) => World; beats: { t: number; s: number }[]; caps: { text: string; start: number; end: number }[];
  counterAt: (t: number) => { value: number; from: number; since: number };
  title: [string, string]; label: string; titleAt: (t: number) => boolean; length: number; shake: (t: number) => number;
};
const wi = C.TL.scenes.find((s) => s.id === 'whatif')!;
export const EPS: Record<'class' | 'bibi', Ep> = {
  class: { world: C.world, beats: C.TL.beats, caps: C.TL.lines.flatMap((l) => l.caps), counterAt: C.counterAt, title: ['WHAT IF YOU PAID', 'ATTENTION IN CLASS?'], label: 'THINGS LEARNED', titleAt: (t) => t < 3 || (t >= wi.start && t < wi.end), length: C.TL.length, shake: () => 1 },
  // calm before the drop, full shake after it
  bibi: { world: N.world, beats: N.BEATS, caps: N.caps, counterAt: N.counterAt, title: ['WHAT IF YOU WERE', 'NETANYAHU FOR A WEEK?'], label: 'MEMES ABOUT YOU', titleAt: N.titleAt, length: N.LEN, shake: (t) => (t < N.BEATS.find((b) => b.t >= 20)!.t ? 0.45 : 1.3) },
};
