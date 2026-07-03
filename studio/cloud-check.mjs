#!/usr/bin/env node
// hermes cloud-check — a $0, read-only Supabase readiness diagnostic. Reads the
// two client-safe values from .env.local, hits the live project, and prints a
// checklist of what's done vs. what's still a founder dashboard step, so
// "logged-in + cloud save" (goal part C) has a self-service "am I ready?" check.
// Mirrors `hermes runway --balance`: no spend, no writes, no account creation —
// just GET /auth/v1/settings + a HEAD-ish probe of the brains table.
//
// SECURITY: uses only the *publishable* anon key (RLS is the guard). Never reads
// or needs the service_role key. Read-only — it creates no users and no rows.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

process.env.NODE_USE_ENV_PROXY ??= '1';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function loadEnvLocal(root = ROOT) {
  const p = resolve(root, '.env.local');
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// ---- pure, testable core ---------------------------------------------------

/** Probe the live project (read-only). `fetchImpl` is injectable so the whole
 *  contract is unit-tested without a network. Never throws — a network failure
 *  just leaves the relevant flags false. */
export async function checkReadiness({ url, key, fetchImpl = fetch }) {
  const out = { url: !!url, key: !!key, keyWorks: false, emailAuth: false, googleAuth: false, autoconfirm: false, brainsTable: false };
  if (!url || !key) return out;
  try {
    const r = await fetchImpl(`${url}/auth/v1/settings`, { headers: { apikey: key } });
    if (r.ok) {
      out.keyWorks = true;
      const j = await r.json().catch(() => ({}));
      out.emailAuth = !!(j && j.external && j.external.email);
      out.googleAuth = !!(j && j.external && j.external.google);
      out.autoconfirm = !!(j && j.mailer_autoconfirm);
    }
  } catch { /* network / unreachable — keyWorks stays false */ }
  try {
    // 404 = table missing; anything else (200 rows, or 401/403 from RLS) = it exists.
    const r = await fetchImpl(`${url}/rest/v1/brains?select=user_id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    out.brainsTable = r.status !== 404;
  } catch { /* network — brainsTable stays false */ }
  return out;
}

/** Turn a readiness probe into a checklist + the ordered remaining steps. Cloud
 *  save is "ready" when the key works, a sign-in provider is on, and the brains
 *  table exists. (Autoconfirm is informational — email-confirm flows still work,
 *  they just need a real inbox, which is why it isn't a hard blocker.) */
export function summarize(c) {
  const rows = [
    [c.url && c.key, 'Project URL + publishable key present in .env.local'],
    [c.keyWorks, 'Key + URL reach the live project'],
    [c.emailAuth || c.googleAuth, 'A sign-in provider is enabled (email or Google)'],
    [c.autoconfirm || c.googleAuth, 'Signups auto-complete without a manual email click (optional — lets me live-test)'],
    [c.brainsTable, 'brains table exists (the cloud-save target)'],
  ].map(([ok, label]) => ({ ok: !!ok, label }));

  const authReady = !!(c.emailAuth || c.googleAuth);
  const ready = !!(c.keyWorks && authReady && c.brainsTable);

  const remaining = [];
  if (!c.url || !c.key) remaining.push('Add NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local');
  else if (!c.keyWorks) remaining.push('Key/URL unreachable — double-check the two values in .env.local');
  if (c.keyWorks && !authReady) remaining.push('Enable a sign-in provider: Authentication → Providers → Email (or Google)');
  if (c.keyWorks && !c.brainsTable) remaining.push('Create the brains table + RLS — SQL is in docs/accounts.md');
  return { rows, ready, remaining };
}

// ---- CLI (only when run directly) ------------------------------------------

async function main() {
  loadEnvLocal();
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const c = await checkReadiness({ url, key });
  const { rows, ready, remaining } = summarize(c);

  console.log('HERMES cloud (Supabase) readiness — read-only, no writes:\n');
  for (const r of rows) console.log(`  ${r.ok ? '✅' : '⬜'} ${r.label}`);
  if (ready) {
    console.log('\n🟢 Ready — logged-in accounts + cloud save can go live. The sync-wiring PR can land + be tested.');
  } else {
    console.log('\n⏳ Remaining founder steps:');
    for (const step of remaining) console.log(`   • ${step}`);
    console.log('\nFull checklist: docs/accounts.md');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
