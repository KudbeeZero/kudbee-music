#!/usr/bin/env node
// Hermes x Lightning AI: bring-your-own-agent lyric inference adapter. Opt-in,
// key-gated — NEVER called by the free $0 core. POSTs a prompt to a model you
// deployed on Lightning AI (a LitServe / Lightning Studios HTTPS endpoint) and
// prints the generated lyrics. This is the founder's "if somebody unlocks their
// own agent, it would allow them to have their own brain" path, CLI-side first.
//
// SECURITY: mirrors studio/runway.mjs exactly — the key lives ONLY in the
// gitignored .env.local (never a tracked file, a commit, or a shell export),
// and this script is server/CLI-side, so the key never touches the browser
// bundle. A visitor's OWN Lightning endpoint is a separate, later BYO-slot
// (localStorage, their browser calls their endpoint) — the same boundary the
// Claude BYOK key already holds.
//
//   node studio/lightning.mjs --prompt "a defiant chicago anthem, 2 verses + a hook"
//   node studio/lightning.mjs --ping                 # health-check the endpoint
//   node studio/lightning.mjs --prompt "..." --out out/lyrics.txt
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Node's built-in fetch doesn't read HTTPS_PROXY on its own — sandboxed sessions
// route outbound HTTPS through a local proxy, so opt in before the first fetch().
process.env.NODE_USE_ENV_PROXY ??= '1';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// No dotenv dep in this $0 repo — read .env.local directly so a real key only
// ever lives in the gitignored file. Exported so a test can point it at a fixture.
export function loadEnvLocal(root = ROOT) {
  const p = resolve(root, '.env.local');
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// ---- pure, testable core (no network) --------------------------------------

/**
 * Build the POST request for a Lightning inference endpoint. The body shape is
 * intentionally generic — most LitServe `decode_request` handlers read a single
 * top-level field (default `prompt`); override with `field` if yours differs, and
 * fold in any model params via `extra`. A public endpoint (no key) omits the
 * Authorization header rather than sending `Bearer undefined`.
 */
export function buildRequest({ endpoint, apiKey, prompt, field = 'prompt', extra = {} }) {
  if (!endpoint) throw new Error('no Lightning endpoint configured');
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const body = { [field]: prompt, ...extra };
  return { url: endpoint, init: { method: 'POST', headers, body: JSON.stringify(body) } };
}

/**
 * Pull generated text out of whatever shape the endpoint returns. LitServe
 * handlers vary and some deployments front an OpenAI-compatible server, so probe
 * the common fields before giving up (returns '' rather than throwing on a shape
 * we don't recognize — the caller decides what an empty generation means).
 */
export function extractText(body) {
  if (body == null) return '';
  if (typeof body === 'string') return body;
  if (typeof body !== 'object') return String(body);
  const direct = body.output ?? body.text ?? body.generated_text ?? body.completion ?? body.lyrics ?? body.response;
  if (typeof direct === 'string') return direct;
  const choice = Array.isArray(body.choices) ? body.choices[0] : undefined;
  if (choice) {
    if (typeof choice.text === 'string') return choice.text;
    if (choice.message && typeof choice.message.content === 'string') return choice.message.content;
  }
  if (direct && typeof direct === 'object' && typeof direct.text === 'string') return direct.text;
  return '';
}

/** POST the prompt and return the extracted text. `fetchImpl` is injectable so the
 *  request/response contract is unit-tested without a live key (same discipline as
 *  cloudSync.ts). Throws a readable error on a non-2xx so failures never look empty. */
export async function generate({ endpoint, apiKey, prompt, field, extra, fetchImpl = fetch }) {
  const { url, init } = buildRequest({ endpoint, apiKey, prompt, field, extra });
  const res = await fetchImpl(url, init);
  const raw = await res.text();
  let parsed;
  try { parsed = JSON.parse(raw); } catch { parsed = raw; }
  if (!res.ok) {
    const detail = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
    throw new Error(`lightning request failed (${res.status}): ${detail.slice(0, 300)}`);
  }
  return extractText(parsed);
}

// ---- CLI (only when run directly, never on import) -------------------------

async function main() {
  loadEnvLocal();
  const argv = process.argv.slice(2);
  const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };

  const endpoint = opt('endpoint', process.env.LIGHTNING_ENDPOINT);
  const apiKey = process.env.LIGHTNING_API_KEY;
  if (!endpoint) {
    console.error(
      'LIGHTNING_ENDPOINT not set. Put it (and LIGHTNING_API_KEY) in .env.local (gitignored — see .env.example).\n' +
      'Lightning is opt-in and key-gated: the free core never calls this script.',
    );
    process.exit(1);
  }
  const field = opt('field', 'prompt');

  if (argv.includes('--ping')) {
    try {
      const out = await generate({ endpoint, apiKey, prompt: 'ping', field });
      console.log(`✓ endpoint reachable — sample output: ${out.slice(0, 80) || '(empty response body)'}`);
    } catch (e) {
      console.error(`✗ ${e.message}`);
      process.exit(1);
    }
    return;
  }

  const prompt = opt('prompt', 'Write a short, original hook — defiant, hopeful, grounded. No living-artist mimicry.');
  console.log(`lightning: POST ${endpoint}  (field: ${field})`);
  const text = await generate({ endpoint, apiKey, prompt, field });
  const out = opt('out');
  if (out) {
    const p = resolve(ROOT, out);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, text);
    console.log(`done -> ${p}`);
  } else {
    console.log('\n' + (text || '(empty response body)'));
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
