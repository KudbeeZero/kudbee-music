// Deterministic share links — the "HERMES Live" viral loop. Because generation is
// a hard determinism contract (same inputs + same seed ⇒ byte-identical song, see
// ARCHITECTURE.md), a song can be shared as a tiny URL that REPRODUCES it exactly:
// "here's the song my brain wrote — click to watch it think." Fully client-side,
// $0, no server, no dependency. The decoded token is UNTRUSTED input from a URL, so
// decodeShare sanitizes every field (the same discipline as the vault-import
// hardening) and can never throw or pollute the prototype.
import type { SongInputs, SongStructure, RhymeSchemeId } from './types';
import { RHYME_SCHEME_IDS } from './types';

/** Bumped if the token layout changes; decodeShare rejects unknown versions. */
const SHARE_VERSION = 1;
/** A share token longer than this is refused outright (defense against abuse). */
const MAX_TOKEN_LEN = 4000;
/** Free-text fields are capped (mirrors the pipeline's TEXT_CAP) before they hit state. */
const TEXT_CAP = 2000;

const STRUCTURES: SongStructure[] = ['hook-first', 'verse-first', 'radio-edit', 'short-form', 'full-song'];
const DANGEROUS = new Set(['__proto__', 'constructor', 'prototype']);

// ---- base64url, working in both the browser and Node (tests) --------------------
function toB64Url(s: string): string {
  const b64 = typeof Buffer !== 'undefined'
    ? Buffer.from(s, 'utf8').toString('base64')
    : btoa(unescape(encodeURIComponent(s)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64Url(t: string): string {
  const b64 = t.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((t.length + 3) % 4);
  return typeof Buffer !== 'undefined'
    ? Buffer.from(b64, 'base64').toString('utf8')
    : decodeURIComponent(escape(atob(b64)));
}

// ---- small coercers (self-contained; storage.ts's aren't exported) --------------
const str = (v: unknown): string => (typeof v === 'string' ? v.slice(0, TEXT_CAP) : '');
const numOr = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const clampTempo = (v: unknown, d: number): number => Math.max(40, Math.min(260, Math.round(numOr(v, d))));

/** Rebuild a safe SongInputs from an untrusted decoded object. Never throws; strips
 *  dangerous keys, coerces every field, clamps tempo, caps text. runPipeline
 *  re-normalizes too, so this is defense-in-depth at the state boundary. */
function sanitizeInputs(raw: unknown): SongInputs {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  let tempoMin = clampTempo(r.tempoMin, 120);
  let tempoMax = clampTempo(r.tempoMax, 160);
  if (tempoMin > tempoMax) [tempoMin, tempoMax] = [tempoMax, tempoMin];
  const doNotUse = Array.isArray(r.doNotUse)
    ? r.doNotUse.filter((w): w is string => typeof w === 'string').map((w) => w.slice(0, 100)).slice(0, 64)
    : [];
  const structure = STRUCTURES.includes(r.structure as SongStructure) ? (r.structure as SongStructure) : 'full-song';
  return {
    title: str(r.title), theme: str(r.theme), mood: str(r.mood), genre: str(r.genre),
    tempoMin, tempoMax, voice: str(r.voice), audience: str(r.audience),
    doNotUse, references: str(r.references), structure,
    ...(typeof r.culture === 'string' ? { culture: str(r.culture) } : {}),
    ...(r.rhymeTemp === 'tight' || r.rhymeTemp === 'balanced' || r.rhymeTemp === 'loose'
      ? { rhymeTemp: r.rhymeTemp } : {}),
    // Dropping this field silently broke reproduction for any pattern-pack song
    // (an ABAB share reproduced as AABB for the recipient). Whitelist-validated,
    // same as structure/rhymeTemp — a hostile value is dropped, never passed on.
    ...(RHYME_SCHEME_IDS.includes(r.rhymeScheme as RhymeSchemeId)
      ? { rhymeScheme: r.rhymeScheme as RhymeSchemeId } : {}),
  };
}

/** Encode a song's inputs + seed into a compact, URL-safe share token. */
export function encodeShare(inputs: SongInputs, seed: number): string {
  const payload = { v: SHARE_VERSION, i: sanitizeInputs(inputs), s: (Number.isFinite(seed) ? seed : 0) >>> 0 };
  return toB64Url(JSON.stringify(payload));
}

/**
 * Decode a share token back to { inputs, seed }, or null if it's malformed,
 * oversized, or the wrong version. Never throws. The JSON.parse reviver drops
 * prototype-pollution keys; sanitizeInputs coerces the rest.
 */
export function decodeShare(token: string): { inputs: SongInputs; seed: number } | null {
  if (typeof token !== 'string' || !token || token.length > MAX_TOKEN_LEN) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(fromB64Url(token), (key, value) => (DANGEROUS.has(key) ? undefined : value));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const p = parsed as Record<string, unknown>;
  if (p.v !== SHARE_VERSION) return null;
  return { inputs: sanitizeInputs(p.i), seed: numOr(p.s, 0) >>> 0 };
}

/** Build the full shareable URL for a token. Origin defaults to the current page. */
export function shareUrl(token: string, origin?: string): string {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/hermes?s=${token}`;
}
