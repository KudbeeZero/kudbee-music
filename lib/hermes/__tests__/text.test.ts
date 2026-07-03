import { describe, it, expect } from 'vitest';
import { shuffle, makeRng, singularizeIfPlural, determinerAgreementViolations, keywords } from '../text';
import { runPipeline } from '../pipeline';
import type { SongInputs } from '../types';

describe('keywords() drops third-person pronouns (Occasion Packs regression)', () => {
  it('never surfaces she/he/they/our/etc. as a keyword', () => {
    const kw = keywords('everything she gave our family, he never said much but his hands did');
    for (const pronoun of ['she', 'her', 'he', 'him', 'his', 'they', 'them', 'our', 'us']) {
      expect(kw).not.toContain(pronoun);
    }
    expect(kw).toEqual(expect.arrayContaining(['gave', 'family', 'never', 'said', 'hands']));
  });

  it('end-to-end: a pronoun-heavy dedication theme never leaks a pronoun into a noun slot', async () => {
    const inputs: SongInputs = {
      title: 'For Mom', theme: 'everything she gave our family over the years', mood: 'warm',
      genre: 'pop', tempoMin: 100, tempoMax: 120, voice: '', audience: 'Mom',
      doNotUse: [], references: '', structure: 'full-song',
    };
    const { pkg } = await runPipeline(inputs, { id: 'pronoun', now: '2026-01-01T00:00:00Z', seed: 3 });
    const text = pkg.finalLyrics.toLowerCase();
    for (const pronoun of ['she', 'her', 'he', 'him', 'his', 'they', 'them', 'our', 'us']) {
      expect(text).not.toMatch(new RegExp(`\\b(the|a|an|this|that)\\s+${pronoun}\\b`));
    }
  });
});

describe('shuffle (seeded Fisher–Yates)', () => {
  it('is a permutation, deterministic per rng, and non-mutating', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    const s1 = shuffle(arr, makeRng(42));
    const s2 = shuffle(arr, makeRng(42));
    expect(s1).toEqual(s2);                                    // deterministic for same seed
    expect([...s1].sort((a, b) => a - b)).toEqual(arr);        // same elements (permutation)
    expect(arr).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);            // original untouched
  });

  it('produces different orders for different seeds', () => {
    const arr = Array.from({ length: 12 }, (_, i) => i);
    const a = shuffle(arr, makeRng(1));
    const b = shuffle(arr, makeRng(2));
    expect(a).not.toEqual(b);
  });
});

describe('determiner–noun number agreement (review improvement #1)', () => {
  it('singularizes conservative plurals, leaves everything else alone', () => {
    expect(singularizeIfPlural('winters')).toBe('winter');
    expect(singularizeIfPlural('records')).toBe('record');
    expect(singularizeIfPlural('pockets')).toBe('pocket');
    expect(singularizeIfPlural('stories')).toBe('story');
    expect(singularizeIfPlural('ashes')).toBe('ash');
    expect(singularizeIfPlural('losses')).toBe('loss');
    // not plurals — untouched
    for (const w of ['gold', 'chaos', 'glass', 'canvas', 'chorus', 'basis', 'blues', 'is']) {
      expect(singularizeIfPlural(w)).toBe(w);
    }
  });

  it('the eval violation counter only trusts unambiguous determiners (a/an/every)', () => {
    const v = determinerAgreementViolations('a winters tale\nevery records spins\nan apples');
    expect(v).toEqual(['a winters', 'every records', 'an apples']);
    // "this/that" are ambiguous in free text — relative clauses and complementizers
    // are grammatical ("proof that pockets turn to gold") — so the metric skips them;
    // the generation-side slot fix covers them with template context instead.
    expect(determinerAgreementViolations('proof that pockets turn to gold')).toEqual([]);
    expect(determinerAgreementViolations('the hook that lifts the room')).toEqual([]);
    expect(determinerAgreementViolations('these winters made me')).toEqual([]);
  });

  it('the flagship brief no longer generates "All this winters" (end-to-end)', async () => {
    // The exact brief + seed the one-command demo ships — this used to emit
    // "All this winters, I earned it slow" and "Took that records and turned it".
    const inputs: SongInputs = {
      title: 'Long Way Up', theme: 'turning cold winters and empty pockets into gold records for my family',
      mood: 'hungry, warm, defiant', genre: 'soulful boom-bap hip-hop', tempoMin: 86, tempoMax: 94,
      voice: 'grounded, real', audience: 'family', doNotUse: [], references: '', structure: 'full-song',
    };
    const { pkg } = await runPipeline(inputs, { id: 'agree', now: '2026-01-01T00:00:00Z', seed: 8 });
    expect(pkg.finalLyrics).not.toMatch(/\b(a|an|this|that|every) (winters|pockets|records)\b/i);
    expect(determinerAgreementViolations(pkg.finalLyrics)).toEqual([]);
  });
});
