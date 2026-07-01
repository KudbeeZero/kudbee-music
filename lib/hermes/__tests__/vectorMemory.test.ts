import { describe, it, expect, afterAll } from 'vitest';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  cosineSimilarity, rankBySimilarity, addMemory, semanticSearch, quantize,
  type VectorEntry, type Embedder,
} from '../vectorMemory';

// A deterministic fake embedder (bag-of-words over a tiny vocab) — lets us exercise the
// full add/search flow WITHOUT downloading the real model, so CI stays fast + offline.
const VOCAB = ['build', 'climb', 'fall', 'gold', 'cold', 'love'];
const fakeEmbed: Embedder = async (text) => {
  const t = text.toLowerCase();
  return VOCAB.map((w) => (t.split(w).length - 1));
};

const FILE = join(tmpdir(), 'hermes-vectorMemory.test.json');
afterAll(() => { try { rmSync(FILE); } catch { /* ignore */ } });

const entry = (id: string, text: string, embedding: number[], type: VectorEntry['metadata']['type'] = 'hook'): VectorEntry =>
  ({ id, text, embedding, metadata: { type, timestamp: '2026-01-01T00:00:00Z' } });

describe('vector memory — pure search core', () => {
  it('cosineSimilarity: 1 for identical, 0 for orthogonal, 0 for degenerate', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 5);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0); // length mismatch
  });

  it('rankBySimilarity ranks, caps at topK, filters by minScore and type', () => {
    const entries = [
      entry('a', 'A', [1, 0, 0]),
      entry('b', 'B', [0.9, 0.1, 0]),
      entry('c', 'C', [0, 1, 0]),
      entry('d', 'D', [1, 0, 0], 'lyric'),
    ];
    const ranked = rankBySimilarity([1, 0, 0], entries, { topK: 2 });
    expect(ranked.map((r) => r.entry.id)).toEqual(['a', 'd']); // a and d are perfect matches
    expect(rankBySimilarity([1, 0, 0], entries, { type: 'lyric' }).map((r) => r.entry.id)).toEqual(['d']);
    expect(rankBySimilarity([0, 1, 0], entries, { minScore: 0.99 }).map((r) => r.entry.id)).toEqual(['c']);
  });
});

describe('vector memory — deterministic ranking (reproducibility)', () => {
  it('quantize() collapses sub-1e-8 differences to the same rank key', () => {
    expect(quantize(0.123456781)).toBe(quantize(0.1234567811)); // differ below 1e-8 → same key
    expect(quantize(0.99999999)).not.toBe(quantize(0.99999998)); // above 1e-8 → distinct
  });

  it('produces identical ordering on repeated runs', () => {
    const entries = [
      entry('c', 'C', [0.8, 0.2, 0]),
      entry('a', 'A', [1, 0, 0]),
      entry('b', 'B', [0.6, 0.4, 0]),
    ];
    const once = rankBySimilarity([1, 0, 0], entries).map((r) => r.entry.id);
    const twice = rankBySimilarity([1, 0, 0], entries).map((r) => r.entry.id);
    expect(once).toEqual(twice);
  });

  it('breaks exact ties deterministically by id (then text), not by input order', () => {
    // three identical vectors → identical similarity → tie-break must be id-ascending
    const shuffled = [entry('z', 'Z', [1, 1]), entry('a', 'A', [1, 1]), entry('m', 'M', [1, 1])];
    expect(rankBySimilarity([1, 1], shuffled).map((r) => r.entry.id)).toEqual(['a', 'm', 'z']);
  });

  it('keeps the RAW similarity in results (only the sort key is quantized)', () => {
    const r = rankBySimilarity([1, 0], [entry('a', 'A', [1, 0])]);
    expect(r[0].similarity).toBeCloseTo(1, 10);
  });
});

describe('vector memory — add + semantic search (fake embedder)', () => {
  it('stores memories and retrieves the semantically closest', async () => {
    await addMemory('every step a promise that I build and climb', { type: 'hook' }, { embed: fakeEmbed, file: FILE });
    await addMemory('the cold nights turned into gold', { type: 'hook' }, { embed: fakeEmbed, file: FILE });
    await addMemory('a love that never fell', { type: 'hook' }, { embed: fakeEmbed, file: FILE });

    const hits = await semanticSearch('keep building and climbing', { embed: fakeEmbed, topK: 1, file: FILE });
    expect(hits).toHaveLength(1);
    expect(hits[0].entry.text).toMatch(/build and climb/);
    expect(hits[0].similarity).toBeGreaterThan(0.5);
  });

  it('upserts by id (same text does not duplicate)', async () => {
    await addMemory('same hook text here', { type: 'hook' }, { embed: fakeEmbed, file: FILE });
    await addMemory('same hook text here', { type: 'hook' }, { embed: fakeEmbed, file: FILE });
    const all = await semanticSearch('same hook text here', { embed: fakeEmbed, topK: 10, file: FILE });
    expect(all.filter((r) => r.entry.text === 'same hook text here')).toHaveLength(1);
  });
});
