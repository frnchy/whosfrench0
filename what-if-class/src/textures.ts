// Canvas textures: pixel faces, the invented "loopr" phone app, chalkboard, test paper, floating symbols.
import * as THREE from 'three';

const cache = new Map<string, THREE.Texture>();
const mk = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')!] as const; };

export function getTex(key: string): THREE.Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  const [kind, ...a] = key.split(':');
  const canvas = kind === 'face' ? face(a) : kind === 'phone' ? phone(a) : kind === 'board' ? board(a[0]) : kind === 'paper' ? paper() : sym(a.join(':'));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (kind === 'face') { tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; }
  else tex.anisotropy = 8;
  if (kind === 'phone' && cache.size > 400) for (const [k, v] of cache) if (k.startsWith('phone')) { v.dispose(); cache.delete(k); }
  cache.set(key, tex);
  return tex;
}

// ---------- 16×16 pixel face ----------
function face([expr, gxs, gys, blink, glasses, blush, skin]: string[]) {
  const [c, g] = mk(16, 16);
  const px = (x: number, y: number, w: number, h: number, col: string) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const dark = '#2a1a14', gx = +gxs, gy = +gys;
  px(0, 0, 16, 16, skin);
  const sk = new THREE.Color(skin); const shade = '#' + sk.clone().multiplyScalar(0.82).getHexString();
  px(7, 9, 2, 2, shade); // nose
  const closed = blink === '1' || expr === 'joy';
  // eyes
  for (const ex of [2, 10]) {
    if (closed) {
      if (expr === 'joy') { px(ex, 7, 1, 1, dark); px(ex + 1, 6, 2, 1, dark); px(ex + 3, 7, 1, 1, dark); } // ^ ^
      else px(ex, 7, 4, 1, dark);
    } else {
      const big = expr === 'shock';
      px(ex, big ? 5 : 6, 4, big ? 4 : 3, '#ffffff');
      const ox = expr === 'side' ? 2 : gx + 1, oy = big ? 6 + Math.max(0, gy) : 6 + Math.max(0, gy);
      px(ex + ox, oy, 2, 2, dark);
      if (big) px(ex + ox, oy, 1, 1, '#ffffff');
    }
  }
  // brows
  const brow = (x: number, y: number, tilt: number) => { px(x, y + (tilt > 0 ? 1 : 0), 2, 1, dark); px(x + 2, y + (tilt < 0 ? 1 : 0), 2, 1, dark); };
  if (expr === 'sad' || expr === 'cry') { brow(2, 4, -1); brow(10, 4, 1); }
  else if (expr === 'side') { px(2, 5, 4, 1, dark); px(10, 4, 4, 1, dark); }
  else if (expr === 'shock') { px(2, 3, 4, 1, dark); px(10, 3, 4, 1, dark); }
  else { px(2, 4, 4, 1, dark); px(10, 4, 4, 1, dark); }
  // mouth
  const m = '#7a2e2e';
  if (expr === 'happy') { px(5, 12, 1, 1, m); px(6, 13, 4, 1, m); px(10, 12, 1, 1, m); }
  else if (expr === 'joy') { px(5, 11, 6, 1, m); px(5, 12, 6, 2, '#ffffff'); px(6, 13, 4, 1, '#e36464'); px(5, 14, 6, 0, m); }
  else if (expr === 'sad' || expr === 'cry') { px(6, 12, 4, 1, m); px(5, 13, 1, 1, m); px(10, 13, 1, 1, m); }
  else if (expr === 'shock') { px(7, 12, 2, 3, '#4a1515'); }
  else if (expr === 'side') { px(7, 13, 4, 1, m); }
  else px(6, 13, 4, 1, m);
  if (expr === 'cry') { px(3, 9, 1, 5, '#5fc8ff'); px(12, 9, 1, 5, '#5fc8ff'); }
  if (blush === '1' || expr === 'joy') { px(1, 10, 2, 1, '#ff8fa3'); px(13, 10, 2, 1, '#ff8fa3'); }
  if (glasses === '1') {
    g.strokeStyle = '#1b1b1b'; g.lineWidth = 1;
    g.strokeRect(1.5, 4.5, 6, 5); g.strokeRect(8.5, 4.5, 6, 5); px(7, 6, 2, 1, '#1b1b1b');
  }
  return c;
}

