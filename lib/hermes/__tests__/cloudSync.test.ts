import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import {
  signUp, signIn, signOut, loadSession, needsRefresh, refresh, pushBrain, pullBrain,
  __resetCloudSession, type CloudDeps, type CloudSession,
} from '../cloudSync';

// cloudSync's functions read the connected project from cloudConfig() → process.env, so
// point them at a fake project for the whole suite. A fake key in the real format — never
// a live key in committed source.
beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fakeproj.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_FAKEfakeFAKEfakeFAKEfake0000';
});

// A scriptable fetch mock: records the last request and returns a queued response.
function mockDeps(responses: Array<{ status?: number; body?: unknown }>): CloudDeps & { calls: Array<{ url: string; init: RequestInit }> } {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const store = new Map<string, string>();
  let i = 0;
  return {
    calls,
    now: () => 1_000_000_000_000, // fixed epoch ms
    storage: { get: (k) => store.get(k) ?? null, set: (k, v) => void store.set(k, v), remove: (k) => void store.delete(k) },
    fetch: (async (url: string, init: RequestInit) => {
      calls.push({ url: String(url), init });
      const r = responses[i++] ?? { status: 200, body: [] };
      return {
        ok: (r.status ?? 200) < 400,
        status: r.status ?? 200,
        json: async () => r.body,
      } as Response;
    }) as unknown as typeof fetch,
  };
}

const SESSION_BODY = { access_token: 'acc.jwt', refresh_token: 'ref.jwt', expires_in: 3600, user: { id: 'user-123', email: 'a@b.com' } };

beforeEach(() => __resetCloudSession());

describe('cloudSync — auth', () => {
  it('signIn posts the password grant with the anon apikey and stores the session', async () => {
    const deps = mockDeps([{ body: SESSION_BODY }]);
    const res = await signIn('a@b.com', 'pw', deps);
    expect(res.ok).toBe(true);
    const call = deps.calls[0];
    expect(call.url).toBe('https://fakeproj.supabase.co/auth/v1/token?grant_type=password');
    expect((call.init.headers as Record<string, string>).apikey).toMatch(/^sb_publishable_/);
    expect(JSON.parse(call.init.body as string)).toEqual({ email: 'a@b.com', password: 'pw' });
    // session persisted + readable
    expect(loadSession(deps)?.userId).toBe('user-123');
    if (res.ok) expect(res.data.expiresAt).toBe(1_000_000_000 + 3600);
  });

  it('signIn surfaces a server error message instead of throwing', async () => {
    const deps = mockDeps([{ status: 400, body: { error_description: 'Invalid login credentials' } }]);
    const res = await signIn('a@b.com', 'wrong', deps);
    expect(res).toEqual({ ok: false, error: 'Invalid login credentials' });
    expect(loadSession(deps)).toBeNull();
  });

  it('signUp returns a null session when email confirmation is required (no tokens in body)', async () => {
    const deps = mockDeps([{ body: { user: { id: 'u1', email: 'a@b.com' } } }]); // no access_token
    const res = await signUp('a@b.com', 'pw', deps);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toBeNull();
    expect(loadSession(deps)).toBeNull();
  });

  it('signUp stores a session when the project auto-confirms (tokens present)', async () => {
    const deps = mockDeps([{ body: SESSION_BODY }]);
    const res = await signUp('a@b.com', 'pw', deps);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data?.userId).toBe('user-123');
    expect(loadSession(deps)?.userId).toBe('user-123');
  });

  it('needsRefresh is true once the token is within 60s of expiry', () => {
    const deps = mockDeps([]);
    const fresh: CloudSession = { accessToken: 'a', refreshToken: 'r', userId: 'u', email: '', expiresAt: 1_000_000_000 + 3600 };
    const stale: CloudSession = { ...fresh, expiresAt: 1_000_000_000 + 30 };
    expect(needsRefresh(fresh, deps)).toBe(false);
    expect(needsRefresh(stale, deps)).toBe(true);
  });

  it('refresh exchanges the refresh token for a new session', async () => {
    const deps = mockDeps([{ body: { ...SESSION_BODY, access_token: 'acc2.jwt' } }]);
    const res = await refresh({ accessToken: 'old', refreshToken: 'ref.jwt', userId: 'u', email: '', expiresAt: 0 }, deps);
    expect(res.ok).toBe(true);
    expect(deps.calls[0].url).toBe('https://fakeproj.supabase.co/auth/v1/token?grant_type=refresh_token');
    expect(JSON.parse(deps.calls[0].init.body as string)).toEqual({ refresh_token: 'ref.jwt' });
    if (res.ok) expect(res.data.accessToken).toBe('acc2.jwt');
  });

  it('signOut clears the local session and best-effort revokes server-side', async () => {
    const deps = mockDeps([{ body: SESSION_BODY }, { body: {} }]);
    await signIn('a@b.com', 'pw', deps);
    expect(loadSession(deps)).not.toBeNull();
    await signOut(deps);
    expect(loadSession(deps)).toBeNull();
    expect(deps.calls[1].url).toBe('https://fakeproj.supabase.co/auth/v1/logout');
  });
});

describe('cloudSync — brain sync', () => {
  const session: CloudSession = { accessToken: 'acc.jwt', refreshToken: 'r', userId: 'user-123', email: '', expiresAt: 9_999_999_999 };

  it('pushBrain upserts to the user\'s own row with the bearer token and merge-duplicates', async () => {
    const deps = mockDeps([{ status: 201, body: null }]);
    const res = await pushBrain(JSON.stringify({ kind: 'hermes-brain', version: 1 }), session, deps);
    expect(res.ok).toBe(true);
    const call = deps.calls[0];
    expect(call.url).toBe('https://fakeproj.supabase.co/rest/v1/brains');
    const h = call.init.headers as Record<string, string>;
    expect(h.Authorization).toBe('Bearer acc.jwt');
    expect(h.Prefer).toContain('resolution=merge-duplicates');
    const body = JSON.parse(call.init.body as string);
    expect(body.user_id).toBe('user-123');
    expect(body.pack.kind).toBe('hermes-brain');
  });

  it('pushBrain rejects an invalid pack without a network call', async () => {
    const deps = mockDeps([]);
    const res = await pushBrain('not json', session, deps);
    expect(res).toEqual({ ok: false, error: 'invalid brain pack' });
    expect(deps.calls.length).toBe(0);
  });

  it('pullBrain returns the stored pack JSON, or null when the user has no row', async () => {
    const withRow = mockDeps([{ body: [{ pack: { kind: 'hermes-brain', version: 1 } }] }]);
    const got = await pullBrain(session, withRow);
    expect(got.ok).toBe(true);
    if (got.ok) expect(JSON.parse(got.data!).kind).toBe('hermes-brain');

    const noRow = mockDeps([{ body: [] }]);
    const empty = await pullBrain(session, noRow);
    expect(empty).toEqual({ ok: true, data: null });
  });
});
