// out/captions.srt from the word-keyed caption chunks in plan/timeline.json
import fs from 'node:fs';
const tl = JSON.parse(fs.readFileSync('plan/timeline.json', 'utf8'));
const ts = (s) => { const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
const caps = tl.lines.flatMap((l) => l.caps);
fs.writeFileSync('out/captions.srt', caps.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.text}\n`).join('\n'));
console.log(caps.length, 'captions');
