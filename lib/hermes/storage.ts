// Vault — local persistence for generated song packages. Uses localStorage in
// the browser; falls back to an in-memory store on the server / in tests so it
// never throws. Keeps a small version history per title.
import type { SongPackage, RhymeSchemeId } from './types';
import { RHYME_SCHEME_IDS } from './types';
import { isValidOccasionId } from './occasionPacks';
import type { Album } from './album';

const KEY = 'hermes.vault.v1';
const ALBUM_KEY = 'hermes.albums.v1';
const BANNED_KEY = 'hermes.bannedWords.v1';
const TASTE_KEY = 'hermes.taste.v1';
const ALIAS_KEY = 'hermes.artistAlias.v1';
const FAVORITES_KEY = 'hermes.favorites.v1';
const SONG_NOTES_KEY = 'hermes.songNotes.v1';
const RECENT_KEY = 'hermes.recentlyViewed.v1';

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

/** Test-only: makes every durable write throw, simulating a full localStorage. */
let simulateQuota = false;

/** Returns whether the LIVE write landed (the mirror stays best-effort). A swallowed
 *  quota error used to be fully silent — the UI showed a "saved" song that vanished
 *  on reload — so persistence failure is now a reportable result, not a secret. */
function writeDurable<T>(key: string, list: T[]): boolean {
  const json = JSON.stringify(list);
  let ok = false;
  try {
    if (simulateQuota) throw new Error('QuotaExceededError (simulated)');
    kv().setItem(key, json);
    ok = true;
  } catch { /* quota / unavailable — reported via the return value */ }
  try {
    if (!simulateQuota) kv().setItem(key + BAK, json);
  } catch { /* backup best-effort */ }
  return ok;
}

function readAll(): SongPackage[] {
  return readDurable<SongPackage>(KEY);
}

function writeAll(list: SongPackage[]): boolean {
  return writeDurable(KEY, list);
}

/** List newest-first. */
export function listSongs(): SongPackage[] {
  return readAll().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getSong(id: string): SongPackage | undefined {
  return readAll().find((s) => s.id === id);
}

/** Same-title version history kept per song — regenerating one title forever used to
 *  grow the vault unbounded (each list is also mirrored, doubling quota pressure). */
const KEEP_VERSIONS = 5;

/** Keep only the newest KEEP_VERSIONS entries per title (highest version numbers). */
function pruneVersionHistory(list: SongPackage[]): SongPackage[] {
  const byTitle = new Map<string, SongPackage[]>();
  for (const s of list) {
    const k = s.title.toLowerCase();
    const group = byTitle.get(k) ?? [];
    group.push(s);
    byTitle.set(k, group);
  }
  const keep = new Set<string>();
  for (const group of byTitle.values()) {
    group.sort((a, b) => b.version - a.version || (a.createdAt < b.createdAt ? 1 : -1));
    for (const s of group.slice(0, KEEP_VERSIONS)) keep.add(s.id);
  }
  return list.filter((s) => keep.has(s.id));
}

/** Save a package. If a prior song shares the title, bump its version. Returns the
 *  stored package AND whether the write actually landed — on a full localStorage the
 *  song still renders this session, but `persisted: false` means it will NOT survive
 *  a reload and the caller must tell the user instead of pretending it saved. */
export function saveSong(pkg: SongPackage): { song: SongPackage; persisted: boolean } {
  const all = readAll();
  const priorSameTitle = all.filter((s) => s.title.toLowerCase() === pkg.title.toLowerCase());
  const version = priorSameTitle.length ? Math.max(...priorSameTitle.map((s) => s.version)) + 1 : 1;
  const stored: SongPackage = { ...pkg, version };
  const next = all.filter((s) => s.id !== pkg.id);
  next.push(stored);
  const persisted = writeAll(pruneVersionHistory(next));
  return { song: stored, persisted };
}

export function deleteSong(id: string): void {
  writeAll(readAll().filter((s) => s.id !== id));
}

function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'song_' + Math.random().toString(36).slice(2, 10);
}

