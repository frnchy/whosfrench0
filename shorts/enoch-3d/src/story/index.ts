// Registry used by the validator (pure TS, no JSON/TSX imports).
import { makeEp1 } from "./ep1.ts";
import { makeEp2 } from "./ep2.ts";
import { makeWhatif } from "./whatif.ts";
export const STORIES: Record<string, (tl: never, mouth: never) => { frameAt: (f: number) => import("./common.ts").Frame; shots: [string, string, number, number][]; cuts: number[]; speakerOf: (k: number) => string; offscreen?: number[] }> = {
  ep1: makeEp1 as never, ep2: makeEp2 as never, whatif: makeWhatif as never,
};
