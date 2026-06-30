import { describe, it, expect, beforeAll } from 'vitest';
import { runPipeline } from '../pipeline';
import { learnProfile } from '../learn';
import { recommend } from '../recommend';
import { buildAlbum, albumGaps, suggestSequence } from '../album';
import { EXPANSION_PACKS, getExpansionPack } from '../expansionPacks';
import type { SongPackage, SongInputs } from '../types';

function idea(over: Partial<SongInputs>): SongInputs {
  return {
    title: 'T', theme: 'the cold lonely grind in a hard city', mood: 'dark, aggressive, cold',
    genre: 'aggressive boom-bap hip-hop', tempoMin: 86, tempoMax: 92, voice: 'hard',
    audience: 'the lonely', doNotUse: [], references: '', structure: 'hook-first', ...over,
  };
}

let songs: SongPackage[];
beforeAll(async () => {
  songs = [];
  for (let i = 0; i < 4; i++) {
    const { pkg } = await runPipeline(idea({ title: 'Song ' + i, tempoMin: 86, tempoMax: 92 }),
      { id: 's' + i, now: '2026-01-0' + (i + 1) + 'T00:00:00Z', seed: i + 1 });
    songs.push(pkg);
  }
});

describe('learning layer', () => {
  it('derives an artist profile from the vault', () => {
    const p = learnProfile(songs);
    expect(p.songCount).toBe(4);
    expect(p.topGenres[0]).toMatch(/hip-hop/);
    expect(p.leansDark).toBe(true);
    expect(p.avgBanger).toBeGreaterThan(0);
    expect(Array.isArray(p.overusedWords)).toBe(true);
  });

  it('returns the empty profile for no songs', () => {
    expect(learnProfile([]).songCount).toBe(0);
  });
});

describe('recommendation engine', () => {
  it('recommends an album when 3–7 tracks exist', () => {
    const recs = recommend(learnProfile(songs), songs);
    expect(recs.some((r) => r.kind === 'album')).toBe(true);
  });
  it('recommends a fitting expansion pack for a dark hip-hop profile', () => {
    const recs = recommend(learnProfile(songs), songs);
    const exp = recs.find((r) => r.kind === 'expansion');
    expect(exp).toBeTruthy();
    expect(exp?.action?.type).toBe('apply-pack');
  });
  it('greets a brand-new user', () => {
    const recs = recommend(learnProfile([]), []);
    expect(recs.length).toBeGreaterThan(0);
  });
});

describe('album builder', () => {
  it('builds an album and flags gaps', () => {
    const album = buildAlbum('Cold World', songs, { id: 'a1', now: '2026-02-01T00:00:00Z' });
    expect(album.trackIds.length).toBe(4);
    expect(album.concept).toBeTruthy();
    const gaps = albumGaps(songs);
    expect(gaps.length).toBeGreaterThan(0); // all same mood/tempo -> should surface arc/length gaps
    expect(gaps.some((g) => /mood|tempo|track/i.test(g))).toBe(true);
  });
  it('sequences open-mid / peak / soft-close', () => {
    const seq = suggestSequence(songs);
    expect(seq.length).toBe(songs.length);
  });
});

describe('expansion packs', () => {
  it('loads packs with a Suno style string + production', () => {
    expect(EXPANSION_PACKS.length).toBeGreaterThanOrEqual(3);
    for (const p of EXPANSION_PACKS) {
      expect(p.style).toBeTruthy();
      expect(p.production.tempoBpm).toBeGreaterThan(0);
    }
    expect(getExpansionPack('drill-dark')?.title).toBe('Dark Drill');
  });
});
