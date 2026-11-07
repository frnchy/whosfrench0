import {Config} from '@remotion/cli/config';

// Software WebGL so the 3D renders identically on any machine (no GPU needed).
Config.setChromiumOpenGlRenderer('swangle');
// Use the Chromium that ships with this environment if present.
const shell = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
import * as fs from 'fs';
if (fs.existsSync(shell)) Config.setBrowserExecutable(shell);
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setConcurrency(3);
