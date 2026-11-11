import { AbsoluteFill, Sequence, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio } from '@remotion/media';
import { Scene3D } from './Scene3D';
import { TL, FPS, onBeat, ev, rnd, clamp, easeOut, lerp } from './world';
import { EPS, type Ep } from './episodes';

// Montserrat (OFL), bundled locally: variable font covering weights 800–900
const fontFamily = 'Montserrat';
const fontHandle = delayRender('Montserrat');
new FontFace(fontFamily, `url(${staticFile('fonts/montserrat-latin.woff2')}) format('woff2')`, { weight: '100 900' }).load().then((f) => { document.fonts.add(f); continueRender(fontHandle); });
const YELLOW = '#FFD60A';
const stroke = (px: number): React.CSSProperties => ({ WebkitTextStroke: `${px}px #000`, paintOrder: 'stroke fill' });

// ---------- beat shake: every hard beat nudges the frame a little ----------
function shake(t: number, ep: Ep) {
  let x = 0, y = 0, s = 1;
  const g = ep.shake(t);
  for (const b of ep.beats) {
    const dt = t - b.t;
    if (dt < 0 || dt > 0.22) continue;
    const k = Math.pow(1 - dt / 0.22, 2) * b.s * g;
    const a = rnd(b.t * 100) * Math.PI * 2;
    x += Math.cos(a) * 7 * k; y += Math.sin(a) * 7 * k; s += 0.012 * k;
  }
  return { x, y, s };
}

const fmt = (v: number) => (v < 0 ? '∞' : v.toLocaleString('en-US'));

const Counter: React.FC<{ t: number; ep: Ep }> = ({ t, ep }) => {
  const { value, from, since } = ep.counterAt(t);
  const roll = clamp(since / 0.35);
  const shown = value < 0 ? -1 : Math.round(lerp(from < 0 ? 0 : from, value, easeOut(roll)));
  const pop = since < 0.3 && t > 0.5 ? 1 + 0.35 * Math.sin((since / 0.3) * Math.PI) : 1;
  const big = value < 0 || value - from >= 100;
  return (
    <div style={{ position: 'absolute', left: 60, top: 430, color: '#fff', fontFamily }}>
      <div style={{ fontWeight: 800, fontSize: 28, letterSpacing: '0.18em', ...stroke(3) }}>{ep.label}</div>
      <div style={{ fontWeight: 900, fontSize: shown < 0 ? 230 : shown >= 1e6 ? 118 : 160, lineHeight: 1, fontVariantNumeric: 'tabular-nums', transform: `scale(${pop})`, transformOrigin: 'left center', ...stroke(8), textShadow: '0 6px 0 #000' }}>{fmt(shown)}</div>
      <div style={{ fontWeight: 800, fontSize: 28, letterSpacing: '0.18em', ...stroke(3) }}>SO FAR</div>
      {big && since < 0.6
        ? Array.from({ length: 14 }, (_, i) => {
            const a = rnd(i + value) * Math.PI * 2, d = 60 + since * 520 * (0.5 + rnd(i * 3)), o = 1 - since / 0.6;
            return <div key={i} style={{ position: 'absolute', left: 120 + Math.cos(a) * d, top: 110 + Math.sin(a) * d, fontSize: 46, color: YELLOW, opacity: o, ...stroke(3) }}>✦</div>;
          })
        : null}
    </div>
  );
};

const Caption: React.FC<{ t: number; ep: Ep }> = ({ t, ep }) => {
  const cap = ep.caps.find((c) => t >= c.start && t < c.end);
  if (!cap) return null;
  const f = (t - cap.start) * FPS;
  const scale = f < 3 ? lerp(1.25, 1, f / 3) : 1;
  const sh = f >= 3 && f < 5 ? (f % 2 ? 6 : -6) : 0;
  const size = cap.text.length > 16 ? 92 : 108;
  return (
    <div style={{ position: 'absolute', left: 60, right: 130, top: 1250, textAlign: 'center', fontFamily, fontWeight: 900, fontSize: size, lineHeight: 1.05, color: YELLOW, transform: `translateX(${sh}px) scale(${scale})`, ...stroke(10), textShadow: '0 6px 0 #000' }}>{cap.text}</div>
  );
};

const Title: React.FC<{ t: number; force?: boolean; ep: Ep }> = ({ t, force, ep }) => {
  if (!force && !ep.titleAt(t)) return null;
  return (
    <div style={{ position: 'absolute', top: 175, left: 40, right: 40, textAlign: 'center', fontFamily, fontWeight: 900, fontSize: ep.title[1].length > 19 ? 60 : 70, lineHeight: 1.08, ...stroke(8), textShadow: '0 6px 0 #000' }}>
      <div style={{ color: '#fff' }}>{ep.title[0]}</div>
      <div style={{ color: YELLOW }}>{ep.title[1]}</div>
    </div>
  );
};

