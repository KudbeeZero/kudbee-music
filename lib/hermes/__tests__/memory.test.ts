import { describe, it, expect } from 'vitest';
import { allAvoidWords, MEMORY } from '../memory';
import { DEFAULT_BANNED_WORDS } from '../bannedWords';
import { runPipeline } from '../pipeline';
import { checkOriginality } from '../originality';
import type { SongInputs } from '../types';

describe('memory layer', () => {
  it('always applies the remembered exclusions on top of the generic clichés', () => {
    const all = allAvoidWords();
    // remembered personal exclusions
    for (const w of ['concrete', 'sharpen', 'chain', 'chains', 'bedroom', 'bed']) {
      expect(all).toContain(w);
    }
    // generic clichés still present
    expect(all).toContain('pain');
    // de-duplicated
    expect(new Set(all).size).toBe(all.length);
  });

  it('merges per-song words and lowercases', () => {
    const all = allAvoidWords(['MoonLight', 'concrete']);
    expect(all).toContain('moonlight');
    expect(all.filter((w) => w === 'concrete').length).toBe(1); // no dupe
  });

  it('exposes preferences', () => {
    expect(MEMORY.preferences?.moodLean).toBeTruthy();
  });

  it('the pipeline flags a remembered exclusion without it being re-specified', async () => {
    const inputs: SongInputs = {
      title: 'T', theme: 'walking the concrete every night', mood: 'hard', genre: 'trap',
      tempoMin: 130, tempoMax: 150, voice: 'me', audience: 'crew', doNotUse: [], references: '', structure: 'hook-first',
    };
    // a lyric containing an excluded word is flagged using the memory list by default
    const r = checkOriginality('I been walking on the concrete all alone', { bannedWords: allAvoidWords() });
    expect(r.bannedWordsHit).toContain('concrete');
    // pipeline runs clean end-to-end with the memory-merged list
    const { pkg } = await runPipeline(inputs, { id: 'm', now: '2026-01-01T00:00:00Z' });
    expect(pkg.uniqueness).toBeTruthy();
  });
});
