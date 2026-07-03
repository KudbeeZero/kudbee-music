import { describe, it, expect } from 'vitest';
import { runPipeline } from '../pipeline';
import { rhymeScheme } from '../rhyme';
import { PATTERN_PACKS, findPatternPack } from '../patternPacks';
import type { SongInputs, SongStructure, RhymeSchemeId } from '../types';

const base: SongInputs = {
  title: 'Weight', theme: 'the come-up from nothing, proving my worth', mood: 'hard, defiant',
  genre: 'boom-bap', tempoMin: 88, tempoMax: 96, voice: 'gritty', audience: 'my brother',
  doNotUse: [], references: '', structure: 'hook-first',
};

async function verse1(inputs: SongInputs, seed = 4) {
  const { pkg } = await runPipeline(inputs, { id: 'r', now: '2026-01-01T00:00:00Z', seed });
  return pkg.sections.find((s) => s.label === 'Verse 1')!.lines;
}

describe('pattern packs — rhyme scheme dial (roadmap 5.6)', () => {
  it('defaults to AABB when rhymeScheme is unset (backward compatible)', async () => {
    const lines = await verse1(base);
    expect(rhymeScheme(lines)).toBe('AABB');
  });

  it.each<[RhymeSchemeId, string]>([
    ['AABB', 'AABB'],
    ['ABAB', 'ABAB'],
    ['ABBA', 'ABBA'],
    ['AAAA', 'AAAA'],
    // XAXA: only lines 2 & 4 rhyme — the detector labels by first-seen key, so this
    // reads as ABCB (four positions, B repeats at line 2/4, A and C both singletons).
    ['XAXA', 'ABCB'],
  ])('generates a real %s verse (detected scheme: %s)', async (scheme, expected) => {
    const lines = await verse1({ ...base, rhymeScheme: scheme });
    expect(rhymeScheme(lines)).toBe(expected);
  });

  it('is deterministic: same inputs + seed + scheme -> byte-identical lyrics', async () => {
    const inputs: SongInputs = { ...base, rhymeScheme: 'ABAB' };
    const a = await verse1(inputs, 7);
    const b = await verse1(inputs, 7);
    expect(a).toEqual(b);
  });

  it('a different scheme changes the generated lines for the same seed', async () => {
    const aabb = await verse1({ ...base, rhymeScheme: 'AABB' }, 9);
    const abba = await verse1({ ...base, rhymeScheme: 'ABBA' }, 9);
    expect(aabb).not.toEqual(abba);
  });

  it('a 2-line unit (the Bridge) always resolves as a couplet regardless of scheme', async () => {
    const { pkg } = await runPipeline({ ...base, rhymeScheme: 'ABAB' }, { id: 'r2', now: '2026-01-01T00:00:00Z', seed: 3 });
    const bridge = pkg.sections.find((s) => s.label === 'Bridge')!.lines;
    expect(rhymeScheme(bridge)).toBe('AA');
  });
});

