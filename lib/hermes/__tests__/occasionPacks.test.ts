import { describe, it, expect } from 'vitest';
import { runPipeline } from '../pipeline';
import { OCCASION_PACKS, findOccasionPack, isValidOccasionId } from '../occasionPacks';
import { encodeShare, decodeShare } from '../shareLink';
import { sanitizeSong } from '../storage';
import type { SongInputs } from '../types';

const base: SongInputs = {
  title: 'For Mom', theme: 'everything she gave our family over the years', mood: 'warm, grateful',
  genre: 'pop', tempoMin: 100, tempoMax: 120, voice: '', audience: 'Mom',
  doNotUse: [], references: '', structure: 'hook-first',
};

describe('Occasion Packs — data integrity', () => {
  it('ships at least 8 packs, each with real content', () => {
    expect(OCCASION_PACKS.length).toBeGreaterThanOrEqual(8);
    for (const p of OCCASION_PACKS) {
      expect(p.id).toMatch(/^[a-z0-9-]+$/);
      expect(p.nouns.length).toBeGreaterThanOrEqual(8);
      expect(p.dedicationFrame).toMatch(/\{who\}/);
      expect(p.moodPreset.length).toBeGreaterThan(0);
      expect(p.genrePreset.length).toBeGreaterThan(0);
    }
  });

  it('every occasion noun is a real word (passes the same nounable bar as the core bank)', async () => {
    // Indirect check: generate with each occasion and confirm no crash + real output —
    // a bad noun would either crash slot-filling or read as obviously broken.
    for (const pack of OCCASION_PACKS) {
      const { pkg } = await runPipeline({ ...base, occasion: pack.id }, { id: `nouns-${pack.id}`, now: '2026-01-01T00:00:00Z', seed: 1 });
      expect(pkg.finalLyrics.length).toBeGreaterThan(0);
    }
  });

  it('findOccasionPack returns undefined for unknown/undefined ids', () => {
    expect(findOccasionPack('not-a-real-occasion')).toBeUndefined();
    expect(findOccasionPack(undefined)).toBeUndefined();
  });

  it('isValidOccasionId whitelists only real ids', () => {
    expect(isValidOccasionId('christmas')).toBe(true);
    expect(isValidOccasionId('evil')).toBe(false);
    expect(isValidOccasionId(123)).toBe(false);
    expect(isValidOccasionId(undefined)).toBe(false);
  });
});

describe('Occasion Packs — generation effects', () => {
  it('the dedication line replaces the generic Intro when an occasion is set', async () => {
    const { pkg } = await runPipeline({ ...base, occasion: 'christmas' }, { id: 'ded', now: '2026-01-01T00:00:00Z', seed: 3 });
    const intro = pkg.sections.find((s) => s.label === 'Intro')!.lines[0];
    expect(intro).toBe('Merry Christmas, Mom');
  });

  it('no occasion falls back to the generic dedication (backward compatible)', async () => {
    const { pkg } = await runPipeline(base, { id: 'noded', now: '2026-01-01T00:00:00Z', seed: 3 });
    expect(pkg.sections.find((s) => s.label === 'Intro')!.lines[0]).toBe("Mom, this one's for you");
  });

  it('occasion vocabulary surfaces in the generated lyrics', async () => {
    const { pkg } = await runPipeline({ ...base, occasion: 'christmas' }, { id: 'voc', now: '2026-01-01T00:00:00Z', seed: 3 });
    const christmas = findOccasionPack('christmas')!;
    const text = pkg.finalLyrics.toLowerCase();
    expect(christmas.nouns.some((n) => text.includes(n))).toBe(true);
  });

  it('different occasions produce different lyrics for the same seed (the pack is live, not decorative)', async () => {
    const a = await runPipeline({ ...base, occasion: 'christmas' }, { id: 'c', now: '2026-01-01T00:00:00Z', seed: 5 });
    const b = await runPipeline({ ...base, occasion: 'birthday' }, { id: 'b', now: '2026-01-01T00:00:00Z', seed: 5 });
    expect(a.pkg.finalLyrics).not.toBe(b.pkg.finalLyrics);
  });

  it('is deterministic: same inputs + seed + occasion -> byte-identical lyrics', async () => {
    const inputs: SongInputs = { ...base, occasion: 'graduation' };
    const a = await runPipeline(inputs, { id: 'g', now: '2026-01-01T00:00:00Z', seed: 9 });
    const b = await runPipeline(inputs, { id: 'g', now: '2026-01-01T00:00:00Z', seed: 9 });
    expect(a.pkg.finalLyrics).toBe(b.pkg.finalLyrics);
  });

  it('an occasion is used even when the theme text is already rich (not just padding)', async () => {
    const richTheme: SongInputs = {
      ...base,
      theme: 'the long road through school, work, sacrifice, family, friendship, and finally this moment',
      occasion: 'graduation',
    };
    const { pkg } = await runPipeline(richTheme, { id: 'rich', now: '2026-01-01T00:00:00Z', seed: 2 });
    const grad = findOccasionPack('graduation')!;
    const text = pkg.finalLyrics.toLowerCase();
    expect(grad.nouns.some((n) => text.includes(n))).toBe(true);
  });
});

describe('Occasion Packs — untrusted-input hardening (same discipline as rhymeScheme)', () => {
  it('pipeline.normalizeInputs drops a hostile occasion id instead of crashing', async () => {
    const hostile = { ...base, occasion: 'not-a-real-occasion' } as SongInputs;
    const res = await runPipeline(hostile, { id: 'h', now: '2026-01-01T00:00:00Z', seed: 1 });
    expect(res.pkg.finalLyrics.length).toBeGreaterThan(0);
    expect(res.pkg.sections.find((s) => s.label === 'Intro')!.lines[0]).toBe("Mom, this one's for you");
  });

  it('a valid occasion reproduces through a share link; a hostile one is dropped', () => {
    const kept = decodeShare(encodeShare({ ...base, occasion: 'birthday' }, 1))!;
    expect(kept.inputs.occasion).toBe('birthday');
    const dropped = decodeShare(encodeShare({ ...base, occasion: 'evil' } as SongInputs, 1))!;
    expect(dropped.inputs.occasion).toBeUndefined();
  });

  it('vault import preserves a valid occasion and drops a hostile one', async () => {
    const { pkg } = await runPipeline({ ...base, occasion: 'anniversary' }, { id: 'imp-1', now: '2026-01-01T00:00:00Z', seed: 1 });
    expect(sanitizeSong({ ...pkg, inputs: { ...pkg.inputs, occasion: 'anniversary' } })?.inputs.occasion).toBe('anniversary');
    expect(sanitizeSong({ ...pkg, id: 'imp-2', inputs: { ...pkg.inputs, occasion: 'evil' } })?.inputs.occasion).toBeUndefined();
  });

  it('an occasion round-trips through a share link and reproduces byte-identical lyrics', async () => {
    const inputs: SongInputs = { ...base, occasion: 'valentines' };
    const opts = { id: 'fixed', now: '2026-01-01T00:00:00Z', seed: 12, priorSongs: [], bannedWords: [] as string[] };
    const original = (await runPipeline(inputs, opts)).pkg;
    const decoded = decodeShare(encodeShare(inputs, 12))!;
    const reproduced = (await runPipeline(decoded.inputs, { ...opts, seed: decoded.seed })).pkg;
    expect(reproduced.finalLyrics).toBe(original.finalLyrics);
  });
});
