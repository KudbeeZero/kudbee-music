import { describe, it, expect } from 'vitest';
import { inputsFromLine, playgroundGenre, PLAYGROUND_GENRES, DEFAULT_PLAYGROUND_GENRE } from '../livePlayground';
import { runPipeline } from '../pipeline';
import { encodeShare, decodeShare } from '../shareLink';
import { allAvoidWords } from '../memory';

describe('livePlayground — inputsFromLine', () => {
  it('maps a line into the theme and trims it', () => {
    const inputs = inputsFromLine('  a song about leaving home  ', 'trap');
    expect(inputs.theme).toBe('a song about leaving home');
  });

  it('applies the chosen genre chip', () => {
    const inputs = inputsFromLine('midnight drive', 'synthwave');
    expect(inputs.genre).toBe('synthwave pop');
    expect(inputs.mood).toBe('neon, nostalgic, driving');
  });

  it('falls back to the default genre for an unknown/absent chip', () => {
    expect(playgroundGenre('nope')).toBe(DEFAULT_PLAYGROUND_GENRE);
    expect(inputsFromLine('x').genre).toBe(DEFAULT_PLAYGROUND_GENRE.genre);
  });

  it('produces portable, deterministic defaults (empty doNotUse, hook-first, 90–140)', () => {
    const inputs = inputsFromLine('open road', 'soul');
    expect(inputs.doNotUse).toEqual([]);
    expect(inputs.structure).toBe('hook-first');
    expect(inputs.tempoMin).toBe(90);
    expect(inputs.tempoMax).toBe(140);
    expect(inputs.title).toBe('');
  });

  it('every chip yields a genre + mood', () => {
    for (const g of PLAYGROUND_GENRES) {
      const inputs = inputsFromLine('test', g.id);
      expect(inputs.genre).toBe(g.genre);
      expect(inputs.mood).toBe(g.mood);
    }
  });
});

describe('livePlayground — the share link reproduces the landing song', () => {
  // Mirror the LivePlayground generation exactly: bannedWords = allAvoidWords([]),
  // no priorSongs, and a captured seed. Then encode → decode → re-run and assert
  // byte-identical output (the /hermes?s= reproduce path).
  it('generate → encode → decode → re-run is byte-identical', async () => {
    const inputs = inputsFromLine('made it out the struggle', 'trap');
    const seed = 424242;
    const run = () =>
      runPipeline(inputs, { seed, bannedWords: allAvoidWords([]), priorSongs: [], id: 'fixed', now: '2026-01-01T00:00:00Z' });

    const original = (await run()).pkg;
    const decoded = decodeShare(encodeShare(inputs, seed))!;
    expect(decoded.seed).toBe(seed);
    expect(decoded.inputs).toEqual(inputs);

    const reproduced = (
      await runPipeline(decoded.inputs, { seed: decoded.seed, bannedWords: allAvoidWords([]), priorSongs: [], id: 'fixed', now: '2026-01-01T00:00:00Z' })
    ).pkg;
    expect(reproduced.finalLyrics).toBe(original.finalLyrics);
    expect(reproduced.chosenHook?.text).toBe(original.chosenHook?.text);
    expect(reproduced.score.total).toBe(original.score.total);
  });
});
