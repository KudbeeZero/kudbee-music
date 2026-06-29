// Hermes-Art helper: extract hero clip frames into JPEG sequences the
// compositor draws from. Regenerates assets/frames/ from the committed clips.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FFMPEG = process.env.FFMPEG || resolve(ROOT, '.bin/ffmpeg');
const FFPROBE = process.env.FFPROBE || resolve(ROOT, '.bin/ffprobe');

const CLIPS = [
  { id: 'clip01', file: 'assets/hero-clip-01.mp4' },
  { id: 'clip02', file: 'assets/hero-clip-02.mp4' },
];
const meta = {};
for (const c of CLIPS) {
  const dir = resolve(ROOT, `assets/frames/${c.id}`);
  mkdirSync(dir, { recursive: true });
  spawnSync(FFMPEG, ['-v', 'error', '-y', '-i', resolve(ROOT, c.file), '-an', '-q:v', '3', `${dir}/%04d.jpg`], { stdio: 'inherit' });
  const probe = spawnSync(FFPROBE, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', resolve(ROOT, c.file)]).stdout.toString().trim().split(',');
  const count = spawnSync('bash', ['-c', `ls ${dir} | wc -l`]).stdout.toString().trim();
  meta[c.id] = { fps: 24, w: +probe[0], h: +probe[1], count: +count };
  console.log(`${c.id}: ${count} frames @ ${probe[0]}x${probe[1]}`);
}
writeFileSync(resolve(ROOT, 'assets/frames/meta.json'), JSON.stringify(meta));
console.log('wrote assets/frames/meta.json');
