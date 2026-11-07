import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { loadFont } from "@remotion/fonts";
import { Scene3D } from "./Scene3D";
import sim from "./sim.json";
import tl from "./timeline.json";

const fonts = Promise.all([
  loadFont({ family: "Inter", url: staticFile("fonts/inter-latin-500-normal.woff2"), weight: "500" }),
  loadFont({ family: "Inter", url: staticFile("fonts/inter-latin-700-normal.woff2"), weight: "700" }),
  loadFont({ family: "Inter", url: staticFile("fonts/inter-latin-900-normal.woff2"), weight: "900" }),
  loadFont({ family: "EB Garamond", url: staticFile("fonts/eb-garamond-latin-400-normal.woff2"), weight: "400" }),
  loadFont({ family: "EB Garamond", url: staticFile("fonts/eb-garamond-latin-600-normal.woff2"), weight: "600" }),
]);
void fonts;

const E = tl.events;
const D = sim.derived;
const COL = { yellow: "#FFD60A", red: "#FF3B30", ice: "#9FD8FF", green: "#30D158", enoch: "#E9C46A", maya: "#9FD8FF" };
const s = (t: number) => Math.round(t * 30);
const ramp = (f: number, a: number, b: number) => interpolate(f, [s(a), s(b)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.33, 0, 0.2, 1) });
const fmt = (n: number, d = 0) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

// ---------- captions: 1–3 words, keyed to Scribe word times ----------
const KEY: Record<string, string> = {
  "364": COL.yellow, "365.24": COL.yellow, quarter: COL.yellow, twelve: COL.yellow, "147": COL.yellow, midsummer: COL.yellow, obey: COL.yellow,
  "339,000": COL.yellow, moon: COL.yellow, sunlight: COL.yellow, forty: COL.yellow, "1750": COL.yellow, calendar: COL.yellow,
  scary: COL.red, closer: COL.red, sooner: COL.red, winter: COL.ice, decide: COL.green, planet: COL.green, no: COL.red,
};
type Cue = { from: number; to: number; words: string[]; speaker: string };
const cues: Cue[] = [];
for (const line of tl.lines) {
  let cur: { text: string; start: number; end: number }[] = [];
  const push = () => { if (cur.length) cues.push({ from: cur[0].start, to: cur[cur.length - 1].end, words: cur.map((w) => w.text), speaker: line.speaker }); cur = []; };
  line.words.forEach((w, i) => {
    const prev = line.words[i - 1];
    if (cur.length && (cur.length >= 3 || /[.,?…]$/.test(prev.text) || w.start - prev.end > 0.35)) push();
    cur.push(w);
  });
  push();
}
cues.forEach((c, i) => { const n = cues[i + 1]; c.to = n && n.from - c.to < 0.4 ? n.from : c.to + 0.25; });
const clean = (w: string) => w.replace(/[.,?…]/g, "").toLowerCase();

