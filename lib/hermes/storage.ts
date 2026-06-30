// Vault — local persistence for generated song packages. Uses localStorage in
// the browser; falls back to an in-memory store on the server / in tests so it
// never throws. Keeps a small version history per title.
import type { SongPackage } from './types';

const KEY = 'hermes.vault.v1';
const BANNED_KEY = 'hermes.bannedWords.v1';

interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

const memory = new Map<string, string>();
const memoryKV: KV = {
  getItem: (k) => (memory.has(k) ? memory.get(k)! : null),
  setItem: (k, v) => void memory.set(k, v),
};

function kv(): KV {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  return memoryKV;
}

function readAll(): SongPackage[] {
  try {
    const raw = kv().getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SongPackage[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: SongPackage[]): void {
  try {
    kv().setItem(KEY, JSON.stringify(list));
  } catch {
    /* quota / unavailable — ignore in V1 */
  }
}

/** List newest-first. */
export function listSongs(): SongPackage[] {
  return readAll().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getSong(id: string): SongPackage | undefined {
  return readAll().find((s) => s.id === id);
}

/** Save a package. If a prior song shares the title, bump its version. */
export function saveSong(pkg: SongPackage): SongPackage {
  const all = readAll();
  const priorSameTitle = all.filter((s) => s.title.toLowerCase() === pkg.title.toLowerCase());
  const version = priorSameTitle.length ? Math.max(...priorSameTitle.map((s) => s.version)) + 1 : 1;
  const stored: SongPackage = { ...pkg, version };
  const next = all.filter((s) => s.id !== pkg.id);
  next.push(stored);
  writeAll(next);
  return stored;
}

export function deleteSong(id: string): void {
  writeAll(readAll().filter((s) => s.id !== id));
}

/** Prior songs in the shape the originality checker expects. */
export function priorSongsForOriginality(excludeId?: string) {
  return readAll()
    .filter((s) => s.id !== excludeId)
    .map((s) => ({ id: s.id, title: s.title, finalLyrics: s.finalLyrics, fingerprints: s.uniqueness.fingerprints }));
}

// ---- editable banned-words list ----
export function loadBannedWords(fallback: string[]): string[] {
  try {
    const raw = kv().getItem(BANNED_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function saveBannedWords(words: string[]): void {
  try {
    kv().setItem(BANNED_KEY, JSON.stringify(words));
  } catch {
    /* ignore */
  }
}

/** test-only reset */
export function __clearVault(): void {
  memory.clear();
  try { kv().setItem(KEY, '[]'); } catch { /* ignore */ }
}
