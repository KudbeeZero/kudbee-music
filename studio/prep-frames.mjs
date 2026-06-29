// Hermes-Art helper: extract every assets/hero-clip-NN.mp4 into a JPEG sequence
// (clipNN) the compositor draws from. Hero clips are used video-only.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FFMPEG = process.env.FFMPEG || resolve(ROOT, '.bin/ffmpeg');
const FFPROBE = process.env.FFPROBE || resolve(ROOT, '.bin/ffprobe');

const files = readdirSync(resolve(ROOT, 'assets'))
  .filter(f => /^hero-clip-\d+\.mp4$/.test(f)).sort();
const meta = {};
for (const file of files) {
  const id = 'clip' + file.match(/(\d+)/)[1];
  const dir = resolve(ROOT, `assets/frames/${id}`);
  mkdirSync(dir, { recursive: true });
  spawnSync(FFMPEG, ['-v','error','-y','-i', resolve(ROOT,'assets',file), '-an','-q:v','3', `${dir}/%04d.jpg`], { stdio: 'inherit' });
  const wh = spawnSync(FFPROBE, ['-v','error','-select_streams','v:0','-show_entries','stream=width,height','-of','csv=p=0', resolve(ROOT,'assets',file)]).stdout.toString().trim().split(',');
  const count = +spawnSync('bash',['-c',`ls ${dir} | wc -l`]).stdout.toString().trim();
  meta[id] = { fps: 24, w: +wh[0], h: +wh[1], count };
  console.log(`${id}: ${count} frames @ ${wh[0]}x${wh[1]}  (${file})`);
}
writeFileSync(resolve(ROOT, 'assets/frames/meta.json'), JSON.stringify(meta));
console.log('wrote meta.json with', Object.keys(meta).length, 'clips');
