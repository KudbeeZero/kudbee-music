import { describe, it, expect } from 'vitest';
import { mockLyricsProvider, nounable, themeNouns } from '../providers/mockLyricsProvider';
import { selfSimilarity, lineSkeleton, keywords } from '../text';
import { slantKey, rhymeKey } from '../lexicon';
import { rhymeFamily } from '../rhyme';
import { makeRng } from '../text';
import type { SongInputs, SongSection } from '../types';

function brief(over: Partial<SongInputs> = {}): SongInputs {
  return {
    title: 'T', theme: 'building a harbor out of the cold ocean water',
    mood: 'defiant, hopeful, hard-earned', genre: 'boom-bap hip-hop', tempoMin: 88, tempoMax: 96,
    voice: 'gritty', audience: 'the doubters', doNotUse: [], references: '', structure: 'full-song', ...over,
  };
}

async function gen(inputs: SongInputs, seed = 4): Promise<SongSection[]> {
  const hooks = await mockLyricsProvider.generateHooks(inputs, 5, seed);
  return mockLyricsProvider.generateSections(inputs, hooks[0], seed);
}
const verses = (secs: SongSection[]) => secs.filter((s) => /verse|bridge/i.test(s.label));
const verseLines = (secs: SongSection[]) => secs.filter((s) => !/hook|chorus|intro|outro/i.test(s.label)).flatMap((s) => s.lines);

describe('grammaticality — no verb/adjective/gerund in a noun slot', () => {
  it('nounable() rejects gerunds, participles, adverbs, auxiliaries; keeps real nouns', () => {
    // the exact words that used to leak into the demos as "nouns"
    for (const bad of ['growing', 'supposed', 'was', 'beautiful', 'breaking', 'handed', 'really']) {
      expect(nounable(bad)).toBe(false);
    }
    for (const good of ['harbor', 'street', 'garden', 'record', 'morning', 'road']) {
      expect(nounable(good)).toBe(true);
    }
  });

  it('a thin theme still yields distinct anchor nouns (padded from the concrete bank)', async () => {
    // this theme surfaces only "place" as a usable noun — the rest are verbs/adjectives
    const inputs = brief({ theme: 'growing something beautiful out of a place that was supposed to break you', references: '' });
    expect(themeNouns(inputs).length).toBeLessThanOrEqual(2); // thin on purpose
    const secs = await gen(inputs, 2);
    const words = verseLines(secs).join(' ').toLowerCase().split(/[^a-z]+/).filter(Boolean);
    // none of the broken words appear anywhere in the verses
    for (const bad of ['growing', 'supposed', 'beautiful']) expect(words).not.toContain(bad);
    // a bare linking verb never sits after an article ("the was", "the supposed")
    expect(verseLines(secs).join('\n')).not.toMatch(/\bthe (was|supposed|growing|beautiful)\b/i);
  });
});

describe('lyric-core depth', () => {
  it('gives each verse a distinct section goal (setup ≠ turn ≠ reflect)', async () => {
    const secs = await gen(brief());
    const v1 = secs.find((s) => s.label === 'Verse 1')!.lines.map(lineSkeleton);
    const v2 = secs.find((s) => s.label === 'Verse 2')!.lines.map(lineSkeleton);
    // different frame pools + the song-wide diversity guard → no shared line shape
    const shared = new Set(v1);
    expect(v2.filter((s) => shared.has(s))).toHaveLength(0);
  });

  it('threads theme words across sections (develops one idea)', async () => {
    const inputs = brief({ theme: 'the ocean carried my brother past the harbor lighthouse' });
    const secs = await gen(inputs);
    const thread = keywords(inputs.theme);
    const sectionsWithTheme = verses(secs).filter((s) => s.lines.some((l) => thread.some((t) => l.toLowerCase().includes(t))));
    expect(sectionsWithTheme.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps self-similarity low (does not repeat its own line shapes)', async () => {
    const secs = await gen(brief());
    expect(selfSimilarity(verseLines(secs))).toBeLessThanOrEqual(0.2);
  });

  it('the rhyme-temperature knob changes the output (tight vs loose)', async () => {
    const tight = await gen(brief({ rhymeTemp: 'tight' }), 6);
    const loose = await gen(brief({ rhymeTemp: 'loose' }), 6);
    const flat = (s: SongSection[]) => s.flatMap((x) => x.lines).join('\n');
    expect(flat(tight)).not.toBe(flat(loose));
  });

  it('is deterministic for a fixed seed + temperature', async () => {
    const a = await gen(brief({ rhymeTemp: 'loose' }), 9);
    const b = await gen(brief({ rhymeTemp: 'loose' }), 9);
    expect(a.flatMap((s) => s.lines).join('\n')).toBe(b.flatMap((s) => s.lines).join('\n'));
  });
});

describe('diversity + slant primitives', () => {
  it('lineSkeleton captures first-two + last word', () => {
    expect(lineSkeleton('Still climb my way up out the road')).toBe('still climb road');
  });

  it('selfSimilarity: 0 for distinct shapes, >0 when a shape repeats', () => {
    expect(selfSimilarity(['it started with the block', 'now I chase the gold'])).toBe(0);
    expect(selfSimilarity(['still climb up the road', 'still climb past the road'])).toBeGreaterThan(0);
  });

  it('slantKey is looser than rhymeKey (groups near-rhymes)', () => {
    // slant key is a prefix of the perfect key (just the vowel nucleus)
    expect(rhymeKey('road')).not.toBe(slantKey('road'));
    expect(slantKey('road').length).toBeLessThanOrEqual(rhymeKey('road').length);
  });

  it('loose temperature can reach rhyme words tight temperature would not', () => {
    // sample many families under each temp; the loose word-set should not be a subset
    const words = (temp: 'tight' | 'loose') => {
      const rng = makeRng(123);
      const s = new Set<string>();
      for (let i = 0; i < 40; i++) rhymeFamily(rng, 0, 2, temp).forEach((e) => s.add(e.w));
      return s;
    };
    const loose = words('loose');
    const tight = words('tight');
    expect([...loose].some((w) => !tight.has(w))).toBe(true);
  });
});
