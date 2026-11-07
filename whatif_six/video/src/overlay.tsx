import React from 'react';
import {AbsoluteFill} from 'remotion';
import {chunkAt} from './captions';
import {B, clamp, secondIndex, smooth} from './time';
import {Cam, project} from './camera';
import {vehicle, vehiclePose, MPH25} from './sim';
import {RULER_X_OFFSET} from './actors';
import story from '../../story.json';

const SERIF = '"EB Garamond", Georgia, serif';
const SANS = 'Inter, "Helvetica Neue", Arial, sans-serif';
const ICE = '#9FD8FF';
const SHADOW = '0 3px 18px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.5)';

// ---------------------------------------------------------------- HUD ----
const fmtIn = (i: number) => `${Math.floor(i / 12)}′${i % 12}″`;
function heightInches(t: number) {
  // 66 in (5'6", CDC adults) -> 46 in (3'10", WHO age 6) -> back
  if (t < B.t0) return 66;
  if (t < B.t0 + 0.6) return Math.round(66 - 20 * smooth((t - B.t0) / 0.6));
  if (t < 46) return 46;
  if (t < 46.4) return Math.round(46 + 20 * smooth((t - 46) / 0.4));
  return 66;
}
const pulse = (t: number, at: number) => 1 + 0.16 * Math.sin(clamp((t - at) / 0.45) * Math.PI);

const Label: React.FC<{children: React.ReactNode; size?: number; op?: number; scale?: number}> = ({children, size = 26, op = 0.85, scale = 1}) => (
  <div style={{fontFamily: SANS, fontWeight: 500, fontSize: size, letterSpacing: '0.2em', color: `rgba(255,255,255,${op})`, textShadow: SHADOW, transform: `scale(${scale})`, transformOrigin: 'left center', whiteSpace: 'nowrap'}}>
    {children}
  </div>
);