const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const c = cues.find((q) => t >= q.from && t < q.to);
  if (!c) return null;
  const k = Math.min(1, (frame - s(c.from)) / 4);               // pop in over 4 frames, hard cut out
  const color = c.speaker === "ENOCH" ? COL.enoch : COL.maya;
  return (
    <div style={{ position: "absolute", top: 1300, left: 70, width: 790, textAlign: "center" }}>
      <div style={{ font: "500 28px Inter", letterSpacing: "0.22em", color, marginBottom: 14, textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>{c.speaker}</div>
      <div style={{ font: "700 86px/1.05 Inter", color: "#fff", transform: `scale(${0.85 + 0.15 * k})`, opacity: k, WebkitTextStroke: "6px #0A0A0A", paintOrder: "stroke fill", textShadow: "0 6px 16px rgba(0,0,0,0.5)" }}>
        {c.words.map((w, i) => <span key={i} style={{ color: KEY[clean(w)] ?? "#fff" }}>{w.replace(/…/g, "")}{i < c.words.length - 1 ? " " : ""}</span>)}
      </div>
    </div>
  );
};

// ---------- HUD: label + value (+ source), every change keyed to a spoken word ----------
const Hud: React.FC<{ fr: (typeof sim.frame)[number] }> = ({ fr }) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  let label = "YEAR LENGTH · 1 ENOCH 82:6", value = "364 days", color = "#fff", sub = "", src = "Source: 1 Enoch 72:32, 82:6 (Charles, 1917)";
  if (t >= E.y365) { label = "YEAR LENGTH · EARTH"; value = "365.24 days"; color = t < E.y365 + 0.6 ? COL.red : "#fff"; src = "Source: mean tropical year 365.24219 d"; }
  if (t >= E.line4) { label = "CALENDAR DRIFT"; value = `+${fmt(fr.driftDays, 1)} days`; sub = `after ${fmt(fr.years)} years`; src = "364-day calendar vs 365.24219-day year"; color = t >= E.winter - 0.3 ? COL.ice : "#fff"; }
  if (t >= E.line6) { label = "EARTH–SUN DISTANCE"; value = `${fmt(sim.constants.au)} km`; sub = ""; color = "#fff"; src = "Source: IAU 2012 Resolution B2"; }
  if (t >= E.closer - 0.3 && t < E.line9) { label = "ORBIT SHIFT FOR A 364-DAY YEAR"; value = `−${fmt(fr.shiftKm)} km`; color = fr.shiftKm > 3e5 ? COL.red : "#fff"; sub = t >= E.moon - 0.2 ? "Moon distance: 384,400 km" : "Kepler's 3rd law: a ∝ T^(2/3)"; src = "Distances to scale · Earth & Moon drawn ×8"; }
  if (t >= E.line9) { const k = ramp(frame, E.half, E.half + 1.2); label = "SUNLIGHT ON EARTH"; value = `+${fmt(D.fluxGainPct * k, 2)}%`; color = k > 0.5 ? COL.yellow : "#fff"; sub = t >= E.forty - 0.1 ? `+${fmt(D.dF, 2)} W/m² ≈ ${fmt(D.pctOfHuman)}% of human forcing` : `+${fmt(D.dS * k, 1)} W/m² at the top of the air`; src = t >= E.forty - 0.1 ? "Source: IPCC AR6 (2.72 W/m², 1750–2019)" : "Source: Kopp & Lean 2011 (1,360.8 W/m²)"; }
  if (t >= E.fix || frame < 3) { label = "YEAR LENGTH · 1 ENOCH 82:6"; value = "364 days"; color = "#fff"; sub = ""; src = "Source: 1 Enoch 72:32, 82:6 (Charles, 1917)"; }
  const scale = fr.scene === "wide" && !(t >= E.line9 && t < E.fix) ? "Sizes and distances not to scale" : "";
  return (
    <div style={{ position: "absolute", left: 40, top: 190, maxWidth: 840, padding: "18px 26px 16px", borderRadius: 22, background: "rgba(6,8,14,0.55)", backdropFilter: "blur(10px)" }}>
      <div style={{ font: "500 24px Inter", letterSpacing: "0.2em", color: "rgba(255,255,255,0.85)", textShadow: "0 2px 6px rgba(0,0,0,0.6)" }}>{label}</div>
      <div style={{ font: "600 78px 'EB Garamond'", fontVariantNumeric: "tabular-nums", color, marginTop: 2, textShadow: "0 3px 14px rgba(0,0,0,0.7)" }}>{value}</div>
      {sub && <div style={{ font: "500 30px Inter", color: "rgba(255,255,255,0.9)", marginTop: 2, textShadow: "0 2px 6px rgba(0,0,0,0.7)" }}>{sub}</div>}
      <div style={{ font: "500 22px Inter", color: "rgba(255,255,255,0.6)", marginTop: 10 }}>{src}</div>
      {scale && <div style={{ font: "500 20px Inter", color: "rgba(255,255,255,0.45)", marginTop: 4 }}>{scale}</div>}
    </div>
  );
};

