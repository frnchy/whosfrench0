// Registry used by the validator (pure TS, no JSON/TSX imports).
import { makeEp1 } from "./ep1.ts";
import { makeEp2 } from "./ep2.ts";
import { makeWhatif } from "./whatif.ts";
import { makeEp3 } from "./ep3.ts";
import { makeEp8 } from "./ep8.ts";
import { makeEp7 } from "./ep7.ts";
import { makeEp6 } from "./ep6.ts";
import { makeEp5 } from "./ep5.ts";
import { makeEp4 } from "./ep4.ts";
export const STORIES: Record<string, (tl: never, mouth: never) => { frameAt: (f: number) => import("./common.ts").Frame; shots: [string, string, number, number][]; cuts: number[]; speakerOf: (k: number) => string; offscreen?: number[] }> = {
  ep1: makeEp1 as never, ep2: makeEp2 as never, whatif: makeWhatif as never, ep3: makeEp3 as never, ep8: makeEp8 as never, ep7: makeEp7 as never, ep6: makeEp6 as never, ep5: makeEp5 as never, ep4: makeEp4 as never,
};
