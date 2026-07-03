// Cloud Brain — the OPTIONAL server-side persistence seam (goal part C: "logged in +
// saved server-side + own memory layer, cross-device"). The $0 core stays fully
// local-first (storage.ts / identity.ts); this lights up ONLY when the founder connects
// a Supabase project by setting the two client-safe env vars below at build time. Until
// then `cloudConfig()` returns null and everything downstream is a graceful no-op, so the
// static export keeps shipping with no server and without the Supabase SDK in the bundle
// — the same opt-in / lazy discipline vectorMemory.ts uses for its embedding dep.
//
// SECURITY: the Supabase ANON key is a PUBLISHABLE client key by design — row-level
// security (RLS) on the founder's project is the real guard, not key secrecy — so it is
// safe as a NEXT_PUBLIC_ var and in the client bundle. The service-role key is a SECRET
// and must NEVER appear here, in a NEXT_PUBLIC_ var, or anywhere client-side. See
// docs/accounts.md → "Supabase setup".

export interface CloudConfig {
  url: string;
  anonKey: string;
}

function readEnv(name: string): string | undefined {
  // NEXT_PUBLIC_ vars are inlined by Next at build; guard `process` for non-Next runtimes
  // (tests / the video CLI) the same way vectorMemory.ts guards its Node access.
  try {
    return typeof process !== 'undefined' ? process.env?.[name] : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The connected Supabase project, or null when cloud sync isn't configured (the $0
 * default). `env` is injectable so the config logic is unit-testable without touching
 * the real build-time environment.
 */
export function cloudConfig(env: Partial<Record<string, string>> = {}): CloudConfig | null {
  const url = (env.NEXT_PUBLIC_SUPABASE_URL ?? readEnv('NEXT_PUBLIC_SUPABASE_URL') ?? '').trim();
  const anonKey = (env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ?? '').trim();
  // Must be a real Supabase project URL and a non-trivial key — a half-set config is
  // treated as "not connected" rather than a broken half-live state.
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) return null;
  if (anonKey.length < 20) return null;
  return { url: url.replace(/\/$/, ''), anonKey };
}

/** True only when a Supabase project is connected — the single switch the rest of the app reads. */
export function cloudEnabled(env?: Partial<Record<string, string>>): boolean {
  return cloudConfig(env) !== null;
}
