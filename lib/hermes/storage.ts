// Vault — local persistence for generated song packages. Uses localStorage in
// the browser; falls back to an in-memory store on the server / in tests so it
// never throws. Keeps a small version history per title.
import type { SongPackage } from './types';
import type { Album } from './album';

const KEY = 'hermes.vault.v1';
const ALBUM_KEY = 'hermes.albums.v1';
const BANNED_KEY = 'hermes.bannedWords.v1';
const TASTE_KEY = 'hermes.taste.v1';
const ALIAS_KEY = 'hermes.artistAlias.v1';

/** Backup mirror suffix — every durable list is written to `<key>` AND `<key>.bak`. */
const BAK = '.bak';

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

// ---- durable read/write with a backup mirror ------------------------------------
// A catalog is precious, so each list is written twice: the live key + a `.bak` mirror.
// On read, if the live key is missing or CORRUPT (unparseable / wrong shape) we fall
// back to the mirror and HEAL the live key from it. This survives a truncated/half
// write or a single cleared key; full-storage export/import (below) covers a wiped browser.
function parseArray<T>(raw: string | null): T[] | null {
  if (!raw) return null;
  try { const p = JSON.parse(raw); return Array.isArray(p) ? (p as T[]) : null; } catch { return null; }
}

function readDurable<T>(key: string): T[] {
  const live = parseArray<T>(kv().getItem(key));
  if (live) return live;
  // live is missing/corrupt → try the backup mirror, and heal the live key from it
  const backup = parseArray<T>(kv().getItem(key + BAK));
  if (backup) {
    try { kv().setItem(key, JSON.stringify(backup)); } catch { /* ignore */ }
    return backup;
  }
  return [];
}

function writeDurable<T>(key: string, list: T[]): void {
  const json = JSON.stringify(list);
  try { kv().setItem(key, json); } catch { /* quota / unavailable */ }
  try { kv().setItem(key + BAK, json); } catch { /* backup best-effort */ }
}

function readAll(): SongPackage[] {
  return readDurable<SongPackage>(KEY);
}

function writeAll(list: SongPackage[]): void {
  writeDurable(KEY, list);
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

// ---- albums ----
function readAlbums(): Album[] {
  return readDurable<Album>(ALBUM_KEY);
}
function writeAlbums(list: Album[]): void {
  writeDurable(ALBUM_KEY, list);
}
export function listAlbums(): Album[] {
  return readAlbums().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
export function getAlbum(id: string): Album | undefined {
  return readAlbums().find((a) => a.id === id);
}
export function saveAlbum(album: Album): Album {
  const next = readAlbums().filter((a) => a.id !== album.id);
  next.push(album);
  writeAlbums(next);
  return album;
}
export function deleteAlbum(id: string): void {
  writeAlbums(readAlbums().filter((a) => a.id !== id));
}

// ---- vault export / import (durability beyond a single browser) ----
export function exportVault(): string {
  return JSON.stringify({ kind: 'hermes-vault', version: 1, songs: readAll(), albums: readAlbums() }, null, 2);
}
export function importVault(json: string, mode: 'merge' | 'replace' = 'merge'): { songs: number; albums: number } {
  let data: { songs?: SongPackage[]; albums?: Album[] };
  try { data = JSON.parse(json); } catch { return { songs: 0, albums: 0 }; }
  const songs = Array.isArray(data.songs) ? data.songs : [];
  const albums = Array.isArray(data.albums) ? data.albums : [];
  if (mode === 'replace') {
    writeAll(songs); writeAlbums(albums);
  } else {
    const sIds = new Set(readAll().map((s) => s.id));
    writeAll([...readAll(), ...songs.filter((s) => !sIds.has(s.id))]);
    const aIds = new Set(readAlbums().map((a) => a.id));
    writeAlbums([...readAlbums(), ...albums.filter((a) => !aIds.has(a.id))]);
  }
  return { songs: songs.length, albums: albums.length };
}

// ---- durability: backup status + explicit restore --------------------------------
/** Whether the live vault appears healthy vs. what the backup mirror holds. */
export function vaultBackupStatus(): { liveSongs: number; backupSongs: number; liveHealthy: boolean } {
  const live = parseArray<SongPackage>(kv().getItem(KEY));
  const backup = parseArray<SongPackage>(kv().getItem(KEY + BAK));
  return { liveSongs: live?.length ?? 0, backupSongs: backup?.length ?? 0, liveHealthy: live !== null };
}

/**
 * Force-restore the live vault (songs + albums) from the backup mirror — the "restore"
 * a UI can offer if the live catalog looks wrong. No-op safety: if a mirror is missing,
 * that list is left as-is. Returns how many items were restored.
 */
export function restoreFromBackup(): { songs: number; albums: number } {
  const songs = parseArray<SongPackage>(kv().getItem(KEY + BAK));
  const albums = parseArray<Album>(kv().getItem(ALBUM_KEY + BAK));
  if (songs) writeAll(songs);
  if (albums) writeAlbums(albums);
  return { songs: songs?.length ?? 0, albums: albums?.length ?? 0 };
}

// ---- taste model (learn-from-edits): words the writer adds vs removes ----
export interface Taste { liked: Record<string, number>; disliked: Record<string, number>; edits: number; }
export function loadTaste(): Taste {
  try {
    const raw = kv().getItem(TASTE_KEY);
    if (raw) { const t = JSON.parse(raw); if (t && t.liked && t.disliked) return t as Taste; }
  } catch { /* ignore */ }
  return { liked: {}, disliked: {}, edits: 0 };
}
// ---- artist alias (create-your-own-artist): the name the artist chooses ----
export function loadArtistAlias(): string {
  try { return kv().getItem(ALIAS_KEY) ?? ''; } catch { return ''; }
}
export function saveArtistAlias(alias: string): void {
  try { kv().setItem(ALIAS_KEY, alias); } catch { /* ignore */ }
}

export function recordTaste(added: string[], removed: string[]): Taste {
  const t = loadTaste();
  for (const w of added) t.liked[w] = (t.liked[w] ?? 0) + 1;
  for (const w of removed) t.disliked[w] = (t.disliked[w] ?? 0) + 1;
  t.edits += 1;
  try { kv().setItem(TASTE_KEY, JSON.stringify(t)); } catch { /* ignore */ }
  return t;
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

/** test-only: corrupt the LIVE vault key (leaving the `.bak` mirror intact) to exercise
 *  the heal-from-backup path. */
export function __corruptLiveVault(): void {
  try { kv().setItem(KEY, '{not valid json'); } catch { /* ignore */ }
}

/** test-only reset */
export function __clearVault(): void {
  memory.clear();
  try {
    kv().setItem(KEY, '[]'); kv().setItem(KEY + BAK, '[]');
    kv().setItem(ALBUM_KEY, '[]'); kv().setItem(ALBUM_KEY + BAK, '[]');
    kv().setItem(TASTE_KEY, JSON.stringify({ liked: {}, disliked: {}, edits: 0 }));
  } catch { /* ignore */ }
}