const Title: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / 30;
  const question = t >= E.move - 0.2 && frame < durationInFrames - 12;
  const opening = frame < 90 || frame >= durationInFrames - 12;       // last 0.4 s matches frame 0 → clean loop
  if (!question && !opening) return null;
  const lines = question ? ["Fix the calendar,", "or move the planet?"] : ["The Book of Enoch says", "a year is 364 days."];
  const out = opening && frame < 90 ? interpolate(frame, [75, 90], [1, 0], { extrapolateLeft: "clamp" }) : 1;
  return (
    <div style={{ position: "absolute", top: 455, left: 60, width: 820, textAlign: "center", opacity: out, font: "600 84px/1.08 'EB Garamond'", color: "#fff", textShadow: "0 4px 24px rgba(0,0,0,0.85)" }}>
      {lines.map((l, i) => <div key={i} style={{ color: question && i === 1 ? COL.green : "#fff" }}>{l}</div>)}
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

// ---------- sound: bed → drop at the scary line → signature sound per beat → new bed at the end ----------
const SFX: [string, number, number][] = [
  ["tick", E.y365, 0.5], ["chime", E.quarter, 0.35], ["tick", E.ten, 0.45], ["tick", E.twelve, 0.45], ["whoosh", E.y147 - 0.3, 0.35],
  ["tick", E.winter, 0.5], ["whoosh", E.obey - 0.2, 0.5], ["hit", E.scary, 0.6], ["whoosh", E.closer - 1.4, 0.45], ["hit", E.km, 0.55],
  ["whoosh", E.line9 - 0.4, 0.45], ["rise", E.half - 0.2, 0.6], ["tick", E.forty, 0.45], ["whoosh", E.fix - 0.2, 0.4], ["chime", E.decide, 0.45],
];
const Sound: React.FC = () => (
  <>
    {tl.lines.map((l) => <Sequence key={l.id} from={s(l.start)} durationInFrames={s(l.duration) + 2} layout="none"><Audio src={staticFile(l.file)} /></Sequence>)}
    <Audio src={staticFile("sfx/bed_dark.wav")} volume={(f) => 0.32 * (1 - interpolate(f, [s(E.scary) - 4, s(E.scary)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) + interpolate(f, [s(E.scary) + 30, s(E.scary) + 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })) * interpolate(f, [s(E.fix), s(E.fix) + 45], [1, 0.35], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
    <Sequence from={s(E.fix) - 10} layout="none"><Audio src={staticFile("sfx/bed_light.wav")} volume={0.45} /></Sequence>
    {SFX.map(([n, t, v], i) => <Sequence key={i} from={Math.max(0, s(t))} layout="none"><Audio src={staticFile(`sfx/${n}.wav`)} volume={v} /></Sequence>)}
  </>
);

export const Video: React.FC<{ showText: boolean }> = ({ showText }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const fr = sim.frame[Math.min(frame, sim.frame.length - 1)];
  const markerOpacity = interpolate(frame, [s(E.quarter), s(E.quarter) + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * interpolate(frame, [s(E.line6), s(E.line6) + 20], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glow = 1 + 0.12 * ramp(frame, E.half, E.half + 1.2) * (1 - ramp(frame, E.fix, E.fix + 1.5)); // illustrative: real gain is +0.46%
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <ThreeCanvas width={width} height={height} gl={{ antialias: true, preserveDrawingBuffer: true }}>
        <Scene3D fr={fr} markerOpacity={markerOpacity} glow={glow} newTrack={ramp(frame, E.closer - 0.3, E.closer + 0.4)} moonRing={ramp(frame, E.almost - 0.2, E.almost + 0.4)} />
      </ThreeCanvas>
      <Grain />
      {showText && <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 24%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.6) 72%, rgba(0,0,0,0.25) 92%)" }} />}
      {showText && (<><Hud fr={fr} /><Title /><Captions /></>)}
      <Sound />
    </AbsoluteFill>
  );
};

export const captionsForSrt = cues;