// ---------- phone: invented "loopr" reel app ----------
const W = 540, H = 1122; // matches 0.077 × 0.16 screen
const toPx = (u: number, v: number) => [(u / 0.077 + 0.5) * W, (0.5 - v / 0.16) * H] as const;
function phone([mode, replays, pressed, ts]: string[]) {
  const [c, g] = mk(W, H);
  const t = +ts;
  g.fillStyle = '#0f1020'; g.fillRect(0, 0, W, H);
  // status bar
  g.fillStyle = '#fff'; g.font = 'bold 30px sans-serif'; g.fillText('10:47', 34, 52);
  g.fillRect(W - 92, 30, 52, 24); g.fillStyle = '#0f1020'; g.fillRect(W - 88, 34, 30, 16);
  // header: invented app + pixel avatar + fictional handle
  g.fillStyle = '#ff6b35'; g.beginPath(); g.roundRect(28, 82, 64, 64, 18); g.fill();
  g.fillStyle = '#fff'; g.fillRect(44, 104, 12, 12); g.fillRect(66, 104, 12, 12); g.fillRect(48, 124, 26, 6);
  g.fillStyle = '#fff'; g.font = 'bold 32px sans-serif'; g.fillText('@couch.dog.daily', 110, 112);
  g.fillStyle = '#9aa0c8'; g.font = '24px sans-serif'; g.fillText('loopr · reel', 110, 142);
  // reel: pixel dog falls off a couch (loops every 1.6 s)
  const rx = 28, ry = 170, rw = W - 56, rh = 620;
  g.fillStyle = '#ffe3b3'; g.beginPath(); g.roundRect(rx, ry, rw, rh, 26); g.fill();
  g.save(); g.beginPath(); g.roundRect(rx, ry, rw, rh, 26); g.clip();
  g.fillStyle = '#f7c59f'; g.fillRect(rx, ry + 430, rw, 190); // floor
  const P = 20; const blk = (x: number, y: number, w: number, h: number, col: string) => { g.fillStyle = col; g.fillRect(Math.round(x / P) * P, Math.round(y / P) * P, w, h); };
  blk(rx + 60, ry + 300, 300, 120, '#8b4513'); blk(rx + 60, ry + 220, 300, 80, '#a0522d'); blk(rx + 40, ry + 260, 40, 160, '#7a3b10'); // couch
  const k = mode === 'reel' ? (t % 1.6) / 1.6 : 1;
  const fall = Math.max(0, (k - 0.35) / 0.4), fx = rx + 200 + Math.min(fall, 1) * 160, fy = ry + 250 + Math.min(fall, 1) ** 2 * 190;
  g.save(); g.translate(fx, fy); g.rotate(Math.min(fall, 1) * 1.4);
  blk(-60, -40, 120, 60, '#f5deb3'); blk(40, -80, 60, 60, '#f5deb3'); blk(60, -100, 20, 40, '#8b5a2b'); blk(80, -60, 20, 20, '#222');
  blk(-60, 20, 20, 30, '#f5deb3'); blk(40, 20, 20, 30, '#f5deb3');
  g.restore();
  if (fall >= 1) { g.fillStyle = '#ff3b6b'; g.font = 'bold 54px sans-serif'; g.fillText('BONK', rx + 330, ry + 420); }
  g.restore();
  g.fillStyle = '#ffffff'; g.font = 'bold 30px sans-serif'; g.fillText('dog vs couch (part 47)', 40, 836);
  // buttons
  const btn = (name: string, label: string, bg: string) => {
    const r = { replay: [-0.033, -0.068, -0.005, -0.048], watch: [-0.03, 0.038, 0.03, 0.054] }[name]!;
    const [x0, y0] = toPx(r[0], r[3]), [x1, y1] = toPx(r[2], r[1]);
    const on = pressed === name;
    g.fillStyle = on ? '#ffd60a' : bg; g.beginPath(); g.roundRect(x0, y0, x1 - x0, y1 - y0, 22); g.fill();
    if (on) { g.strokeStyle = '#fff'; g.lineWidth = 6; g.stroke(); }
    g.fillStyle = on ? '#111' : '#fff'; g.font = 'bold 30px sans-serif'; g.textAlign = 'center'; g.fillText(label, (x0 + x1) / 2, (y0 + y1) / 2 + 11); g.textAlign = 'left';
  };
  btn('replay', `↻ ${replays}`, '#3a3f7a');
  g.fillStyle = '#ff4d6d'; g.font = 'bold 40px sans-serif'; g.fillText('♥ 2.1k', 300, 975);
  // bottom bar
  g.fillStyle = '#1b1d36'; g.fillRect(0, H - 90, W, 90);
  ['⌂', '⌕', '＋', '✉', '☺'].forEach((s, i) => { g.fillStyle = i === 3 ? '#ff6b35' : '#c9cdf2'; g.font = '40px sans-serif'; g.fillText(s, 40 + i * 104, H - 32); });
  if (mode === 'notif') {
    const slide = Math.min(1, Math.max(0, t / 0.2));
    g.save(); g.translate(0, (slide - 1) * 260);
    g.fillStyle = 'rgba(255,255,255,0.97)'; g.beginPath(); g.roundRect(20, 70, W - 40, 230, 30); g.fill();
    g.fillStyle = '#ff6b35'; g.beginPath(); g.roundRect(40, 92, 56, 56, 16); g.fill();
    g.fillStyle = '#111'; g.font = 'bold 30px sans-serif'; g.fillText('@couch.dog.daily', 112, 122);
    g.fillStyle = '#333'; g.font = '27px sans-serif'; g.fillText('posted: dog vs couch (part 48)', 112, 158);
    g.restore();
    btn('watch', 'WATCH', '#ff6b35');
  }
  return c;
}