/** Fork a stored song into a new, independently-versioned entry — a title bump
 *  (saveSong's version history) still overwrites-in-place conceptually; this gives
 *  the artist a real branch to diverge from without touching the original. The new
 *  title gets a "(copy)" suffix, bumped to "(copy 2)", "(copy 3)"... if that title
 *  is already taken, so duplicating the same song twice never collides. Returns
 *  null if the source song isn't found or the write didn't land (full quota). */
export function duplicateSong(id: string, opts: { id?: string; now?: string } = {}): SongPackage | null {
  const all = readAll();
  const source = all.find((s) => s.id === id);
  if (!source) return null;
  const baseTitle = source.title.replace(/\s*\(copy(?: \d+)?\)$/i, '');
  const taken = new Set(all.map((s) => s.title.toLowerCase()));
  let title = `${baseTitle} (copy)`;
  for (let n = 2; taken.has(title.toLowerCase()); n++) title = `${baseTitle} (copy ${n})`;
  const clone: SongPackage = { ...source, id: opts.id ?? genId(), title, version: 1, createdAt: opts.now ?? new Date().toISOString() };
  const persisted = writeAll(pruneVersionHistory([...all, clone]));
  return persisted ? clone : null;
}

const TITLE_MAX = 120;

/** Rename a song in place — a metadata edit, not a new version. Version number is
 *  left untouched; the song simply moves into whatever title-group the new name
 *  belongs to (pruneVersionHistory groups purely by title, same as it always has —
 *  no special-casing needed for the rare case a rename collides with another
 *  title's version history). */
export function renameSong(id: string, newTitle: string): SongPackage | null {
  const all = readAll();
  const idx = all.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  const trimmed = newTitle.trim().slice(0, TITLE_MAX);
  if (!trimmed) return null;
  const renamed: SongPackage = { ...all[idx], title: trimmed };
  const next = [...all.slice(0, idx), renamed, ...all.slice(idx + 1)];
  const persisted = writeAll(pruneVersionHistory(next));
  return persisted ? renamed : null;
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
// Deliberate scope note: quota failure is REPORTED only for song writes (saveSong's
// `persisted`, importVault's counts) — songs are the irreplaceable catalog. Albums,
// taste, banned words, and crossroads votes stay best-effort silent: all are cheap to
// reconstruct, and a banner for every soft write would train users to ignore it.
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

// ---- import sanitization -----------------------------------------------------
// importVault is the one place raw, attacker-controllable JSON enters the engine
// (a shared "vault backup" file). Every accepted item is REBUILT field-by-field
// from an allowlist with type coercion, so a hostile or hand-mangled file can
// never store a shape the rest of the app (components, trace, scoring) chokes on,
// and dangerous keys (__proto__/constructor/prototype) never survive the parse.
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** JSON.parse reviver that drops prototype-pollution vectors anywhere in the tree. */
function stripDangerous(key: string, value: unknown): unknown {
  return DANGEROUS_KEYS.has(key) ? undefined : value;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}
function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}
function bool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback;
}
function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function sanitizeInputs(raw: unknown): SongPackage['inputs'] {
  const r = isObj(raw) ? raw : {};
  const structures = ['hook-first', 'verse-first', 'radio-edit', 'short-form', 'full-song'];
  const structure = structures.includes(str(r.structure)) ? str(r.structure) : 'full-song';
  return {
    title: str(r.title), theme: str(r.theme), mood: str(r.mood), genre: str(r.genre),
    tempoMin: num(r.tempoMin, 120), tempoMax: num(r.tempoMax, 160),
    voice: str(r.voice), audience: str(r.audience), doNotUse: strArr(r.doNotUse),
    references: str(r.references),
    structure: structure as SongPackage['inputs']['structure'],
    ...(typeof r.culture === 'string' ? { culture: r.culture } : {}),
    ...(r.rhymeTemp === 'tight' || r.rhymeTemp === 'balanced' || r.rhymeTemp === 'loose'
      ? { rhymeTemp: r.rhymeTemp } : {}),
    // Preserved (whitelist-validated) so an imported pattern-pack song replays with
    // its real scheme — dropping it made 🔍 Explain regenerate as AABB after import.
    ...(RHYME_SCHEME_IDS.includes(r.rhymeScheme as RhymeSchemeId)
      ? { rhymeScheme: r.rhymeScheme as RhymeSchemeId } : {}),
    // Same whitelist discipline — an imported Song Gift keeps its Occasion Pack.
    ...(isValidOccasionId(r.occasion) ? { occasion: r.occasion } : {}),
  };
}