// ---------- sound design (all generated locally) ----------
type Sfx = [number, string, number];
function sfxList(): Sfx[] {
  const out: Sfx[] = [];
  const phone = TL.scenes.find((s) => s.id === 'phone')!;
  for (const x of [4.76, 6.629, 8.51].map((v) => onBeat(v))) if (x > phone.start && x < phone.end) out.push([x - 1 / FPS, 'tap.wav', 0.9]);
  out.push([onBeat(ev(6, 'zero')), 'boom.wav', 0.9]);
  out.push([TL.scenes.find((s) => s.id === 'whatif')!.start, 'scratch.wav', 0.7]);
  out.push([onBeat(ev(7, 'attention')), 'whoosh.wav', 0.8]);
  for (const [ct, cv] of TL.counter.slice(1)) out.push([onBeat(ct), 'ding.wav', cv === 0 ? 0 : 0.35]);
  out.push([TL.scenes.find((s) => s.id === 'peak')!.start, 'choir.wav', 0.8]);
  out.push([onBeat(ev(22, 'bell')), 'bell.wav', 0.6]);
  out.push([onBeat(TL.lines[22].start - 1.2, 0.5), 'ding.wav', 0.8]);
  for (const s of TL.scenes.slice(1)) if (s.id !== 'whatif') out.push([s.start - 0.12, 'whoosh.wav', 0.35]);
  return out.filter((s) => s[2] > 0);
}
const SFX = sfxList();

export const WhatIfVideo: React.FC<{ clean?: boolean; still?: number; title?: boolean; ep?: keyof typeof EPS }> = ({ clean, still, title, ep: epId = 'class' }) => {
  const ep = EPS[epId];
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = still ?? frame / FPS;
  const w = ep.world(t);
  const sk = shake(t, ep);
  const warm = w.warm;
  const grade = ep.bright ? 'saturate(1.35) brightness(1.06)' : `saturate(${lerp(0.5, 1.2, warm)}) contrast(${lerp(0.95, 1.06, warm)}) brightness(${lerp(0.92, 1.04, warm)})`;
  const flip = onBeat(ev(7, 'attention'));
  const flash = epId !== 'class' ? w.flash ?? 0 : t >= flip && t < flip + 0.1 ? 1 - (t - flip) / 0.1 : 0;
  return (
    <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `translate(${sk.x}px, ${sk.y}px) scale(${sk.s})`, filter: grade }}>
        <AbsoluteFill style={{ filter: w.blur ? `blur(${w.blur}px)` : undefined }}>
          <Scene3D w={w} layer="bg" width={width} height={height} />
        </AbsoluteFill>
        {w.blur && w.parts.some((p) => p.fg) ? <Scene3D w={w} layer="fg" width={width} height={height} /> : null}
        {/* mood tint: cold blue when sad, warm glow when happy, golden bloom in heaven */}
        {ep.bright ? null : <AbsoluteFill style={{ background: warm < 0.5 ? 'rgba(70,100,140,0.18)' : 'rgba(255,170,80,0.10)', mixBlendMode: 'soft-light' }} />}
        {w.heaven ? <AbsoluteFill style={{ background: 'radial-gradient(circle at 50% 35%, rgba(255,240,190,0.55), rgba(255,200,120,0) 60%)', mixBlendMode: 'screen' }} /> : null}
        {ep.bright ? null : <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)' }} />}
        <AbsoluteFill style={{ background: '#fff', opacity: flash }} />
      </AbsoluteFill>
      {clean ? null : (
        <AbsoluteFill>
          <Title t={t} force={title} ep={ep} />
          <Counter t={t} ep={ep} />
          <Caption t={t} ep={ep} />
        </AbsoluteFill>
      )}
      {still !== undefined ? null : ep.music ? (
        <Audio src={staticFile(ep.music)} />
      ) : (
        <>
          <Audio src={staticFile('music60.wav')} />
          {TL.lines.map((l) => (
            <Sequence key={l.i} from={Math.round(l.start * FPS)} durationInFrames={Math.ceil(l.dur * FPS) + 2} layout="none">
              <Audio src={staticFile(l.file)} volume={1.4} />
            </Sequence>
          ))}
          {SFX.map(([at, f, vol], i) => (
            <Sequence key={i} from={Math.max(0, Math.round(at * FPS))} durationInFrames={120} layout="none">
              <Audio src={staticFile(f)} volume={vol} />
            </Sequence>
          ))}
        </>
      )}
    </AbsoluteFill>
  );
};
