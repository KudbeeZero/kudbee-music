import { describe, it, expect } from 'vitest';
import { encodeShare, decodeShare, shareUrl, giftMessage } from '../shareLink';
import { runPipeline } from '../pipeline';
import type { SongInputs } from '../types';

const INPUTS: SongInputs = {
  title: 'Out the Mud', theme: 'made it out the struggle, still carry the block',
  mood: 'street but emotional', genre: '808 trap', tempoMin: 130, tempoMax: 145,
  voice: 'grounded', audience: 'my daughter', doNotUse: ['corny'],
  references: 'melodic hook energy', structure: 'hook-first', rhymeTemp: 'balanced',
};

describe('shareLink — round-trip', () => {
  it('encode → decode returns the same inputs + seed', () => {
    const token = encodeShare(INPUTS, 12345);
    const back = decodeShare(token);
    expect(back).not.toBeNull();
    expect(back!.seed).toBe(12345);
    expect(back!.inputs).toEqual(INPUTS);
  });

  it('shareUrl builds a /hermes?s= URL', () => {
    const url = shareUrl('ABC', 'https://x.test');
    expect(url).toBe('https://x.test/hermes?s=ABC');
  });

  it('token is URL-safe (no +, /, =)', () => {
    const token = encodeShare(INPUTS, 999);
    expect(token).not.toMatch(/[+/=]/);
  });
});

describe('shareLink — hostile / malformed tokens are neutralized (never throw)', () => {
  it('returns null for garbage / empty / wrong-version', () => {
    expect(decodeShare('')).toBeNull();
    expect(decodeShare('!!!not base64!!!')).toBeNull();
    expect(decodeShare('x'.repeat(5000))).toBeNull(); // oversized
    // valid base64url JSON but wrong version
    const wrongVer = encodeShare(INPUTS, 1).replace(/./, 'Z'); // corrupt → likely null
    expect(() => decodeShare(wrongVer)).not.toThrow();
  });

  it('caps an over-length theme and clamps insane tempo on decode', () => {
    // 2500 chars: over the 2000 text-cap, but the token stays under the size limit
    const evil = { v: 1, i: { ...INPUTS, theme: 'x'.repeat(2500), tempoMin: 1e9, tempoMax: -50 }, s: 5 };
    const token = Buffer.from(JSON.stringify(evil), 'utf8').toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const back = decodeShare(token)!;
    expect(back.inputs.theme.length).toBeLessThanOrEqual(2000);
    expect(back.inputs.tempoMin).toBeGreaterThanOrEqual(40);
    expect(back.inputs.tempoMax).toBeLessThanOrEqual(260);
    expect(back.inputs.tempoMin).toBeLessThanOrEqual(back.inputs.tempoMax);
  });

  it('a __proto__ payload cannot pollute Object.prototype', () => {
    const evil = '{"v":1,"i":{"__proto__":{"polluted":true}},"s":1}';
    const token = Buffer.from(evil, 'utf8').toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    decodeShare(token);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('rejects an unknown structure, falling back to a valid one', () => {
    const token = encodeShare({ ...INPUTS, structure: 'evil' as SongInputs['structure'] }, 1);
    expect(decodeShare(token)!.inputs.structure).toBe('full-song');
  });

  it('preserves a valid rhymeScheme and drops a hostile one', () => {
    const kept = decodeShare(encodeShare({ ...INPUTS, rhymeScheme: 'ABAB' }, 1))!;
    expect(kept.inputs.rhymeScheme).toBe('ABAB');
    const dropped = decodeShare(encodeShare({ ...INPUTS, rhymeScheme: 'ZZZZ' as SongInputs['rhymeScheme'] }, 1))!;
    expect(dropped.inputs.rhymeScheme).toBeUndefined();
  });

  it('a hostile rhymeScheme smuggled to runPipeline cannot crash generation', async () => {
    const hostile = { ...INPUTS, rhymeScheme: 'ZZZZ' as SongInputs['rhymeScheme'] };
    const opts = { id: 'fixed', now: '2026-01-01T00:00:00Z', seed: 3, priorSongs: [], bannedWords: [] as string[] };
    const res = await runPipeline(hostile, opts);
    // invalid scheme is dropped at the normalize seam → identical to the AABB default
    const baseline = await runPipeline(INPUTS, opts);
    expect(res.pkg.finalLyrics).toBe(baseline.pkg.finalLyrics);
  });
});

describe('shareLink — the determinism promise (a link reproduces the EXACT song)', () => {
  const opts = { id: 'fixed', now: '2026-01-01T00:00:00Z', priorSongs: [], bannedWords: [] as string[] };

  it('same inputs + seed ⇒ byte-identical song (twice)', async () => {
    const a = (await runPipeline(INPUTS, { ...opts, seed: 4242 })).pkg;
    const b = (await runPipeline(INPUTS, { ...opts, seed: 4242 })).pkg;
    expect(b.finalLyrics).toBe(a.finalLyrics);
    expect(b.chosenHook?.text).toBe(a.chosenHook?.text);
    expect(b.score.total).toBe(a.score.total);
  });

  it('encode → decode → run reproduces the identical song', async () => {
    const original = (await runPipeline(INPUTS, { ...opts, seed: 7 })).pkg;
    const decoded = decodeShare(encodeShare(INPUTS, 7))!;
    const reproduced = (await runPipeline(decoded.inputs, { ...opts, seed: decoded.seed })).pkg;
    expect(reproduced.finalLyrics).toBe(original.finalLyrics);
    expect(reproduced.chosenHook?.text).toBe(original.chosenHook?.text);
    expect(reproduced.score.total).toBe(original.score.total);
  });

  it('a pattern-pack song (non-default rhymeScheme) reproduces identically through a share link', async () => {
    // Regression: sanitizeInputs used to drop rhymeScheme, so an ABAB share
    // silently reproduced as AABB — different lyrics for the recipient.
    const abab: SongInputs = { ...INPUTS, rhymeScheme: 'ABAB' };
    const original = (await runPipeline(abab, { ...opts, seed: 11 })).pkg;
    const decoded = decodeShare(encodeShare(abab, 11))!;
    const reproduced = (await runPipeline(decoded.inputs, { ...opts, seed: decoded.seed })).pkg;
    expect(reproduced.finalLyrics).toBe(original.finalLyrics);
    // and the scheme genuinely changes output vs the default (the dial is live)
    const aabbDefault = (await runPipeline(INPUTS, { ...opts, seed: 11 })).pkg;
    expect(original.finalLyrics).not.toBe(aabbDefault.finalLyrics);
  });
});

describe('shareLink — giftMessage (Song Gifts phase 2)', () => {
  const url = 'https://wifi-dj-meme.pages.dev/hermes?s=abc';

  it('builds a one-line gift message when occasion + audience are both set', () => {
    const msg = giftMessage({ ...INPUTS, occasion: 'birthday', audience: 'Sarah' }, url);
    expect(msg).toContain('🎂');
    expect(msg).toContain('Birthday');
    expect(msg).toContain('Sarah');
    expect(msg).toContain(url);
  });

  it('falls back to the bare URL with no occasion, no audience, or a hostile occasion', () => {
    expect(giftMessage(INPUTS, url)).toBe(url);
    expect(giftMessage({ ...INPUTS, occasion: 'birthday', audience: '' }, url)).toBe(url);
    expect(giftMessage({ ...INPUTS, occasion: 'birthday', audience: '   ' }, url)).toBe(url);
    expect(giftMessage({ ...INPUTS, occasion: 'evil', audience: 'Sarah' } as SongInputs, url)).toBe(url);
  });
});