function sanitizeHook(raw: unknown): SongPackage['chosenHook'] {
  if (!isObj(raw) || typeof raw.text !== 'string' || !raw.text) return null;
  return { text: raw.text, angle: str(raw.angle), cadence: str(raw.cadence), score: num(raw.score) };
}

/** Rebuild a SongPackage from untrusted JSON. Requires id + title; everything else
 *  is coerced to a safe, fully-shaped default. Returns null if unsalvageable. */
export function sanitizeSong(raw: unknown): SongPackage | null {
  if (!isObj(raw)) return null;
  if (typeof raw.id !== 'string' || !raw.id) return null;
  if (typeof raw.title !== 'string' || !raw.title) return null;

  const sections = (Array.isArray(raw.sections) ? raw.sections : [])
    .filter(isObj)
    .filter((s) => typeof s.label === 'string')
    .map((s) => ({ label: str(s.label), lines: strArr(s.lines) }));

  const hookOptions = (Array.isArray(raw.hookOptions) ? raw.hookOptions : [])
    .map(sanitizeHook)
    .filter((h): h is NonNullable<SongPackage['chosenHook']> => h !== null);

  const p = isObj(raw.production) ? raw.production : {};
  const vo = isObj(raw.vocals) ? raw.vocals : {};
  const vi = isObj(raw.visuals) ? raw.visuals : {};
  const u = isObj(raw.uniqueness) ? raw.uniqueness : {};
  const sc = isObj(raw.score) ? raw.score : {};

  return {
    id: raw.id,
    title: raw.title,
    createdAt: str(raw.createdAt, new Date(0).toISOString()),
    version: num(raw.version, 1),
    inputs: sanitizeInputs(raw.inputs),
    brief: str(raw.brief),
    conceptSummary: str(raw.conceptSummary),
    hookOptions,
    chosenHook: sanitizeHook(raw.chosenHook),
    sections,
    finalLyrics: str(raw.finalLyrics),
    production: {
      tempoBpm: num(p.tempoBpm, 140), drums: str(p.drums), bass: str(p.bass),
      instrumentation: strArr(p.instrumentation), arrangement: strArr(p.arrangement),
      genreBlend: str(p.genreBlend), mixVibe: str(p.mixVibe),
    },
    vocals: { delivery: str(vo.delivery), adlibs: strArr(vo.adlibs), doublesAndStacks: str(vo.doublesAndStacks) },
    visuals: {
      albumCoverPrompt: str(vi.albumCoverPrompt), musicVideoPrompt: str(vi.musicVideoPrompt),
      sceneIdeas: strArr(vi.sceneIdeas), shortFormClipIdeas: strArr(vi.shortFormClipIdeas),
    },
    viralClips: (Array.isArray(raw.viralClips) ? raw.viralClips : [])
      .filter(isObj)
      .map((c) => ({
        label: str(c.label), startHint: str(c.startHint), durationSec: num(c.durationSec, 15),
        caption: str(c.caption), hookLine: str(c.hookLine),
      })),
    promoCaption: str(raw.promoCaption),
    uniqueness: {
      score: num(u.score, 100),
      flags: (Array.isArray(u.flags) ? u.flags : [])
        .filter(isObj)
        .filter((f) => typeof f.kind === 'string' && typeof f.detail === 'string')
        .map((f) => ({
          kind: f.kind as SongPackage['uniqueness']['flags'][number]['kind'],
          detail: str(f.detail),
          ...(typeof f.line === 'string' ? { line: f.line } : {}),
          ...(typeof f.suggestion === 'string' ? { suggestion: f.suggestion } : {}),
        })),
      fingerprints: strArr(u.fingerprints),
      bannedWordsHit: strArr(u.bannedWordsHit),
      rewriteSuggestions: (Array.isArray(u.rewriteSuggestions) ? u.rewriteSuggestions : [])
        .filter(isObj)
        .filter((r) => typeof r.line === 'string' && typeof r.suggestion === 'string')
        .map((r) => ({ line: str(r.line), suggestion: str(r.suggestion) })),
    },
    score: {
      hookStrength: num(sc.hookStrength), emotionalClarity: num(sc.emotionalClarity),
      originality: num(sc.originality), replayValue: num(sc.replayValue),
      visualIdentity: num(sc.visualIdentity), shortFormPotential: num(sc.shortFormPotential),
      releaseReadiness: num(sc.releaseReadiness), total: num(sc.total), verdict: str(sc.verdict),
    },
    release: (Array.isArray(raw.release) ? raw.release : [])
      .filter(isObj)
      .filter((r) => typeof r.label === 'string')
      .map((r) => ({ label: str(r.label), ok: bool(r.ok), ...(typeof r.note === 'string' ? { note: r.note } : {}) })),
    agentOutputs: [], // replayable run metadata, not load-bearing — never trusted from a file
    cognition: null,  // recomputed on demand by deliberationForHook
    ...(typeof raw.seed === 'number' && Number.isFinite(raw.seed) ? { seed: raw.seed } : {}),
  };
}

