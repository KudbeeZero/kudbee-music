// The cloud-check diagnostic's pure core — the live-probe contract and the
// checklist logic, proven with an injected fetch so no network / real project is
// needed. The CLI half (studio/cloud-check.mjs main()) is a thin wrapper over these.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkReadiness, summarize } from '../studio/cloud-check.mjs';

const SETTINGS = { external: { email: true, google: false }, mailer_autoconfirm: false };

function mockFetch(routes) {
  return async (url) => {
    for (const [match, res] of routes) if (String(url).includes(match)) return res();
    return { ok: false, status: 500, json: async () => ({}) };
  };
}

test('checkReadiness reports key works + email on + google off + table missing (the real 2026-07-03 state)', async () => {
  const fetchImpl = mockFetch([
    ['/auth/v1/settings', () => ({ ok: true, status: 200, json: async () => SETTINGS })],
    ['/rest/v1/brains', () => ({ ok: false, status: 404, json: async () => ({}) })],
  ]);
  const c = await checkReadiness({ url: 'https://p.supabase.co', key: 'sb_publishable_x', fetchImpl });
  assert.equal(c.keyWorks, true);
  assert.equal(c.emailAuth, true);
  assert.equal(c.googleAuth, false);
  assert.equal(c.brainsTable, false);
});

test('checkReadiness treats a non-404 brains response (e.g. RLS 401) as "table exists"', async () => {
  const fetchImpl = mockFetch([
    ['/auth/v1/settings', () => ({ ok: true, status: 200, json: async () => SETTINGS })],
    ['/rest/v1/brains', () => ({ ok: false, status: 401, json: async () => ({}) })],
  ]);
  const c = await checkReadiness({ url: 'https://p.supabase.co', key: 'k', fetchImpl });
  assert.equal(c.brainsTable, true);
});

test('checkReadiness never throws on a network failure — flags just stay false', async () => {
  const fetchImpl = async () => { throw new Error('offline'); };
  const c = await checkReadiness({ url: 'https://p.supabase.co', key: 'k', fetchImpl });
  assert.equal(c.keyWorks, false);
  assert.equal(c.brainsTable, false);
});

test('checkReadiness short-circuits (no fetch) when url/key are absent', async () => {
  let called = false;
  const fetchImpl = async () => { called = true; return { ok: true, status: 200, json: async () => ({}) }; };
  const c = await checkReadiness({ url: '', key: '', fetchImpl });
  assert.equal(called, false);
  assert.equal(c.url, false);
  assert.equal(c.key, false);
});

test('summarize is not ready and lists the brains-table step when only the table is missing', () => {
  const { ready, remaining } = summarize({ url: true, key: true, keyWorks: true, emailAuth: true, googleAuth: false, autoconfirm: false, brainsTable: false });
  assert.equal(ready, false);
  assert.ok(remaining.some((s) => /brains table/i.test(s)));
  assert.ok(!remaining.some((s) => /sign-in provider/i.test(s))); // auth is already satisfied
});

test('summarize is ready when key works, a provider is on, and the table exists', () => {
  const { ready, remaining } = summarize({ url: true, key: true, keyWorks: true, emailAuth: true, googleAuth: false, autoconfirm: true, brainsTable: true });
  assert.equal(ready, true);
  assert.deepEqual(remaining, []);
});

test('summarize lists BOTH provider + table steps when auth is off and table is missing', () => {
  const { ready, remaining } = summarize({ url: true, key: true, keyWorks: true, emailAuth: false, googleAuth: false, autoconfirm: false, brainsTable: false });
  assert.equal(ready, false);
  assert.ok(remaining.some((s) => /sign-in provider/i.test(s)));
  assert.ok(remaining.some((s) => /brains table/i.test(s)));
});
