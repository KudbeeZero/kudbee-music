import { describe, it, expect, beforeEach } from 'vitest';
import { saveClip, listClips, loadClipBlob, deleteClip } from '../audioVault';

// vitest's default environment has no `indexedDB` global, so every call here
// exercises audioVault's in-memory fallback store — the same code path a real
// browser without IndexedDB support (or an SSR render) would take.
const blob = (bytes: number, type = 'audio/webm') => new Blob([new Uint8Array(bytes)], { type });

describe('audioVault — voice/riff clip storage', () => {
  it('saves a clip and lists it back for its song', async () => {
    const result = await saveClip('song-1', 'voice', 'My take', blob(100), 2400, { id: 'clip-a', now: 1000 });
    expect(result.error).toBeUndefined();
    expect(result.clip).toMatchObject({ id: 'clip-a', songId: 'song-1', kind: 'voice', label: 'My take', durationMs: 2400 });

    const clips = await listClips('song-1');
    expect(clips).toHaveLength(1);
    expect(clips[0].id).toBe('clip-a');
  });

  it('keeps clips scoped to their own song', async () => {
    await saveClip('song-2', 'voice', 'A', blob(10), 1000, { id: 'a', now: 1 });
    await saveClip('song-3', 'voice', 'B', blob(10), 1000, { id: 'b', now: 1 });
    expect(await listClips('song-2')).toHaveLength(1);
    expect(await listClips('song-3')).toHaveLength(1);
    expect((await listClips('song-2'))[0].id).toBe('a');
  });

  it('lists multiple clips oldest-first', async () => {
    await saveClip('song-4', 'voice', 'first', blob(10), 500, { id: 'c1', now: 100 });
    await saveClip('song-4', 'riff', 'second', blob(10), 500, { id: 'c2', now: 200 });
    const clips = await listClips('song-4');
    expect(clips.map((c) => c.id)).toEqual(['c1', 'c2']);
  });

  it('defaults an empty label to a kind-appropriate name', async () => {
    const voice = await saveClip('song-5', 'voice', '   ', blob(10), 500, { id: 'v', now: 1 });
    const riff = await saveClip('song-5', 'riff', '', blob(10), 500, { id: 'r', now: 1 });
    expect(voice.clip?.label).toBe('Voice note');
    expect(riff.clip?.label).toBe('Riff');
  });

  it('rejects a clip over the size cap without touching storage', async () => {
    const result = await saveClip('song-6', 'voice', 'huge', blob(9 * 1024 * 1024), 1000, { id: 'too-big', now: 1 });
    expect(result.error).toBe('too-large');
    expect(result.clip).toBeNull();
    expect(await listClips('song-6')).toHaveLength(0);
  });

  it('rejects a 7th clip on the same song', async () => {
    for (let i = 0; i < 6; i++) {
      const r = await saveClip('song-7', 'voice', `take ${i}`, blob(10), 500, { id: `s7-${i}`, now: i });
      expect(r.error).toBeUndefined();
    }
    const overflow = await saveClip('song-7', 'voice', 'one too many', blob(10), 500, { id: 's7-6', now: 6 });
    expect(overflow.error).toBe('too-many');
    expect(await listClips('song-7')).toHaveLength(6);
  });

  it('round-trips the actual blob via loadClipBlob', async () => {
    const original = blob(42, 'audio/wav');
    await saveClip('song-8', 'voice', 'take', original, 500, { id: 'blob-1', now: 1 });
    const loaded = await loadClipBlob('blob-1');
    expect(loaded).not.toBeNull();
    expect(loaded!.size).toBe(42);
    expect(loaded!.type).toBe('audio/wav');
  });

  it('returns null for a clip that was never saved', async () => {
    expect(await loadClipBlob('nope')).toBeNull();
  });

  it('deletes a clip so it no longer lists or loads', async () => {
    await saveClip('song-9', 'voice', 'take', blob(10), 500, { id: 'del-me', now: 1 });
    expect(await listClips('song-9')).toHaveLength(1);
    await deleteClip('del-me');
    expect(await listClips('song-9')).toHaveLength(0);
    expect(await loadClipBlob('del-me')).toBeNull();
  });

  it('deleting a clip that never existed is a silent no-op', async () => {
    await expect(deleteClip('never-existed')).resolves.toBeUndefined();
  });
});
