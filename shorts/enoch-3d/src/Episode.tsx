import { AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, Easing } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { loadFont } from "@remotion/fonts";
import { Character } from "./three/Character";
import { CameraRig, Heaven, Mountain, Village } from "./three/Sets";
import { Forge } from "./three/Forge";
import type { Frame } from "./story/common.ts";
import { EPISODES } from "./episodes";

void Promise.all([
  loadFont({ family: "Inter", url: staticFile("fonts/inter-latin-500-normal.woff2"), weight: "500" }),
  loadFont({ family: "Inter", url: staticFile("fonts/inter-latin-700-normal.woff2"), weight: "700" }),
  loadFont({ family: "Inter", url: staticFile("fonts/inter-latin-900-normal.woff2"), weight: "900" }),
  loadFont({ family: "EB Garamond", url: staticFile("fonts/eb-garamond-latin-600-normal.woff2"), weight: "600" }),
]);

type Word = { text: string; start: number; end: number };
export type TL = { fps: number; duration: number; frames: number; title: string; ref: string; question: string[]; lines: { id: number; speaker: string; text: string; file: string; start: number; duration: number; words: Word[] }[] };
export type Sfx = [string, number, number];  // file, start s, volume
export type EpisodeDef = { n: number; tl: TL; frameAt: (f: number) => Frame; score: string; scoreVol: number; sfx: Sfx[]; beds: [string, number, number, number][]; keywords: Record<string, string> };

const SPK_COL: Record<string, string> = { KOKABIEL: "#C9A6FF", "HÉNOCH": "#E9C46A", SHEMIHAZA: "#E8E4DA", AZAZEL: "#FF6B5B", ANGE: "#9FD8FF", CHOEUR: "#FFD60A", KASDEJA: "#C9A6FF", FORGERON: "#F2A65A", "FEMME": "#F5B7C5", "ENFANT": "#8EE08A" };
const SPK_NAME: Record<string, string> = { CHOEUR: "LES 200" };
const s = (t: number) => Math.round(t * 30);
const clampI = (f: number, a: number, b: number, from: number, to: number) => interpolate(f, [a, b], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.33, 0, 0.2, 1) });

export type Cue = { from: number; to: number; words: string[]; speaker: string };
export const cuesFor = (tl: TL): Cue[] => {
  const cues: Cue[] = [];
  for (const line of tl.lines) {
    let cur: Word[] = [];
    const push = () => { if (cur.length) cues.push({ from: cur[0].start, to: cur[cur.length - 1].end, words: cur.map((w) => w.text), speaker: line.speaker }); cur = []; };
    line.words.forEach((w, i) => { const p = line.words[i - 1]; if (cur.length && (cur.length >= 3 || /[.,?!…:]$/.test(p.text) || w.start - p.end > 0.35)) push(); cur.push(w); });
    push();
  }
  cues.forEach((c, i) => { const n = cues[i + 1]; c.to = n && n.from - c.to < 0.4 ? n.from : c.to + 0.25; });
  return cues;
};
const clean = (w: string) => w.replace(/[.,?!…:«»]/g, "").toLowerCase();

const Captions: React.FC<{ ep: EpisodeDef }> = ({ ep }) => {
  const frame = useCurrentFrame(), t = frame / 30;
  const c = cuesFor(ep.tl).find((q) => t >= q.from && t < q.to);
  if (!c) return null;
  const k = Math.min(1, (frame - s(c.from)) / 4);
  return (
    <div style={{ position: "absolute", top: 1270, left: 60, width: 810, textAlign: "center" }}>
      <div style={{ font: "700 28px Inter", letterSpacing: "0.22em", color: SPK_COL[c.speaker] ?? "#fff", marginBottom: 12, textShadow: "0 2px 8px rgba(0,0,0,0.9)" }}>{SPK_NAME[c.speaker] ?? c.speaker}</div>
      <div style={{ font: "900 88px/1.04 Inter", color: "#fff", transform: `scale(${0.82 + 0.18 * k}) rotate(${(1 - k) * -2}deg)`, opacity: k, WebkitTextStroke: "7px #0A0A0A", paintOrder: "stroke fill", textShadow: "0 6px 18px rgba(0,0,0,0.55)" }}>
        {c.words.map((w, i) => <span key={i} style={{ color: ep.keywords[clean(w)] ?? "#fff" }}>{w.replace(/[…«»]/g, "")}{i < c.words.length - 1 ? " " : ""}</span>)}
      </div>
    </div>
  );
};

