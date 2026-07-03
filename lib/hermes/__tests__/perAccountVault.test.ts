import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveSong, listSongs, __clearVault, recordTaste, loadTaste,
  toggleFavorite, loadFavorites, saveBannedWords, loadBannedWords,
  __setActiveProfileForTest,
} from '../storage';
import { demoSong } from '../exampleSong';

// Per-account memory layer (goal part C, local path): each profile gets its own saved
// vault + soft memory. The critical safety property is that the FIRST/only profile is
// completely unaffected (no namespacing, no migration) — proven by every OTHER storage
// test still passing unchanged; here we prove the isolation + the untouched-primary path.
describe('per-account memory namespacing', () => {
  beforeEach(() => { __clearVault(); __setActiveProfileForTest(null); });

  it('the primary (first/only) profile uses the legacy keys unchanged — no scoping', () => {
    const song = demoSong();
    saveSong(song); // no profile set → guest is claimed as primary → unscoped
    expect(listSongs().some((s) => s.id === song.id)).toBe(true);
  });

  it('a different profile gets its own isolated vault (cannot see the primary\'s songs)', () => {
    const a = demoSong();
    saveSong(a); // saved as the primary profile
    expect(listSongs().length).toBe(1);

    __setActiveProfileForTest('acct-2'); // a genuinely different account on this browser
    expect(listSongs().length).toBe(0); // its own empty memory — isolation holds

    const b = { ...demoSong(), id: 'song-b', title: 'Second Account Song' };
    saveSong(b);
    expect(listSongs().map((s) => s.id)).toEqual(['song-b']);
  });

  it('switching back to the primary restores its catalog intact (data never crossed over)', () => {
    const a = demoSong();
    saveSong(a);
    __setActiveProfileForTest('acct-2');
    saveSong({ ...demoSong(), id: 'song-b' });

    __setActiveProfileForTest(null); // back to the primary
    const ids = listSongs().map((s) => s.id);
    expect(ids).toContain(a.id);
    expect(ids).not.toContain('song-b'); // the other account's song never leaked in
  });

  it('isolates the soft memory layers too (taste, favorites, banned words)', () => {
    recordTaste(['gold'], []);
    toggleFavorite('fav-1');
    saveBannedWords(['corny']);

    __setActiveProfileForTest('acct-2');
    expect(loadTaste().liked.gold ?? 0).toBe(0);      // fresh taste for the new account
    expect([...loadFavorites()]).not.toContain('fav-1');
    expect(loadBannedWords([])).not.toContain('corny');

    recordTaste(['smooth'], []);
    expect(loadTaste().liked.smooth).toBe(1);

    __setActiveProfileForTest(null); // primary is untouched by the other account's edits
    expect(loadTaste().liked.gold).toBe(1);
    expect(loadTaste().liked.smooth ?? 0).toBe(0);
    expect([...loadFavorites()]).toContain('fav-1');
    expect(loadBannedWords([])).toContain('corny');
  });
});