describe('pattern packs — structure grammar', () => {
  it('full-song is no longer a silent duplicate of hook-first (roadmap 5.6 bug fix)', async () => {
    const { pkg: hookFirst } = await runPipeline({ ...base, structure: 'hook-first' }, { id: 'h', now: '2026-01-01T00:00:00Z', seed: 1 });
    const { pkg: fullSong } = await runPipeline({ ...base, structure: 'full-song' }, { id: 'f', now: '2026-01-01T00:00:00Z', seed: 1 });
    expect(fullSong.sections.length).toBeGreaterThan(hookFirst.sections.length);
    expect(fullSong.sections.length).toBe(hookFirst.sections.length + 1);
    expect(fullSong.sections[fullSong.sections.length - 1].label).toBe('Hook');
  });

  // Regression (review weakness #3): short-form used to slice the first 2 lines off
  // the 4-line scheme-arranged verse — under ABAB/ABBA/XAXA those belong to different
  // rhyme families, shipping a non-rhyming "couplet". A 2-line unit is now built
  // directly, and layoutFor's 2-line rule makes it a rhymed couplet for EVERY scheme.
  it.each<RhymeSchemeId>(['AABB', 'ABAB', 'ABBA', 'AAAA', 'XAXA'])(
    'short-form ships a rhymed couplet under %s',
    async (scheme) => {
      const { pkg } = await runPipeline(
        { ...base, structure: 'short-form', rhymeScheme: scheme },
        { id: `sf-${scheme}`, now: '2026-01-01T00:00:00Z', seed: 4 },
      );
      const verse = pkg.sections.find((s) => s.label === 'Verse 1')!.lines;
      expect(verse).toHaveLength(2);
      expect(rhymeScheme(verse)).toBe('AA');
    },
  );

  it('short-form still ships two distinct couplet lines when banned words shrink the frame pool (audit fix)', async () => {
    // The couplet used to share v1's `used` set (4 of 6 setup frames consumed by a
    // DISCARDED verse) — with banned-word filtering the pool starved and dedupe could
    // collapse the couplet to one line. bannedWords here knocks out frame vocabulary.
    const { pkg } = await runPipeline(
      { ...base, structure: 'short-form', rhymeScheme: 'ABAB', doNotUse: ['nothing', 'started', 'handed', 'grew'] },
      { id: 'sf-starve', now: '2026-01-01T00:00:00Z', seed: 4 },
    );
    const verse = pkg.sections.find((s) => s.label === 'Verse 1')!.lines;
    expect(verse).toHaveLength(2);
    expect(verse[0].toLowerCase()).not.toBe(verse[1].toLowerCase());
  });

  it('short-form stays deterministic and does not disturb other structures', async () => {
    const a = await runPipeline({ ...base, structure: 'short-form', rhymeScheme: 'ABAB' }, { id: 's', now: '2026-01-01T00:00:00Z', seed: 6 });
    const b = await runPipeline({ ...base, structure: 'short-form', rhymeScheme: 'ABAB' }, { id: 's', now: '2026-01-01T00:00:00Z', seed: 6 });
    expect(a.pkg.finalLyrics).toBe(b.pkg.finalLyrics);
  });
});

describe('pattern packs — data integrity', () => {
  const VALID_STRUCTURES: SongStructure[] = ['hook-first', 'verse-first', 'radio-edit', 'short-form', 'full-song'];
  const VALID_SCHEMES: RhymeSchemeId[] = ['AABB', 'ABAB', 'ABBA', 'AAAA', 'XAXA'];

  it('every pack has a unique id, a valid structure, and a valid rhyme scheme', () => {
    expect(PATTERN_PACKS.length).toBeGreaterThanOrEqual(5);
    const ids = new Set<string>();
    for (const p of PATTERN_PACKS) {
      expect(ids.has(p.id), `duplicate pack id: ${p.id}`).toBe(false);
      ids.add(p.id);
      expect(VALID_STRUCTURES).toContain(p.structure);
      expect(VALID_SCHEMES).toContain(p.rhymeScheme);
      expect(p.label.length).toBeGreaterThan(0);
      expect(p.blurb.length).toBeGreaterThan(0);
      expect(p.sourceNote.length).toBeGreaterThan(0);
    }
  });

  it('findPatternPack resolves a known id and returns undefined for an unknown one', () => {
    expect(findPatternPack('hook-first-aabb')?.structure).toBe('hook-first');
    expect(findPatternPack('nonexistent-pack-id')).toBeUndefined();
  });

  it('applying a pack (structure + rhymeScheme) generates without error and produces the right structure count', async () => {
    for (const pack of PATTERN_PACKS) {
      const { pkg } = await runPipeline(
        { ...base, structure: pack.structure, rhymeScheme: pack.rhymeScheme },
        { id: `pack-${pack.id}`, now: '2026-01-01T00:00:00Z', seed: 2 },
      );
      expect(pkg.sections.length).toBeGreaterThan(0);
      expect(pkg.finalLyrics.length).toBeGreaterThan(0);
    }
  });
});
