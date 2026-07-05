#!/usr/bin/env node
// Hermes x Runway Gen-4: image-to-video adapter. Opt-in, key-gated — never
// called by the free core. Animates a still (agent avatar, HERMES world
// scene, landing-page hero) into a short clip via Runway's Gen-4 Turbo model.
//   node studio/runway.mjs --image assets/hero-still.png --prompt "slow cinematic push-in" --duration 10 --out out/runway/hero.mp4
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, extname } from 'node:path';

// Node's built-in fetch doesn't read HTTPS_PROXY on its own (Node >= 22.21
// needs this flag to opt in) — sandboxed sessions route all outbound HTTPS
// through a local proxy, so this must be set before the first fetch() call.
process.env.NODE_USE_ENV_PROXY ??= '1';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// No dotenv dep in this $0 repo — read .env.local directly so a real key
// only ever lives in the gitignored file, never a tracked one or a shell export.
function loadEnvLocal() {
  const p = resolve(ROOT, '.env.local');
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
// Declare module-scope variables that will be initialized in main() if running as a script
let KEY, argv, opt, API, headers, MIME, toDataUri;

/** Validate task ID from API response — reject non-alphanumeric IDs to prevent URL injection. */
export function validateTaskId(id) {
  if (typeof id !== 'string' || !id) throw new Error('invalid task id: not a non-empty string');
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error(`invalid task id format: "${id}" contains non-alphanumeric characters`);
  return id;
}

async function createTask({ image, prompt, duration, ratio, model, seed }) {
  const body = { model, promptImage: image, promptText: prompt, ratio, duration };
  if (seed != null) body.seed = seed;
  const r = await fetch(`${API}/image_to_video`, { method: 'POST', headers, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(`create task failed (${r.status}): ${JSON.stringify(j)}`);
  return validateTaskId(j.id);
}

async function pollTask(id, { intervalMs = 6000, timeoutMs = 10 * 60 * 1000 } = {}) {
  id = validateTaskId(id);
  const start = Date.now();
  for (;;) {
    const r = await fetch(`${API}/tasks/${id}`, { headers });
    const j = await r.json();
    if (!r.ok) throw new Error(`poll task failed (${r.status}): ${JSON.stringify(j)}`);
    if (j.status === 'SUCCEEDED') return j;
    if (j.status === 'FAILED') throw new Error(`task failed: ${j.failure || j.failureCode || 'unknown reason'}`);
    if (Date.now() - start > timeoutMs) throw new Error('timed out waiting for Runway task');
    console.log(`  ...${j.status.toLowerCase()}${j.progress != null ? ` (${Math.round(j.progress * 100)}%)` : ''}`);
    await new Promise((res) => setTimeout(res, intervalMs));
  }
}

async function downloadTo(url, outPath) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download failed (${r.status})`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, Buffer.from(await r.arrayBuffer()));
}

async function checkBalance() {
  const r = await fetch(`${API}/organization`, { headers });
  const j = await r.json();
  if (!r.ok) throw new Error(`balance check failed (${r.status}): ${JSON.stringify(j)}`);
  console.log(`credit balance: ${j.creditBalance}`);
}

async function main() {
  // Initialize module-scope variables that are only needed when running as a script
  loadEnvLocal();
  KEY = process.env.RUNWAY_API_KEY;
  if (!KEY) {
    console.error(
      'RUNWAY_API_KEY not set. Put it in .env.local (gitignored — see .env.example).\n' +
      'Runway is opt-in and key-gated: the free core never calls this script.',
    );
    process.exit(1);
  }
  argv = process.argv.slice(2);
  opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
  API = 'https://api.dev.runwayml.com/v1';
  headers = {
    Authorization: `Bearer ${KEY}`,
    'X-Runway-Version': '2024-11-06',
    'Content-Type': 'application/json',
  };
  MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png' };
  toDataUri = (path) => `data:${MIME[extname(path).toLowerCase()] || 'image/png'};base64,${readFileSync(path).toString('base64')}`;

  if (argv.includes('--balance')) return checkBalance();

  const imageArg = opt('image');
  const prompt = opt('prompt', 'slow cinematic push-in, subtle ambient motion, cohesive lighting');
  const duration = Number(opt('duration', '10'));
  const ratio = opt('ratio', '1280:720');
  const model = opt('model', 'gen4_turbo');
  const seedOpt = opt('seed');
  const seed = seedOpt != null ? Number(seedOpt) : undefined;
  const out = resolve(ROOT, opt('out', 'out/runway/clip.mp4'));

  if (!imageArg) {
    console.error('Usage: hermes runway --image <path> [--prompt "..."] [--duration 5|10] [--ratio 1280:720] [--out out/runway/clip.mp4]');
    process.exit(1);
  }
  if (![5, 10].includes(duration)) {
    console.error('duration must be 5 or 10 seconds (Runway Gen-4 constraint) — kept short on purpose to conserve credits.');
    process.exit(1);
  }
  const imagePath = resolve(ROOT, imageArg);
  if (!existsSync(imagePath)) {
    console.error(`image not found: ${imagePath}`);
    process.exit(1);
  }

  console.log(`runway ${model}: animating ${imageArg} (${duration}s, ${ratio})`);
  console.log(`  prompt: "${prompt}"`);
  const id = await createTask({ image: toDataUri(imagePath), prompt, duration, ratio, model, seed });
  console.log(`  task ${id} submitted, polling...`);
  const task = await pollTask(id);
  const url = task.output?.[0];
  if (!url) throw new Error('task succeeded but returned no output URL');
  await downloadTo(url, out);
  console.log(`done -> ${out}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