const Hud: React.FC<{t: number; T: number}> = ({t, T}) => {
  const inches = heightInches(t);
  const kid = t >= B.t0 && t < 46.2;
  const sec = secondIndex(t);
  const showClock = t >= B.t0 - 0.2 && t < 46.9;
  return (
    <div style={{position: 'absolute', left: 64, top: 162, display: 'flex', flexDirection: 'column', gap: 6}}>
      <Label scale={Math.max(pulse(t, B.t0), pulse(t, 46))}>AVERAGE HEIGHT</Label>
      <div style={{fontFamily: SERIF, fontWeight: 500, fontSize: 80, lineHeight: 1, color: kid ? ICE : '#fff', textShadow: SHADOW}}>{fmtIn(inches)}</div>
      <Label size={22} op={0.7}>TIMES SQUARE, NEW YORK</Label>
      {showClock && (
        <div style={{marginTop: 18, display: 'flex', flexDirection: 'column', gap: 6}}>
          <Label>{sec ? `SECOND ${sec} / 5` : 'SECOND 5 / 5'}</Label>
          <Label size={22} op={0.7}>REAL TIME {Math.min(5, Math.max(0, T)).toFixed(2)} s</Label>
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------- title ----
const Title: React.FC<{t: number}> = ({t}) => {
  const op = 1 - smooth((t - 2.9) / 0.6);
  if (op <= 0) return null;
  return (
    <>
    <AbsoluteFill style={{opacity: op, background: 'radial-gradient(ellipse 75% 22% at 50% 38%, rgba(8,14,22,0.55) 0%, rgba(8,14,22,0) 100%)'}} />
    <div style={{position: 'absolute', left: 0, right: 0, top: 640, textAlign: 'center', opacity: op, fontFamily: SERIF, fontWeight: 500, fontSize: 86, lineHeight: 1.12, color: '#fff', textShadow: '0 4px 28px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.45)'}}>
      What if everyone turned 6
      <br />
      for 5 seconds?
    </div>
    </>
  );
};

// ----------------------------------------------------------- captions ----
const Captions: React.FC<{t: number}> = ({t}) => {
  const c = chunkAt(t);
  if (!c) return null;
  return (
    <div style={{position: 'absolute', left: 80, width: 860, top: 1382 - 60, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{fontFamily: SANS, fontWeight: 700, fontSize: 86, lineHeight: 1.05, letterSpacing: '-0.01em', color: '#fff', textAlign: 'center', textShadow: '0 5px 18px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.6)'}}>
        {c.tokens.map((tk, i) => (
          <span key={i} style={{color: tk.key ? ICE : '#fff'}}>
            {i ? ' ' : ''}
            {tk.text}
          </span>
        ))}
      </div>
    </div>
  );
};

// -------------------------------------------------------- source tags ----
const SOURCES: [number, number, string][] = [
  [5.3, 8.3, 'Source: CDC, measured US adults 20+ (2021–23)'],
  [8.3, 13.05, 'Sources: CDC · WHO growth reference (age 6)'],
  [13.05, 16.25, 'Sources: Dodds et al. 2014 · BMC Musculoskelet. Disord. 2023'],
  [16.25, 24.2, 'Source: American Academy of Pediatrics'],
  [24.2, 27.4, 'estimated'],
  [27.4, 32.2, 'Source: NYC DOT default speed limit · 25 mph = 37 ft/s'],
  [32.2, 40.2, 'Source: IIHS, automatic emergency braking pledge (2023)'],
  [42.2, 45.6, 'Source: AAP: kids under 13 ride in the back seat'],
  [49.8, 55.4, 'Source: Lenroot & Giedd 2006 (NIMH)'],
];
const SourceTag: React.FC<{t: number}> = ({t}) => {
  const s = SOURCES.find(([a, b]) => t >= a && t < b);
  if (!s) return null;
  return (
    <div style={{position: 'absolute', left: 80, width: 860, top: 1470, textAlign: 'center', fontFamily: SANS, fontWeight: 500, fontSize: 22, color: 'rgba(255,255,255,0.62)', textShadow: SHADOW, letterSpacing: s[2] === 'estimated' ? '0.2em' : '0.01em'}}>
      {s[2] === 'estimated' ? 'ESTIMATED' : s[2]}
    </div>
  );
};

// ------------------------------------------------------- 37 ft label ----
const RulerLabel: React.FC<{t: number; T: number; cam: Cam}> = ({t, T, cam}) => {
  if (t < 28.4 || t >= 32) return null;
  const suv = vehicle('suv');
  const z = vehiclePose(suv, Math.max(2.0, Math.min(T, 2.6))).front + MPH25 * 0.55;
  const p = project(cam, [suv.lane + RULER_X_OFFSET, 0.05, z]);
  if (!p.visible) return null;
  const op = smooth((t - 28.4) / 0.4);
  return (
    <div style={{position: 'absolute', left: Math.min(Math.max(p.x, 140), 760), top: p.y - 110, transform: 'translateX(-50%)', opacity: op, fontFamily: SANS, fontWeight: 700, fontSize: 54, color: ICE, textShadow: SHADOW, whiteSpace: 'nowrap'}}>
      37 ft
      <div style={{fontSize: 22, fontWeight: 500, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.85)'}}>IN 1 SECOND</div>
    </div>
  );
};

// ------------------------------------------------- head-size diagram ----
const Diagram: React.FC<{t: number}> = ({t}) => {
  const a = 49.8, b = 55.4;
  const op = smooth((t - a) / 0.35) * (1 - smooth((t - (b - 0.3)) / 0.3));
  if (op <= 0) return null;
  const px = 620 / 1.68; // pixels per metre
  const base = 1250;
  const fig = (H: number, headR: number, kid: boolean, x: number, label: string) => {
    const sh = base - H * (kid ? 0.79 : 0.815) * px; // shoulder y
    const hip = base - H * (kid ? 0.44 : 0.47) * px;
    const tw = (kid ? 0.26 : 0.36) * px, lw = (kid ? 0.1 : 0.13) * px;
    const r = headR * px;
    const fill = 'rgba(255,255,255,0.92)';
    return (
      <g>
        <rect x={x - tw / 2} y={sh} width={tw} height={hip - sh + 10} rx={tw * 0.3} fill={fill} />
        <rect x={x - tw / 2 + 4} y={hip - 4} width={lw} height={base - hip + 4} rx={lw / 2} fill={fill} />
        <rect x={x + tw / 2 - lw - 4} y={hip - 4} width={lw} height={base - hip + 4} rx={lw / 2} fill={fill} />
        <circle cx={x} cy={base - H * px + r} r={r} fill={ICE} />
        <text x={x} y={base + 70} textAnchor="middle" fontFamily={SERIF} fontSize={64} fill="#fff">{label}</text>
      </g>
    );
  };
  return (
    <AbsoluteFill style={{opacity: op}}>
      <AbsoluteFill style={{background: 'rgba(10,16,24,0.78)'}} />
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        <line x1={150} x2={930} y1={base} y2={base} stroke="rgba(255,255,255,0.45)" strokeWidth={3} />
        {fig(1.68, 0.112, false, 360, '5′6″')}
        {fig(1.168, 0.104, true, 720, '3′10″')}
        <text x={540} y={500} textAnchor="middle" fontFamily={SANS} fontWeight={500} fontSize={30} letterSpacing="6" fill="rgba(255,255,255,0.88)">HEADS BARELY SHRANK</text>
      </svg>
    </AbsoluteFill>
  );
};

// --------------------------------------------------------- flashes ------
const Flash: React.FC<{t: number}> = ({t}) => {
  const f = (at: number) => (t >= at ? Math.exp(-(t - at) * 9) * 0.55 : 0);
  const o = Math.max(f(B.t0), f(46.0));
  if (o < 0.01) return null;
  return <AbsoluteFill style={{background: '#ffffff', opacity: o}} />;
};

export const Overlay: React.FC<{t: number; T: number; cam: Cam}> = ({t, T, cam}) => (
  <AbsoluteFill>
    <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.42) 82%, rgba(0,0,0,0.2) 100%)'}} />
    <Flash t={t} />
    <Diagram t={t} />
    <Title t={t} />
    <Hud t={t} T={T} />
    <RulerLabel t={t} T={T} cam={cam} />
    <Captions t={t} />
    <SourceTag t={t} />
    <div style={{display: 'none'}}>{story.title}</div>
  </AbsoluteFill>
);
