import { describe, it, expect, beforeEach } from 'vitest';
import {
  exportBrain, importBrain, __clearVault, saveSong,
  recordTaste, saveBannedWords, saveArtistAlias, toggleFavorite, setSongNote,
  loadTaste, loadBannedWords, loadArtistAlias, loadFavorites, loadSongNotes, listSongs,
} from '../storage';
import { demoSong } from '../exampleSong';

// Populate every portable layer so a round-trip can prove nothing is dropped.
function seed() {
  const song = demoSong();
  saveSong(song);
  recordTaste(['gold', 'cold'], ['corny']);
  saveBannedWords(['generic', 'basic']);
  saveArtistAlias('Dom Shady');
  toggleFavorite(song.id);
  setSongNote(song.id, 'needs a bridge rewrite');
  return song;
}

describe('exportBrain / importBrain', () => {
  beforeEach(() => __clearVault());

  it('round-trips the whole brain onto a wiped browser (replace)', () => {
    const song = seed();
    const pack = exportBrain({ id: 'p1', name: 'Dom', kind: 'guest', createdAt: '2026-01-01T00:00:00Z' }, '2026-07-03T00:00:00Z');
    __clearVault(); // simulate a fresh device / reinstall

    const res = importBrain(pack, 'replace');
    expect(res.ok).toBe(true);
    expect(res.songs).toBe(1);
    expect(listSongs().find((s) => s.id === song.id)).toBeDefined();
    expect(loadTaste().liked.gold).toBe(1);
    expect(loadBannedWords([])).toEqual(expect.arrayContaining(['generic', 'basic']));
    expect(loadArtistAlias()).toBe('Dom Shady');
    expect([...loadFavorites()]).toContain(song.id);
    expect(loadSongNotes()[song.id]).toBe('needs a bridge rewrite');
    // the profile is handed back for identity.ts to restore, not persisted by storage
    expect((res.profile as { name?: string })?.name).toBe('Dom');
  });

  it('is a valid, self-describing document', () => {
    seed();
    const parsed = JSON.parse(exportBrain(null, '2026-07-03T00:00:00Z'));
    expect(parsed.kind).toBe('hermes-brain');
    expect(parsed.version).toBe(1);
    expect(parsed.exportedAt).toBe('2026-07-03T00:00:00Z');
    expect(parsed.vault.songs.length).toBe(1);
  });

  it('never writes the Claude API key into the document', () => {
    seed();
    const raw = exportBrain(null);
    expect(raw).not.toMatch(/sk-ant-/);
    expect(JSON.parse(raw)).not.toHaveProperty('claudeKey');
  });

  it('merge sums taste and unions banned/favorites instead of clobbering', () => {
    const song = seed();
    const pack = exportBrain(null);
    // second brain on the same browser with overlapping + new signal
    recordTaste(['gold'], []); // gold now liked twice locally
    saveBannedWords(['generic', 'fresh']);

    const res = importBrain(pack, 'merge');
    expect(res.ok).toBe(true);
    // gold: 1 (local, after re-record) + 1 (imported) summed
    expect(loadTaste().liked.gold).toBeGreaterThanOrEqual(2);
    // union keeps the local-only 'fresh' AND the imported 'basic'
    expect(loadBannedWords([])).toEqual(expect.arrayContaining(['fresh', 'basic']));
    expect([...loadFavorites()]).toContain(song.id);
  });

  it('rejects a non-brain document without throwing', () => {
    expect(importBrain('not json').ok).toBe(false);
    expect(importBrain(JSON.stringify({ kind: 'hermes-vault', songs: [] })).ok).toBe(false);
    expect(importBrain(JSON.stringify({ kind: 'hermes-brain', version: 1 })).ok).toBe(true); // empty but valid
  });

  it('sanitizes hostile layers — a bad taste block never blocks the songs', () => {
    const song = demoSong();
    const pack = JSON.stringify({
      kind: 'hermes-brain', version: 1,
      vault: { songs: [song], albums: [] },
      taste: 'not an object',
      bannedWords: [1, 'ok', null],
      favorites: ['a', 2, 'b'],
      songNotes: { [song.id]: 'fine', bad: 42 },
    });
    const res = importBrain(pack, 'replace');
    expect(res.songs).toBe(1);
    expect(loadBannedWords([])).toEqual(['ok']);
    expect([...loadFavorites()].sort()).toEqual(['a', 'b']);
    expect(loadSongNotes()).toEqual({ [song.id]: 'fine' });
  });

  it('is deterministic given an injected timestamp', () => {
    seed();
    expect(exportBrain(null, '2026-07-03T00:00:00Z')).toBe(exportBrain(null, '2026-07-03T00:00:00Z'));
  });
});
