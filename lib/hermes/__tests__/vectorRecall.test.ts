import { describe, it, expect, afterAll } from 'vitest';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rememberSong, recommendSimilar } from '../vectorRecall';
import type { Embedder } from '../vectorMemory';
import type { SongPackage } from '../types';

// Same fake bag-of-words embedder pattern as vectorMemory.test — exercises the full
// learn→store→recall path WITHOUT downloading the real model (CI stays offline + $0).
const VOCAB = ['build', 'climb', 'gold', 'cold', 'street', 'love'];
const fakeEmbed: Embedder = async (text) => {
  const t = text.toLowerCase();
  return VOCAB.map((w) => (t.split(w).length - 1));
};

const FILE = join(tmpdir(), 'hermes-vectorRecall.test.json');
afterAll(() => { try { rmSync(FILE); } catch { /* ignore */ } });

// Minimal SongPackage stub — only the fields rememberSong reads.
const pkg = (id: string, hook: string, lead: string): SongPackage => ({
  id, chosenHook: { text: hook, angle: '', cadence: '', score: 90 },
  sections: [{ label: 'Verse 1', lines: [lead, 'second line here'] }],
  score: { total: 88 },
} as unknown as SongPackage);

// a fuller stub that also carries a theme + mood (for procedural/emotion recall)
const pkgFull = (id: string, hook: string, lead: string, theme: string, mood: string): SongPackage => ({
  id, chosenHook: { text: hook, angle: '', cadence: '', score: 90 },
  sections: [{ label: 'Verse 1', lines: [lead, 'second line here'] }],
  inputs: { theme, mood } as SongPackage['inputs'],
  score: { total: 88 },
} as unknown as SongPackage);

describe('learn→vector recall (the brain as a coach)', () => {
  it('rememberSong stores the winning hook + lead line as semantic memories', async () => {
    const n = await rememberSong(pkg('s1', 'the cold streets made the gold', 'I build and climb every day'), { embed: fakeEmbed, file: FILE });
    expect(n).toBe(2);
  });

  it('recommendSimilar recalls a meaning-close past hook', async () => {
    const rec = await recommendSimilar('turning cold streets into gold', { embed: fakeEmbed, file: FILE, minScore: 0.5 });
    expect(rec).not.toBeNull();
    expect(rec!.kind).toBe('craft');
    expect(rec!.detail).toMatch(/cold streets/);
  });

  it('recommendSimilar returns null when nothing is close enough', async () => {
    const rec = await recommendSimilar('a song about pure love', { embed: fakeEmbed, file: FILE, minScore: 0.99 });
    expect(rec).toBeNull();
  });

  it('is a graceful no-op when the embedding dep is absent (no embed, missing store)', async () => {
    // No injected embedder + a path that forces the real (absent) model → caught, 0 stored.
    const n = await rememberSong(pkg('s2', 'some hook', 'some line'), { file: join(tmpdir(), 'nope.json') });
    expect(n).toBe(0);
  });
});

describe('per-agent semantic recall (vector memory → the brain systems)', () => {
  const FILE2 = join(tmpdir(), 'hermes-vectorRecall-agents.test.json');
  afterAll(() => { try { rmSync(FILE2); } catch { /* ignore */ } });

  it('rememberSong stores a memory per facet: hook, lyric, procedural (theme), emotion (mood)', async () => {
    const n = await rememberSong(
      pkgFull('a1', 'cold streets turned to gold', 'I build and climb every day',
        'building gold out of the cold streets', 'hungry, cold, defiant'),
      { embed: fakeEmbed, file: FILE2 },
    );
    expect(n).toBe(4);
  });

  it('recallSimilarCraft finds a semantically close PAST THEME (procedural memory)', async () => {
    const { recallSimilarCraft } = await import('../vectorRecall');
    const hits = await recallSimilarCraft('turning the cold streets into gold', { embed: fakeEmbed, file: FILE2, topK: 1 });
    expect(hits.length).toBe(1);
    expect(hits[0].source).toBe('a1');
    expect(hits[0].text).toMatch(/cold streets/);
  });

  it('recallSimilarEmotion finds a semantically close PAST MOOD (limbic layer)', async () => {
    const { recallSimilarEmotion } = await import('../vectorRecall');
    const hits = await recallSimilarEmotion('cold and defiant and hungry', { embed: fakeEmbed, file: FILE2, topK: 1 });
    expect(hits.length).toBe(1);
    expect(hits[0].text).toMatch(/defiant/);
  });

  it('recallSimilarHook flags a meaning-close PAST HOOK (Council / self-repetition)', async () => {
    const { recallSimilarHook } = await import('../vectorRecall');
    const hits = await recallSimilarHook('the cold gold of these streets', { embed: fakeEmbed, file: FILE2, topK: 1 });
    expect(hits.length).toBe(1);
    expect(hits[0].text).toMatch(/gold/);
  });

  it('all recalls are graceful no-ops without the embedding dep', async () => {
    const { recallSimilarCraft } = await import('../vectorRecall');
    const hits = await recallSimilarCraft('anything', { file: join(tmpdir(), 'nope2.json') });
    expect(hits).toEqual([]);
  });
});