/** Rebuild an Album from untrusted JSON. Requires id + title. */
export function sanitizeAlbum(raw: unknown): Album | null {
  if (!isObj(raw)) return null;
  if (typeof raw.id !== 'string' || !raw.id) return null;
  if (typeof raw.title !== 'string' || !raw.title) return null;
  return {
    id: raw.id,
    title: raw.title,
    concept: str(raw.concept),
    trackIds: strArr(raw.trackIds),
    createdAt: str(raw.createdAt, new Date(0).toISOString()),
  };
}

// ---- vault export / import (durability beyond a single browser) ----
export function exportVault(): string {
  return JSON.stringify({ kind: 'hermes-vault', version: 1, songs: readAll(), albums: readAlbums() }, null, 2);
}
export function importVault(json: string, mode: 'merge' | 'replace' = 'merge'): { songs: number; albums: number } {
  let data: unknown;
  try { data = JSON.parse(json, stripDangerous); } catch { return { songs: 0, albums: 0 }; }
  if (!isObj(data)) return { songs: 0, albums: 0 };

  // validate + rebuild every item, deduping ids WITHIN the payload
  const songs: SongPackage[] = [];
  const seenSongIds = new Set<string>();
  for (const raw of Array.isArray(data.songs) ? data.songs : []) {
    const s = sanitizeSong(raw);
    if (s && !seenSongIds.has(s.id)) { seenSongIds.add(s.id); songs.push(s); }
  }
  const albums: Album[] = [];
  const seenAlbumIds = new Set<string>();
  for (const raw of Array.isArray(data.albums) ? data.albums : []) {
    const a = sanitizeAlbum(raw);
    if (a && !seenAlbumIds.has(a.id)) { seenAlbumIds.add(a.id); albums.push(a); }
  }

  if (mode === 'replace') {
    // honest counts: report 0 if the write didn't land (full storage), and hold
    // imports to the same version cap saveSong enforces (audit fix — a large or
    // hostile backup used to bypass both).
    const ok = writeAll(pruneVersionHistory(songs));
    writeAlbums(albums);
    return { songs: ok ? songs.length : 0, albums: albums.length };
  }
  const existingSongs = readAll();
  const sIds = new Set(existingSongs.map((s) => s.id));
  const newSongs = songs.filter((s) => !sIds.has(s.id));
  const ok = writeAll(pruneVersionHistory([...existingSongs, ...newSongs]));
  const existingAlbums = readAlbums();
  const aIds = new Set(existingAlbums.map((a) => a.id));
  const newAlbums = albums.filter((a) => !aIds.has(a.id));
  writeAlbums([...existingAlbums, ...newAlbums]);
  // honest counts: what was actually ACCEPTED and STORED, not what the file claimed —
  // a swallowed quota failure reports 0, same contract as saveSong's `persisted`.
  return { songs: ok ? newSongs.length : 0, albums: newAlbums.length };
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

// ---- favorites (vault): a song id pin, no bearing on generation --------------------
// Best-effort like taste/alias — cheap to reconstruct, not the irreplaceable catalog
// saveSong's `persisted` flag protects.
export function loadFavorites(): Set<string> {
  try {
    const raw = kv().getItem(FAVORITES_KEY);
    if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr)) return new Set(arr.filter((x) => typeof x === 'string')); }
  } catch { /* ignore */ }
  return new Set();
}

