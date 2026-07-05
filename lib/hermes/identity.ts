// Identity — the onboarding layer for the Hit Factory. Local-first accounts:
// a profile lives in this browser's localStorage (in-memory fallback on the
// server / in tests, same idiom as storage.ts) so the app stays fully static —
// no server, no API routes, $0. OAuth (Google/GitHub) is an honest seam: the
// buttons only appear once a provider is actually configured at build time;
// until then `authProviders()` returns [] and `beginOAuth()` throws.

export type AuthProvider = 'google' | 'github';

export interface Profile {
  id: string;
  name: string;
  kind: 'guest' | 'dev' | 'oauth' | 'email';
  provider?: AuthProvider;
  email?: string;
  createdAt: string;
}

const PROFILE_KEY = 'hermes.profile.v1';
const DEV_DOOR_KEY = 'hermes.devDoor.v1';

interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

const memory = new Map<string, string>();
const memoryKV: KV = {
  getItem: (k) => (memory.has(k) ? memory.get(k)! : null),
  setItem: (k, v) => void memory.set(k, v),
  removeItem: (k) => void memory.delete(k),
};

function kv(): KV {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  return memoryKV;
}

function newId(): string {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isProfile(p: unknown): p is Profile {
  if (!p || typeof p !== 'object') return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    (o.kind === 'guest' || o.kind === 'dev' || o.kind === 'oauth') &&
    typeof o.createdAt === 'string'
  );
}