// ---------- chalkboard ----------
function board(kind: string) {
  const [c, g] = mk(1200, 550);
  g.fillStyle = '#2c4a3a'; g.fillRect(0, 0, 1200, 550);
  g.fillStyle = 'rgba(255,255,255,0.05)'; for (let i = 0; i < 40; i++) g.fillRect((i * 97) % 1200, (i * 53) % 550, 140, 18);
  g.fillStyle = '#f4f1e8'; g.textAlign = 'center';
  const write = (s: string, x: number, y: number, size: number, col = '#f4f1e8') => { g.fillStyle = col; g.font = `bold ${size}px "Comic Sans MS", cursive, sans-serif`; g.fillText(s, x, y); };
  if (kind === 'sad') { write('∫ x² dx = ?', 330, 200, 90); write('3x + 7 = 22', 860, 200, 80); write('PAGE 214', 600, 420, 70); }
  if (kind === 'half' || kind === 'threeq') { write('FRACTIONS', 600, 120, 80); write('1', 330, 280, 130); g.fillRect(270, 300, 120, 12); write('2', 330, 430, 130); }
  if (kind === 'threeq') { write('3', 830, 280, 130); g.fillRect(770, 300, 120, 12); write('4', 830, 430, 130); }
  if (kind === 'star') { write('★ GENIUS ★', 600, 250, 130, '#ffd60a'); write('A+  A+  A+', 600, 420, 90); }
  return c;
}

function paper() {
  const [c, g] = mk(420, 560);
  g.fillStyle = '#fbfaf3'; g.fillRect(0, 0, 420, 560);
  g.fillStyle = '#9bb7d4'; for (let y = 120; y < 560; y += 40) g.fillRect(0, y, 420, 3);
  g.fillStyle = '#222'; g.font = 'bold 40px sans-serif'; g.fillText('MATH TEST', 30, 70);
  g.font = '28px sans-serif'; ['1) ½ + ½ = 1 ✓', '2) ¾ − ¼ = ½ ✓', '3) 3x = 9 → x = 3 ✓'].forEach((s, i) => g.fillText(s, 30, 160 + i * 40));
  g.strokeStyle = '#e02424'; g.lineWidth = 10; g.beginPath(); g.ellipse(270, 410, 120, 95, -0.2, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#e02424'; g.font = 'bold 150px sans-serif'; g.textAlign = 'center'; g.fillText('A+', 270, 465);
  return c;
}

function sym(s: string) {
  const [c, g] = mk(256, 256);
  g.font = `bold ${s.length > 3 ? 70 : 150}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 10; g.strokeStyle = '#8a4b00'; g.strokeText(s, 128, 132);
  g.fillStyle = '#fff7d6'; g.fillText(s, 128, 132);
  return c;
}
