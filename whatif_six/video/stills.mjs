// Render many stills with one bundle + one browser:  node stills.mjs 0 2 4 8.5 ...  (seconds)
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition, openBrowser} from '@remotion/renderer';
import path from 'path';
import fs from 'fs';

const times = process.argv.slice(2).map(Number);
const out = path.resolve('../.cache/stills');
fs.mkdirSync(out, {recursive: true});
const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const chromiumOptions = {gl: 'swangle'};
const browser = await openBrowser('chrome', {browserExecutable, chromiumOptions});
const composition = await selectComposition({serveUrl, id: 'WhatIfSix', puppeteerInstance: browser, browserExecutable, chromiumOptions});
for (const t of times) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(t * composition.fps));
  const file = path.join(out, `t${String(t.toFixed(2)).padStart(5, '0')}.png`);
  const t0 = Date.now();
  await renderStill({composition, serveUrl, output: file, frame, puppeteerInstance: browser, browserExecutable, chromiumOptions, overwrite: true});
  console.log(`t=${t} frame=${frame} -> ${path.basename(file)} (${Date.now() - t0} ms)`);
}
await browser.close({silent: true});
