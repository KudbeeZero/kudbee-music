import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { addMemory, type Embedder } from '../vectorMemory';
import { semanticOriginality, mergeSemanticFlags } from '../semanticOriginality';
import type { UniquenessReport } from '../types';

// Fake bag-of-words embedder — a paraphrase that shares the vocab reads as close in
// meaning even with different surface words. Offline, no model download.
const VOCAB = ['cold', 'street', 'gold', 'grind', 'build', 'love'];
const fakeEmbed: Embedder = async (text) => {
  const t = text.toLowerCase();
  return VOCAB.map((w) => (t.split(w).length - 1));
};

const FILE = join(tmpdir(), 'hermes-semanticOriginality.test.json');
afterAll(() => { try { rmSync(FILE); } catch { /* ignore */ } });

beforeAll(async () => {
  await addMemory('cold street gold grind', { type: 'lyric' }, { embed: fakeEmbed, file: FILE });
});

describe('semanticOriginality (meaning-level novelty)', () => {
  it('flags a line that means the same as a stored prior line', async () => {
    const flags = await semanticOriginality('grind on the cold street chasing gold', { embed: fakeEmbed, file: FILE, minScore: 0.5 });
    expect(flags.length).toBeGreaterThan(0);
    expect(flags[0].kind).toBe('too-similar');
    expect(flags[0].detail).toMatch(/MEANING/);
  });

  it('does not flag a line about something unrelated', async () => {
    const flags = await semanticOriginality('a tender song about love and rain', { embed: fakeEmbed, file: FILE, minScore: 0.85 });
    expect(flags).toEqual([]);
  });

  it('is a graceful no-op when the embedding dep is absent', async () => {
    // no embed + a missing store path forces the real (absent) model → caught → []
    const flags = await semanticOriginality('cold street gold', { file: join(tmpdir(), 'nope.json') });
    expect(flags).toEqual([]);
  });
});

describe('mergeSemanticFlags (pure re-score)', () => {
  const base: UniquenessReport = { score: 90, flags: [], fingerprints: [], bannedWordsHit: [], rewriteSuggestions: [] };

  it('appends fresh semantic flags and drops the score', () => {
    const merged = mergeSemanticFlags(base, [{ kind: 'too-similar', detail: 'x', line: 'a new line' }]);
    expect(merged.flags).toHaveLength(1);
    expect(merged.score).toBe(76); // 90 - 14
  });

  it('does not double-count a line the base check already flagged', () => {
    const withBase: UniquenessReport = { ...base, flags: [{ kind: 'too-similar', detail: 'base', line: 'Same Line' }] };
    const merged = mergeSemanticFlags(withBase, [{ kind: 'too-similar', detail: 'sem', line: 'same line' }]);
    expect(merged.flags).toHaveLength(1); // unchanged
    expect(merged.score).toBe(90);
  });

  it('returns the same report when there are no semantic flags', () => {
    expect(mergeSemanticFlags(base, [])).toBe(base);
  });
});
