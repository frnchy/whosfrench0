// Shared story builder: an episode file only declares its shots, cameras, acting and effects.
import { FX0, NEUTRAL, blinkAt, camPath, groundAt, idle, posePath } from "./common.ts";
import type { Arm, Cam, CamKey, Char, Frame, Fx, Pose, PoseKey, SetName, V3 } from "./common.ts";
import type { Timeline } from "./ep1.ts";

export type Audio = { score: string; scoreVol: number; beds: [string, number, number, number][]; sfx: [string, number, number][] };
export type StoryDef = {
  shots: [string, SetName, number, number][];
  cams: Record<string, { keys: CamKey[]; shake?: number }>;
  fx: (t: number, shot: string) => Partial<Fx>;
  chars: (t: number, f: number, shot: string) => Char[];
  offscreen?: number[]; audio: Audio; keywords: Record<string, string>;
};
export const makeStory = (tl: Timeline, mouth: Record<string, number[]>, SPEAKER: Record<string, string>, build: (h: ReturnType<typeof helpers>) => StoryDef) => {
  const h = helpers(tl, mouth, SPEAKER), d = build(h);
  const cuts = d.shots.slice(1).map((x) => Math.ceil(x[2] * tl.fps - 1e-9));
  const frameAt = (f: number): Frame => {
    const t = f / tl.fps, [shot, set] = d.shots[cuts.filter((c) => f >= c).length], c = d.cams[shot];   // shot by frame, same rounding as the cuts
    const chars = d.chars(t, f, shot).map((ch) => ({ ...ch, pos: [ch.pos[0], groundAt(set, ch.pos[0], ch.pos[2]), ch.pos[2]] as V3 }));
    return { t, shot, set, cam: camPath(t, c.keys, c.shake ?? 0), chars, fx: { ...FX0, ...d.fx(t, shot) } };
  };
  return { frameAt, shots: d.shots, cuts, frames: tl.frames, offscreen: d.offscreen, speakerOf: (k: number) => SPEAKER[tl.lines[k - 1].speaker], audio: d.audio, keywords: d.keywords };
};
const helpers = (tl: Timeline, mouth: Record<string, number[]>, SPEAKER: Record<string, string>) => {
  const L = (k: number) => tl.lines[k - 1];
  const s = (k: number) => L(k).start, e = (k: number) => L(k).start + L(k).duration;
  const say = (id: string, t: number) => {
    const k = tl.lines.findIndex((l) => SPEAKER[l.speaker] === id && t >= l.start && t < l.start + l.duration);
    return k < 0 ? 0 : mouth[String(k + 1)][Math.floor((t - tl.lines[k].start) * tl.fps)] ?? 0;
  };
  return {
    L, s, e, T: tl.duration, say,
    cut: (k: number) => s(k) - 0.1,                                    // a cut just before line k starts
    w: (k: number, i: number) => L(k).words[i].start,
    look: (yaw: number, pitch: number): Partial<Pose> => ({ head: [yaw, pitch] }),
    A: (p: number, r: number, el: number): Arm => [p, r, el],
    C: (pos: V3, target: V3, fov = 40): Cam => ({ pos, target, fov }),
    head: (p: V3, H: number, set: SetName = "heaven"): V3 => [p[0], groundAt(set, p[0], p[2]) + H * 0.93, p[2]],
    g: (set: SetName, x: number, z: number) => groundAt(set, x, z),
    // a character: idles, blinks, lip-syncs on its own lines
    ch: (id: string, kind: Char["kind"], pos: V3, yaw: number, t: number, f: number, keys: PoseKey[] = [], extra: Omit<Partial<Char>, "pose"> & { pose?: Partial<Pose> } = {}): Char => {
      const p = { ...idle(id, t, posePath(t, NEUTRAL, keys.length ? keys : [[0, {}]])), mouth: say(id, t), blink: blinkAt(id, f) };
      return { id, kind, pos, yaw, prop: extra.prop, pose: { ...p, ...(extra.pose ?? {}) } };
    },
  };
};
