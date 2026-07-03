// Audio clip storage — voice notes and (later) instrument riffs attached to a song.
// Binary audio doesn't belong in the localStorage JSON vault (storage.ts's kv()):
// a few short recordings would blow past its ~5-10MB quota fast. Clips live in
// IndexedDB instead — also a browser built-in, so this stays $0/no-new-deps. Falls
// back to an in-memory store when IndexedDB isn't available (SSR, tests, an
// unsupported browser) — same shape as storage.ts's kv()/memoryKV fallback, so
// callers never need to branch on environment.
export interface AudioClipMeta {
  id: string;
  songId: string;
  kind: 'voice' | 'riff';
  label: string;
  durationMs: number;
  createdAt: number;
  mimeType: string;
  sizeBytes: number;
}

export interface AudioClip extends AudioClipMeta {
  blob: Blob;
}

interface ClipStore {
  put(clip: AudioClip): Promise<void>;
  get(id: string): Promise<AudioClip | null>;
  listBySong(songId: string): Promise<AudioClipMeta[]>;
  delete(id: string): Promise<void>;
}

function stripBlob(c: AudioClip): AudioClipMeta {
  const { blob: _blob, ...meta } = c;
  return meta;
}
function byCreatedAt(a: AudioClipMeta, b: AudioClipMeta): number {
  return a.createdAt - b.createdAt;
}

// ---- in-memory fallback (SSR / tests / unsupported browsers) --------------------
class MemoryClipStore implements ClipStore {
  private clips = new Map<string, AudioClip>();
  async put(clip: AudioClip) { this.clips.set(clip.id, clip); }
  async get(id: string) { return this.clips.get(id) ?? null; }
  async listBySong(songId: string) {
    return [...this.clips.values()].filter((c) => c.songId === songId).map(stripBlob).sort(byCreatedAt);
  }
  async delete(id: string) { this.clips.delete(id); }
}

// ---- real IndexedDB-backed store (browser) ---------------------------------------
const DB_NAME = 'hermes.audioVault.v1';
const STORE_NAME = 'clips';
const SONG_INDEX = 'songId';

class IndexedDbClipStore implements ClipStore {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDb(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const s = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            s.createIndex(SONG_INDEX, SONG_INDEX, { unique: false });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return this.dbPromise;
  }

  async put(clip: AudioClip): Promise<void> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(clip);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async get(id: string): Promise<AudioClip | null> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id);
      req.onsuccess = () => resolve((req.result as AudioClip | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  }

  async listBySong(songId: string): Promise<AudioClipMeta[]> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const idx = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).index(SONG_INDEX);
      const req = idx.getAll(songId);
      req.onsuccess = () => resolve((req.result as AudioClip[]).map(stripBlob).sort(byCreatedAt));
      req.onerror = () => reject(req.error);
    });
  }

  async delete(id: string): Promise<void> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

let realStore: IndexedDbClipStore | undefined;
let memoryStore: MemoryClipStore | undefined;
function store(): ClipStore {
  if (typeof indexedDB !== 'undefined') return (realStore ??= new IndexedDbClipStore());
  return (memoryStore ??= new MemoryClipStore());
}

function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'clip_' + Math.random().toString(36).slice(2, 10);
}

// A short voice note or riff, not a multitrack session — caps keep a single song's
// clips from silently eating the browser's whole IndexedDB quota.
const MAX_CLIP_BYTES = 8 * 1024 * 1024;
const MAX_CLIPS_PER_SONG = 6;

export interface SaveClipResult {
  clip: AudioClipMeta | null;
  error?: 'too-large' | 'too-many' | 'storage-failed';
}

export async function saveClip(
  songId: string,
  kind: 'voice' | 'riff',
  label: string,
  blob: Blob,
  durationMs: number,
  opts: { id?: string; now?: number } = {},
): Promise<SaveClipResult> {
  if (blob.size > MAX_CLIP_BYTES) return { clip: null, error: 'too-large' };
  const existing = await listClips(songId);
  if (existing.length >= MAX_CLIPS_PER_SONG) return { clip: null, error: 'too-many' };
  const clip: AudioClip = {
    id: opts.id ?? genId(),
    songId,
    kind,
    label: label.trim().slice(0, 60) || (kind === 'voice' ? 'Voice note' : 'Riff'),
    durationMs,
    createdAt: opts.now ?? Date.now(),
    mimeType: blob.type || 'audio/webm',
    sizeBytes: blob.size,
    blob,
  };
  try {
    await store().put(clip);
    return { clip: stripBlob(clip) };
  } catch {
    return { clip: null, error: 'storage-failed' };
  }
}

export async function listClips(songId: string): Promise<AudioClipMeta[]> {
  try {
    return await store().listBySong(songId);
  } catch {
    return [];
  }
}

export async function loadClipBlob(id: string): Promise<Blob | null> {
  try {
    const c = await store().get(id);
    return c?.blob ?? null;
  } catch {
    return null;
  }
}

export async function deleteClip(id: string): Promise<void> {
  try {
    await store().delete(id);
  } catch {
    /* ignore — a failed delete just leaves an orphaned clip, not a corrupt vault */
  }
}
