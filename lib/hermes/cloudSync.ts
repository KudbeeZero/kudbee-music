// Cloud Sync — the real (opt-in) account + server-side brain layer for goal part C.
// Talks to a connected Supabase project's GoTrue (auth) + PostgREST (data) HTTP APIs
// with plain `fetch` — the same "$0, no SDK, no new dependency" discipline the Claude
// BYOK path uses (it calls api.anthropic.com directly rather than pulling the SDK). All
// of it is a no-op unless the founder connects a project via cloudBrain.ts's config seam
// (NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY), so the free static core
// ships with zero server, zero auth, zero bundle weight from this file's code path.
//
// SECURITY: the anon key is publishable (row-level security on the `brains` table is the
// real guard — a signed-in user can only read/write their own row). The access token is
// a per-user JWT stored in this browser only (same trust model as the vault). The
// service-role key is never referenced here.
//
// This module is a pure library over an injectable `fetch`/`storage`/`now`, so every
// request shape is unit-tested against a mock. It is intentionally NOT wired into any UI
// yet — the UI hookup + a live end-to-end test against the real project land in a
// follow-up once the `brains` table + an auth provider are configured (see docs/accounts.md).

import { cloudConfig, type CloudConfig } from './cloudBrain';

export interface CloudSession {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  /** epoch seconds when the access token expires. */
  expiresAt: number;
}

export type CloudResult<T> = { ok: true; data: T } | { ok: false; error: string };

interface Storage {
  get(k: string): string | null;
  set(k: string, v: string): void;
  remove(k: string): void;
}

export interface CloudDeps {
  fetch: typeof fetch;
  storage: Storage;
  /** epoch ms — injectable so token-expiry logic is deterministic in tests. */
  now: () => number;
}

const SESSION_KEY = 'hermes.cloudSession.v1';

const memoryStore = new Map<string, string>();
const memoryStorage: Storage = {
  get: (k) => (memoryStore.has(k) ? memoryStore.get(k)! : null),
  set: (k, v) => void memoryStore.set(k, v),
  remove: (k) => void memoryStore.delete(k),
};

function defaultDeps(): CloudDeps {
  const storage: Storage =
    typeof window !== 'undefined' && window.localStorage
      ? {
          get: (k) => { try { return window.localStorage.getItem(k); } catch { return null; } },
          set: (k, v) => { try { window.localStorage.setItem(k, v); } catch { /* ignore */ } },
          remove: (k) => { try { window.localStorage.removeItem(k); } catch { /* ignore */ } },
        }
      : memoryStorage;
  return { fetch: (...a) => fetch(...a), storage, now: () => Date.now() };
}

function authHeaders(cfg: CloudConfig, accessToken?: string): Record<string, string> {
  return {
    apikey: cfg.anonKey,
    Authorization: `Bearer ${accessToken ?? cfg.anonKey}`,
    'Content-Type': 'application/json',
  };
}

/** Parse a GoTrue token response into our session shape. Returns null on a malformed body.
 *  `prev` supplies fallback identity for a refresh grant: GoTrue may return fresh tokens
 *  without re-sending the `user` object (or without rotating the refresh token), and that
 *  is a valid refresh — reusing the known userId/email/refreshToken avoids a false logout. */
function toSession(body: unknown, now: number, prev?: CloudSession): CloudSession | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const user = (b.user ?? {}) as Record<string, unknown>;
  const userId = typeof user.id === 'string' ? user.id : prev?.userId;
  const refreshToken = typeof b.refresh_token === 'string' ? b.refresh_token : prev?.refreshToken;
  if (typeof b.access_token !== 'string' || !refreshToken || !userId) return null;
  const expiresIn = typeof b.expires_in === 'number' ? b.expires_in : 3600;
  return {
    accessToken: b.access_token,
    refreshToken,
    userId,
    email: typeof user.email === 'string' ? user.email : (prev?.email ?? ''),
    expiresAt: Math.floor(now / 1000) + expiresIn,
  };
}

async function readError(res: Response): Promise<string> {
  try {
    const j = await res.json();
    return (j?.error_description || j?.msg || j?.message || j?.error || `HTTP ${res.status}`) as string;
  } catch {
    return `HTTP ${res.status}`;
  }
}

// ---- auth (GoTrue) ---------------------------------------------------------------

/** Create an account with email + password. With email-confirmation ON the returned
 *  session may be null (the user must confirm first); with it OFF a session is returned. */