const Title: React.FC<{ ep: EpisodeDef }> = ({ ep }) => {
  const frame = useCurrentFrame(), N = ep.tl.frames, L = ep.tl.lines;
  const qStart = s(L[L.length - 1].start) + 6;
  const opening = frame < 84 || frame >= N - 10;
  const question = !opening && frame >= qStart;
  if (!opening && !question) return null;
  const o = opening ? (frame < 84 ? clampI(frame, 68, 84, 1, 0) : 1) : clampI(frame, qStart, qStart + 8, 0, 1);
  return (
    <div style={{ position: "absolute", top: 380, left: 50, width: 980, textAlign: "center", opacity: o, textShadow: "0 4px 26px rgba(0,0,0,0.95)" }}>
      {opening ? (
        <>
          <div style={{ font: "700 30px Inter", letterSpacing: "0.32em", color: "#E9C46A" }}>LE LIVRE D'HÉNOCH · ÉPISODE {ep.n}</div>
          <div style={{ font: "600 100px/1.02 'EB Garamond'", color: "#fff", marginTop: 16 }}>{ep.tl.title}</div>
          <div style={{ font: "500 32px Inter", color: "rgba(255,255,255,0.8)", marginTop: 16 }}>{ep.tl.ref} · d'après la trad. R. H. Charles</div>
        </>
      ) : (
        <div style={{ font: "600 96px/1.06 'EB Garamond'" }}>
          <div style={{ color: "#fff" }}>{ep.tl.question[0]}</div>
          <div style={{ color: "#E9C46A" }}>{ep.tl.question[1]}</div>
          <div style={{ font: "500 32px Inter", color: "rgba(255,255,255,0.85)", marginTop: 24 }}>Réponds en commentaire 👇</div>
        </div>
      )}
    </div>
  );
};

const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.5) 100%)" }} />
      <svg width="1080" height="1920" style={{ position: "absolute", opacity: 0.06, mixBlendMode: "overlay" }}>
        <filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 97} /></filter>
        <rect width="1080" height="1920" filter="url(#g)" />
      </svg>
    </AbsoluteFill>
  );
};

const Sound: React.FC<{ ep: EpisodeDef }> = ({ ep }) => {
  const N = ep.tl.frames;
  const speech = ep.tl.lines.map((l) => [s(l.words[0].start) - 5, s(l.words[l.words.length - 1].end) + 5]);
  const vol = (f: number) => (speech.some(([a, b]) => f >= a && f <= b) ? ep.scoreVol * 0.45 : ep.scoreVol) * clampI(f, 0, 6, 0, 1) * clampI(f, N - 12, N, 1, 0);
  return (
    <>
      {ep.tl.lines.map((l) => <Sequence key={l.id} from={s(l.start)} durationInFrames={s(l.duration) + 3} layout="none"><Audio src={staticFile(l.file)} /></Sequence>)}
      <Audio src={staticFile(ep.score)} volume={vol} />
      {ep.beds.map(([f, a, b, v], i) => <Sequence key={"b" + i} from={s(a)} durationInFrames={Math.max(1, s(b - a))} layout="none"><Audio src={staticFile(f)} loop volume={(x) => v * clampI(x, 0, 10, 0, 1) * clampI(x, s(b - a) - 10, s(b - a), 1, 0)} /></Sequence>)}
      {ep.sfx.map(([f, t, v], i) => <Sequence key={i} from={Math.max(0, s(t))} layout="none"><Audio src={staticFile(f)} volume={v} /></Sequence>)}
    </>
  );
};

export const World: React.FC<{ fr: Frame }> = ({ fr }) => (
  <>
    <CameraRig cam={fr.cam} />
    {fr.set === "heaven" && <Heaven fx={fr.fx} t={fr.t} />}
    {fr.set === "mountain" && <Mountain fx={fr.fx} t={fr.t} />}
    {fr.set === "village" && <Village fx={fr.fx} t={fr.t} night={!["B2_pov_village", "H_jewels", "I_woman"].includes(fr.shot)} />}
    {fr.set === "forge" && <Forge fx={fr.fx} t={fr.t} />}
    {fr.chars.map((c) => <Character key={c.id} c={c} />)}
  </>
);

export const Clean: React.FC<{ n: number }> = ({ n }) => {
  const ep = EPISODES.find((e) => e.n === n)!;
  const frame = useCurrentFrame();
  const fr = ep.frameAt(Math.min(frame, ep.tl.frames - 1));
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <ThreeCanvas width={1080} height={1920} gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: 4 /* ACES */ }}>
        <World fr={fr} />
      </ThreeCanvas>
      <Grain />
      <Sound ep={ep} />
    </AbsoluteFill>
  );
};

export const Final: React.FC<{ n: number }> = ({ n }) => {
  const ep = EPISODES.find((e) => e.n === n)!;
  return (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <OffthreadVideo src={staticFile(`renders/ep${ep.n}_clean.mp4`)} />
    <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.55) 72%, rgba(0,0,0,0.2) 92%)" }} />
    <Title ep={ep} />
    <Captions ep={ep} />
  </AbsoluteFill>
);
};