export function toggleFavorite(id: string): Set<string> {
  const favs = loadFavorites();
  if (favs.has(id)) favs.delete(id); else favs.add(id);
  try { kv().setItem(FAVORITES_KEY, JSON.stringify([...favs])); } catch { /* ignore */ }
  return favs;
}

// ---- song notes (vault): a free-text sticky note per song id ----------------------
// A quick "needs a bridge rewrite" / "send to Marcus" reminder — best-effort like
// favorites/taste, no bearing on generation. Capped so a stray paste can't quietly
// bloat the vault's localStorage budget.
const SONG_NOTE_MAX = 280;

export function loadSongNotes(): Record<string, string> {
  try {
    const raw = kv().getItem(SONG_NOTES_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(obj)) if (typeof v === 'string') out[k] = v;
        return out;
      }
    }
  } catch { /* ignore */ }
  return {};
}

export function setSongNote(id: string, note: string): Record<string, string> {
  const notes = loadSongNotes();
  const trimmed = note.trim().slice(0, SONG_NOTE_MAX);
  if (trimmed) notes[id] = trimmed; else delete notes[id];
  try { kv().setItem(SONG_NOTES_KEY, JSON.stringify(notes)); } catch { /* ignore */ }
  return notes;
}

/** Wipe every vault note at once — same one-click-reset convenience as
 *  clearAvoidWords(); the caller is expected to confirm() before calling this. */
export function clearAllSongNotes(): Record<string, string> {
  try { kv().setItem(SONG_NOTES_KEY, JSON.stringify({})); } catch { /* ignore */ }
  return {};
}

// ---- recently viewed (vault): the last few songs opened, newest first -------------
// Best-effort like favorites/notes — a UI convenience, no bearing on generation.
const RECENT_MAX = 5;

export function loadRecentlyViewed(): string[] {
  try {
    const raw = kv().getItem(RECENT_KEY);
    if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr)) return arr.filter((x) => typeof x === 'string'); }
  } catch { /* ignore */ }
  return [];
}

export function recordRecentlyViewed(id: string): string[] {
  const next = [id, ...loadRecentlyViewed().filter((x) => x !== id)].slice(0, RECENT_MAX);
  try { kv().setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
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
  simulateQuota = false;
  try {
    kv().setItem(KEY, '[]'); kv().setItem(KEY + BAK, '[]');
    kv().setItem(ALBUM_KEY, '[]'); kv().setItem(ALBUM_KEY + BAK, '[]');
    kv().setItem(TASTE_KEY, JSON.stringify({ liked: {}, disliked: {}, edits: 0 }));
  } catch { /* ignore */ }
}

/** Test-only: toggle simulated localStorage quota exhaustion (every write fails). */
export function __simulateVaultQuota(on: boolean): void {
  simulateQuota = on;
}