/** The signed-in profile, or null when the visitor hasn't entered yet. */
export function currentProfile(): Profile | null {
  try {
    const raw = kv().getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isProfile(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function persist(profile: Profile): Profile {
  try {
    kv().setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* quota / unavailable — the profile still works for this session */
  }
  return profile;
}

/** Local-first account: a profile that lives in this browser. Name optional. */
export function signInGuest(name?: string): Profile {
  return persist({
    id: newId(),
    name: name?.trim() || 'Guest',
    kind: 'guest',
    createdAt: new Date().toISOString(),
  });
}

/** The founder's no-login testing door (see isDevEntryAllowed). */
export function signInDev(): Profile {
  return persist({ id: newId(), name: 'Developer', kind: 'dev', createdAt: new Date().toISOString() });
}

/**
 * Restore an identity from a Brain Pack import (see storage.ts importBrain). The raw
 * value comes from a downloaded document, so it's validated like any hostile payload —
 * a bad/absent profile is ignored (returns null) rather than throwing. On success the
 * profile is persisted so the visitor is "signed in as themselves" on the new device.
 */
export function restoreProfile(raw: unknown): Profile | null {
  if (!isProfile(raw)) return null;
  // Rebuild from known fields only — never persist extra attacker-controlled keys, and
  // keep `provider` only when it's a real one (isProfile doesn't validate it).
  const clean: Profile = {
    id: raw.id,
    name: raw.name.slice(0, 80),
    kind: raw.kind,
    createdAt: raw.createdAt,
  };
  if (raw.kind === 'oauth' && (raw.provider === 'google' || raw.provider === 'github')) clean.provider = raw.provider;
  return persist(clean);
}

/** Forget the profile. Deliberately does NOT touch the vault — songs, albums,
 *  taste, and avoid-words stay in this browser. */
export function signOut(): void {
  try {
    kv().removeItem(PROFILE_KEY);
  } catch {
    /* ignore */
  }
}

/** truthy build-time flag: set to any non-empty value except "0"/"false" */
function flagOn(v: string | undefined): boolean {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return s !== '' && s !== '0' && s !== 'false';
}

/**
 * Which OAuth providers are actually configured at build time. Today none are —
 * this returns [] and the UI says so honestly instead of showing dead buttons.
 * To light one up, set NEXT_PUBLIC_AUTH_GOOGLE=1 / NEXT_PUBLIC_AUTH_GITHUB=1
 * (client-safe NEXT_PUBLIC_ vars, inlined by Next at build) once a real flow
 * exists behind beginOAuth().
 */
export function authProviders(): AuthProvider[] {
  const list: AuthProvider[] = [];
  if (flagOn(process.env.NEXT_PUBLIC_AUTH_GOOGLE)) list.push('google');
  if (flagOn(process.env.NEXT_PUBLIC_AUTH_GITHUB)) list.push('github');
  return list;
}

/**
 * The seam where a real OAuth flow will start.
 *
 * TODO(founder decision — see docs/accounts.md): a static export can't do the
 * OAuth token exchange itself (that needs a client secret on a server). Pick one:
 *   a) a hosted auth service (e.g. Supabase Auth / Auth0 / Clerk free tier) — this
 *      function then redirects to the provider's authorize URL and the service
 *      handles the callback; or
 *   b) Cloudflare Pages Functions next to the static site — a tiny /auth/callback
 *      function holds the secret and finishes the exchange.
 * Either way the founder must also create the Google/GitHub OAuth apps and supply
 * their client IDs + redirect URL via NEXT_PUBLIC_ config. Until then this throws —
 * we never fake a sign-in.
 */
export function beginOAuth(provider: AuthProvider): never {
  if (!authProviders().includes(provider)) {
    throw new Error(
      `${provider === 'google' ? 'Google' : 'GitHub'} sign-in isn't configured yet — accounts are local-first today. See docs/accounts.md.`,
    );
  }
  // Configured flag without an implementation is still not a real flow — refuse
  // loudly rather than pretend. Replaced when the founder picks (a) or (b) above.
  throw new Error(`${provider} sign-in is flagged on but the OAuth flow isn't implemented yet. See docs/accounts.md.`);
}

/**
 * Is this a build where the developer door is even allowed to exist? The door is
 * a LOCAL/DEV convenience only — it must NEVER be reachable on the production
 * static deploy, or `…/hermes?dev=1` would be a public backdoor. Two ways it's on:
 *   • a non-production build (`npm run web:dev` → NODE_ENV=development), or
 *   • an explicit opt-in flag baked at build time (`NEXT_PUBLIC_DEV_DOOR=1`) for a
 *     hosted preview you deliberately want the door on.
 * The Cloudflare production export runs `next build` (NODE_ENV=production) with the
 * flag unset, so the door does not exist there — `?dev=1` is inert. Both env reads
 * are inlined by Next at build time, so this can't be flipped from the client.
 */
export function isDevBuild(): boolean {
  return process.env.NODE_ENV !== 'production' || flagOn(process.env.NEXT_PUBLIC_DEV_DOOR);
}

/**
 * The founder's testing door: on a DEV/opt-in build (see `isDevBuild`), visiting
 * with `?dev=1` unlocks a quiet "Developer entry" link on the welcome gate and
 * persists a flag so the door stays open in this browser on later visits. On a
 * production build it always returns false — no query string or stale persisted
 * flag can open it — so it is never a public backdoor on the live deploy.
 * `search` is injectable for tests; it defaults to the real URL in the browser.
 */
export function isDevEntryAllowed(search?: string): boolean {
  // Production hard stop: the door cannot exist on the live static deploy, even if
  // a browser carries a stale hermes.devDoor.v1 flag from a prior dev build.
  if (!isDevBuild()) return false;
  const q = search ?? (typeof window !== 'undefined' ? window.location.search : '');
  try {
    if (new URLSearchParams(q).get('dev') === '1') {
      try {
        kv().setItem(DEV_DOOR_KEY, '1');
      } catch {
        /* ignore */
      }
      return true;
    }
  } catch {
    /* malformed search — fall through to the persisted flag */
  }
  try {
    return kv().getItem(DEV_DOOR_KEY) === '1';
  } catch {
    return false;
  }
}

/** test-only reset */
export function __clearIdentity(): void {
  memory.clear();
  try {
    kv().removeItem(PROFILE_KEY);
    kv().removeItem(DEV_DOOR_KEY);
  } catch {
    /* ignore */
  }
}
