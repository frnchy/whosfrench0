import { AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, Easing } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { loadFont } from "@remotion/fonts";
import { Gallery } from "./Gallery";
import sim from "./sim.json";
import tl from "./timeline.json";

void Promise.all([
  loadFont({ family: "Inter", url: staticFile("fonts/inter-latin-500-normal.woff2"), weight: "500" }),
  loadFont({ family: "Inter", url: staticFile("fonts/inter-latin-700-normal.woff2"), weight: "700" }),
  loadFont({ family: "EB Garamond", url: staticFile("fonts/eb-garamond-latin-400-normal.woff2"), weight: "400" }),
  loadFont({ family: "EB Garamond", url: staticFile("fonts/eb-garamond-latin-600-normal.woff2"), weight: "600" }),
]);

type Ep = (typeof tl.episodes)[number];
const COL = { gold: "#E9C46A", ice: "#9FD8FF", red: "#FF6B5B", green: "#7EE08A", yellow: "#FFD60A" };
const SPK: Record<string, string> = { "HÉNOCH": COL.gold, "LÉA": COL.ice };
const s = (t: number) => Math.round(t * 30);
const clampI = (f: number, a: number, b: number, from: number, to: number) => interpolate(f, [a, b], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.33, 0, 0.2, 1) });
const epOf = (n: number) => tl.episodes.find((e) => e.n === n)!;
const simOf = (n: number) => sim.episodes.find((e) => e.n === n)!;

// ---------- captions: 1–3 words, cut on punctuation and pauses, timed to Scribe word times ----------
const KEY: Record<string, string> = {
  azazel: COL.red, "qu'azazel": COL.red, shemihaza: COL.red, déchus: COL.red, géants: COL.red, déluge: COL.red, feu: COL.red, flammes: COL.red,
  michel: COL.ice, gabriel: COL.ice, raphaël: COL.ice, uriel: COL.ice, archanges: COL.ice, ciel: COL.ice, cristal: COL.ice,
  hermon: COL.yellow, "deux": COL.yellow, cents: COL.yellow, quatre: COL.yellow, sept: COL.yellow, "soixante-dix": COL.yellow, malédiction: COL.yellow,
  noé: COL.green, guérir: COL.green, paix: COL.green, prière: COL.green, malin: COL.green, sécurité: COL.green,
};
export type Cue = { from: number; to: number; words: string[]; speaker: string };
export const cuesFor = (ep: Ep): Cue[] => {
  const cues: Cue[] = [];
  for (const line of ep.lines) {
    let cur: { text: string; start: number; end: number }[] = [];
    const push = () => { if (cur.length) cues.push({ from: cur[0].start, to: cur[cur.length - 1].end, words: cur.map((w) => w.text), speaker: line.speaker }); cur = []; };
    line.words.forEach((w, i) => {
      const prev = line.words[i - 1];
      if (cur.length && (cur.length >= 3 || /[.,?!…:]$/.test(prev.text) || w.start - prev.end > 0.35)) push();
      cur.push(w);
    });
    push();
  }
  cues.forEach((c, i) => { const n = cues[i + 1]; c.to = n && n.from - c.to < 0.4 ? n.from : c.to + 0.25; });
  return cues;
};
const clean = (w: string) => w.replace(/[.,?!…:«»]/g, "").toLowerCase();

const Captions: React.FC<{ ep: Ep }> = ({ ep }) => {
  const frame = useCurrentFrame(), t = frame / 30;
  const c = cuesFor(ep).find((q) => t >= q.from && t < q.to);
  if (!c) return null;
  const k = Math.min(1, (frame - s(c.from)) / 4);               // pop in over 4 frames, hard cut out
  return (
    <div style={{ position: "absolute", top: 1290, left: 70, width: 790, textAlign: "center" }}>
      <div style={{ font: "500 28px Inter", letterSpacing: "0.22em", color: SPK[c.speaker], marginBottom: 14, textShadow: "0 2px 8px rgba(0,0,0,0.85)" }}>{c.speaker}</div>
      <div style={{ font: "700 84px/1.06 Inter", color: "#fff", transform: `scale(${0.85 + 0.15 * k})`, opacity: k, WebkitTextStroke: "6px #0A0A0A", paintOrder: "stroke fill", textShadow: "0 6px 16px rgba(0,0,0,0.5)" }}>
        {c.words.map((w, i) => <span key={i} style={{ color: KEY[clean(w)] ?? "#fff" }}>{w.replace(/[…«»]/g, "")}{i < c.words.length - 1 ? " " : ""}</span>)}
      </div>
    </div>
  );
};

// ---------- HUD card: which recap, which chapters, which source ----------
const Hud: React.FC<{ ep: Ep; N: number }> = ({ ep, N }) => {
  const frame = useCurrentFrame();
  const o = clampI(frame, 80, 96, 0, 1) * clampI(frame, s(ep.questionAt) - 6, s(ep.questionAt) + 6, 1, 0);
  if (o <= 0 || frame >= N - 12) return null;
  return (
    <div style={{ position: "absolute", left: 40, top: 190, maxWidth: 820, padding: "18px 26px 16px", borderRadius: 22, background: "rgba(6,6,12,0.58)", opacity: o }}>
      <div style={{ font: "500 24px Inter", letterSpacing: "0.2em", color: COL.gold }}>RÉSUMÉ · ÉPISODE {ep.n}/8</div>
      <div style={{ font: "600 60px/1.05 'EB Garamond'", color: "#fff", marginTop: 4, textShadow: "0 3px 14px rgba(0,0,0,0.7)" }}>{ep.title}</div>
      <div style={{ font: "500 30px Inter", color: "rgba(255,255,255,0.92)", marginTop: 6 }}>{ep.ref}</div>
      <div style={{ font: "500 22px Inter", color: "rgba(255,255,255,0.6)", marginTop: 10 }}>Source : trad. R. H. Charles (1917)</div>
    </div>
  );
};