export async function signUp(email: string, password: string, deps: CloudDeps = defaultDeps()): Promise<CloudResult<CloudSession | null>> {
  const cfg = cloudConfig();
  if (!cfg) return { ok: false, error: 'cloud sync is not configured' };
  const res = await deps.fetch(`${cfg.url}/auth/v1/signup`, {
    method: 'POST',
    headers: authHeaders(cfg),
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return { ok: false, error: await readError(res) };
  const body = await res.json().catch(() => null);
  const session = toSession(body, deps.now());
  if (session) persistSession(session, deps);
  return { ok: true, data: session }; // null session ⇒ confirmation required
}

/** Sign in with email + password (GoTrue password grant). */
export async function signIn(email: string, password: string, deps: CloudDeps = defaultDeps()): Promise<CloudResult<CloudSession>> {
  const cfg = cloudConfig();
  if (!cfg) return { ok: false, error: 'cloud sync is not configured' };
  const res = await deps.fetch(`${cfg.url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: authHeaders(cfg),
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return { ok: false, error: await readError(res) };
  const session = toSession(await res.json().catch(() => null), deps.now());
  if (!session) return { ok: false, error: 'malformed sign-in response' };
  persistSession(session, deps);
  return { ok: true, data: session };
}

/** Forget the session locally and best-effort revoke it server-side. */
export async function signOut(deps: CloudDeps = defaultDeps()): Promise<void> {
  const cfg = cloudConfig();
  const session = loadSession(deps);
  deps.storage.remove(SESSION_KEY);
  if (cfg && session) {
    try { await deps.fetch(`${cfg.url}/auth/v1/logout`, { method: 'POST', headers: authHeaders(cfg, session.accessToken) }); }
    catch { /* local sign-out already done */ }
  }
}

/** The stored session for this browser, or null. Does not check expiry (see needsRefresh). */
export function loadSession(deps: CloudDeps = defaultDeps()): CloudSession | null {
  try {
    const raw = deps.storage.get(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (
      s && typeof s.accessToken === 'string' && typeof s.refreshToken === 'string' &&
      typeof s.userId === 'string' && typeof s.expiresAt === 'number' && Number.isFinite(s.expiresAt)
    ) return s as CloudSession;
  } catch { /* ignore */ }
  return null;
}

function persistSession(session: CloudSession, deps: CloudDeps): void {
  try { deps.storage.set(SESSION_KEY, JSON.stringify(session)); } catch { /* ignore */ }
}

/** True when the access token has expired (or is within a 60s skew of expiring). */
export function needsRefresh(session: CloudSession, deps: CloudDeps = defaultDeps()): boolean {
  return Math.floor(deps.now() / 1000) >= session.expiresAt - 60;
}

/** Exchange the refresh token for a fresh access token. */
export async function refresh(session: CloudSession, deps: CloudDeps = defaultDeps()): Promise<CloudResult<CloudSession>> {
  const cfg = cloudConfig();
  if (!cfg) return { ok: false, error: 'cloud sync is not configured' };
  const res = await deps.fetch(`${cfg.url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: authHeaders(cfg),
    body: JSON.stringify({ refresh_token: session.refreshToken }),
  });
  if (!res.ok) return { ok: false, error: await readError(res) };
  const next = toSession(await res.json().catch(() => null), deps.now(), session);
  if (!next) return { ok: false, error: 'malformed refresh response' };
  persistSession(next, deps);
  return { ok: true, data: next };
}

// ---- brain sync (PostgREST, RLS-guarded `brains` table) --------------------------

/** Upsert the exported Brain Pack JSON to the signed-in user's own `brains` row. */
export async function pushBrain(packJson: string, session: CloudSession, deps: CloudDeps = defaultDeps()): Promise<CloudResult<null>> {
  const cfg = cloudConfig();
  if (!cfg) return { ok: false, error: 'cloud sync is not configured' };
  let pack: unknown;
  try { pack = JSON.parse(packJson); } catch { return { ok: false, error: 'invalid brain pack' }; }
  const res = await deps.fetch(`${cfg.url}/rest/v1/brains`, {
    method: 'POST',
    headers: {
      ...authHeaders(cfg, session.accessToken),
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({ user_id: session.userId, pack, updated_at: new Date(deps.now()).toISOString() }),
  });
  if (!res.ok) return { ok: false, error: await readError(res) };
  return { ok: true, data: null };
}

/** Read the signed-in user's stored Brain Pack JSON, or null if they have none yet. */
export async function pullBrain(session: CloudSession, deps: CloudDeps = defaultDeps()): Promise<CloudResult<string | null>> {
  const cfg = cloudConfig();
  if (!cfg) return { ok: false, error: 'cloud sync is not configured' };
  const res = await deps.fetch(`${cfg.url}/rest/v1/brains?select=pack&limit=1`, {
    method: 'GET',
    headers: authHeaders(cfg, session.accessToken),
  });
  if (!res.ok) return { ok: false, error: await readError(res) };
  const rows = await res.json().catch(() => null);
  // A real "no brain yet" is an empty array; anything non-array is an unexpected body we
  // must NOT read as "empty" — that would let a caller push and overwrite a live row.
  if (!Array.isArray(rows)) return { ok: false, error: 'unexpected brain response' };
  if (rows.length === 0) return { ok: true, data: null };
  const pack = (rows[0] as Record<string, unknown>).pack;
  return { ok: true, data: pack == null ? null : JSON.stringify(pack) };
}

/** test-only reset of the in-memory storage fallback. */
export function __resetCloudSession(): void {
  memoryStore.clear();
}