// ---------- opening title (also the last 12 frames → seamless loop) and the closing question ----------
const Title: React.FC<{ ep: Ep; N: number }> = ({ ep, N }) => {
  const frame = useCurrentFrame();
  const opening = frame < 96 || frame >= N - 12;
  const question = !opening && frame >= s(ep.questionAt);
  if (!opening && !question) return null;
  const o = opening ? (frame < 96 ? clampI(frame, 80, 96, 1, 0) : 1) : clampI(frame, s(ep.questionAt), s(ep.questionAt) + 8, 0, 1);
  return (
    <div style={{ position: "absolute", top: 430, left: 60, width: 960, textAlign: "center", opacity: o, textShadow: "0 4px 24px rgba(0,0,0,0.9)" }}>
      {opening ? (
        <>
          <div style={{ font: "500 30px Inter", letterSpacing: "0.3em", color: COL.gold }}>LE LIVRE D'HÉNOCH · ÉPISODE {ep.n}/8</div>
          <div style={{ font: "600 96px/1.05 'EB Garamond'", color: "#fff", marginTop: 18 }}>{ep.title}</div>
          <div style={{ font: "500 34px Inter", color: "rgba(255,255,255,0.85)", marginTop: 18 }}>Le résumé · {ep.ref}</div>
        </>
      ) : (
        <div style={{ font: "600 92px/1.08 'EB Garamond'" }}>
          <div style={{ color: "#fff" }}>{ep.question[0]}</div>
          <div style={{ color: COL.gold }}>{ep.question[1]}</div>
          <div style={{ font: "500 32px Inter", color: "rgba(255,255,255,0.8)", marginTop: 26 }}>Dis-le en commentaire</div>
        </div>
      )}
    </div>
  );
};

const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)" }} />
      <svg width="1080" height="1920" style={{ position: "absolute", opacity: 0.07, mixBlendMode: "overlay" }}>
        <filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 97} /></filter>
        <rect width="1080" height="1920" filter="url(#g)" />
      </svg>
    </AbsoluteFill>
  );
};

// ---------- sound: VO, the series' music bed ducked under speech, a whoosh per pan, a chime on the question ----------
const Sound: React.FC<{ ep: Ep; N: number }> = ({ ep, N }) => {
  const S = simOf(ep.n);
  const speech = ep.lines.map((l) => [s(l.words[0].start) - 4, s(l.words[l.words.length - 1].end) + 4]);
  const bed = (f: number) => {
    const talk = speech.some(([a, b]) => f >= a && f <= b);
    return (talk ? 0.11 : 0.24) * clampI(f, 0, 9, 0, 1) * clampI(f, N - 12, N, 1, 0);
  };
  return (
    <>
      {ep.lines.map((l) => <Sequence key={l.id} from={s(l.start)} durationInFrames={s(l.duration) + 2} layout="none"><Audio src={staticFile(l.file)} /></Sequence>)}
      <Audio src={staticFile("music.mp3")} volume={bed} />
      <Sequence from={8} layout="none"><Audio src={staticFile("sfx/rise.wav")} volume={0.3} /></Sequence>
      {S.leave.slice(0, 7).map((t, k) => <Sequence key={k} from={s(t) - 3} layout="none"><Audio src={staticFile("sfx/whoosh.wav")} volume={0.22} /></Sequence>)}
      <Sequence from={s(ep.questionAt)} layout="none"><Audio src={staticFile("sfx/chime.wav")} volume={0.4} /></Sequence>
      <Sequence from={s(S.leave[7]) - 3} layout="none"><Audio src={staticFile("sfx/whoosh.wav")} volume={0.25} /></Sequence>
    </>
  );
};

// Clean: the 3D gallery + sound, no text. Rendered once per recap.
export const Clean: React.FC<{ n: number }> = ({ n }) => {
  const frame = useCurrentFrame();
  const ep = epOf(n), S = simOf(n), fr = S.frame[Math.min(frame, S.frame.length - 1)];
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <ThreeCanvas width={1080} height={1920} gl={{ antialias: true, preserveDrawingBuffer: true }}>
        <Gallery ep={n} cam={fr.cam} light={fr.light} t={frame / 30} T={S.frames / 30} />
      </ThreeCanvas>
      <Grain />
      <Sound ep={ep} N={S.frames} />
    </AbsoluteFill>
  );
};

// Final: the rendered Clean video (picture + sound) with the text layer on top.
export const Final: React.FC<{ n: number }> = ({ n }) => {
  const ep = epOf(n), N = simOf(n).frames;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <OffthreadVideo src={staticFile(`renders/clean_${n}.mp4`)} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 24%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.6) 72%, rgba(0,0,0,0.25) 92%)" }} />
      <Hud ep={ep} N={N} />
      <Title ep={ep} N={N} />
      <Captions ep={ep} />
    </AbsoluteFill>
  );
};
