import { describe, it, expect } from 'vitest';
import { mockLyricsProvider, nounable, themeNouns, themeImagery, verbPool, imageryCoherence } from '../providers/mockLyricsProvider';
import { selfSimilarity, lineSkeleton, keywords } from '../text';
import { slantKey, rhymeKey } from '../lexicon';
import { rhymeFamily } from '../rhyme';
import { makeRng } from '../text';
import { lineSyllables, syllableFit } from '../meter';
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

  it('rejects prepositions / conjunctions and 3rd-person verbs in the noun slot', () => {
    for (const bad of ['across', 'while', 'because', 'toward', 'keeps', 'sees', 'goes', 'yet', 'fake']) {
      expect(nounable(bad)).toBe(false);
    }
  });

  // regression: the end-to-end audit surfaced "the carry that raised me" + "through the daughter"
  it("rejects the combinator's own action verbs as nouns (audit: 'the carry that raised me')", () => {
    for (const v of ['carry', 'grind', 'hustle', 'climb', 'survive', 'reach']) expect(nounable(v)).toBe(false);
  });

  // regression: interactive testing surfaced "still standing where the one used to be" and
  // "tell doubters I made it out the other" — indefinite pronouns/quantifiers ("one", "other")
  // are the same class of defect as "something"/"someone" (already excluded) but were missing
  // from the list, so a theme containing "one step" or "the other" leaked them into a noun slot.
  it('rejects indefinite pronouns/quantifiers as nouns (regression: "the one used to be")', () => {
    for (const w of ['one', 'ones', 'other', 'others']) expect(nounable(w)).toBe(false);
    const inputs = brief({ theme: 'climbing one step at a time until you pass every other doubter', references: '' });
    const words = themeNouns(inputs);
    expect(words).not.toContain('one');
    expect(words).not.toContain('other');
  });

  it("keeps the audience word out of noun slots (audit: 'for daughter … through the daughter')", async () => {
    const inputs = brief({ theme: 'made it out the struggle for my daughter, still carry the block', audience: 'my daughter', references: '' });
    expect(themeNouns(inputs)).not.toContain('daughter');
    const hooks = await mockLyricsProvider.generateHooks(inputs, 5, 3);
    const secs = await mockLyricsProvider.generateSections(inputs, hooks[0], 3);
    const text = [...hooks.map((h) => h.text), ...verseLines(secs)].join(' ').toLowerCase();
    expect(text).not.toMatch(/\bthe daughter\b/); // audience word never fills a {noun}
    expect(text).not.toMatch(/\bthe carry\b/);     // verb never fills a {noun}
  });
});

describe('imagery coherence — backfill nouns match the theme', () => {
  it('routes a theme/mood to the most relevant imagery clusters', () => {
    expect(themeImagery(brief({ theme: 'loving someone across the ocean while the tide pulls us apart', mood: 'aching' }))[0]).toBe('water');
    expect(themeImagery(brief({ theme: 'coming home to the family that raised me', mood: 'warm' }))[0]).toBe('home');
    expect(themeImagery(brief({ theme: 'grinding on the cold block to eat', mood: 'hard, hungry' }))[0]).toBeDefined();
  });

  it('a water-themed brief pulls water/ocean imagery into the verses (not random nouns)', async () => {
    const inputs = brief({ theme: 'loving someone across the ocean while the tide keeps pulling us apart', mood: 'aching, distant', references: '' });
    const words = new Set(verseLines(await gen(inputs, 5)).join(' ').toLowerCase().split(/[^a-z]+/).filter(Boolean));
    const water = ['harbor', 'current', 'river', 'tide', 'ocean', 'anchor', 'shoreline', 'raindrop', 'wave', 'flood', 'distance', 'desire', 'fire', 'spark'];
    expect(water.some((w) => words.has(w))).toBe(true); // at least one on-imagery noun surfaced
  });

  it('is deterministic — same brief routes to the same clusters', () => {
    const b = brief();
    expect(themeImagery(b)).toEqual(themeImagery(b));
  });
});

describe('verb/noun agreement — verbs lean on the song\'s own imagery register', () => {
  it('a street/struggle-themed brief favors those verbs over home/light ones', () => {
    const inputs = brief({ theme: 'grinding on the cold block, fighting the struggle, carrying the weight', mood: 'hard', references: '' });
    expect(themeImagery(inputs).slice(0, 2).sort()).toEqual(['street', 'struggle']);
    const pool = verbPool(inputs);
    expect(pool).toContain('hustle');
    expect(pool).not.toContain('build');
    expect(pool).not.toContain('pray');
  });

  it('falls back to the full verb list when too few verbs match the top clusters', () => {
    // 'water' has no tagged verbs — the restriction must not starve the pool
    const inputs = brief({ theme: 'loving someone across the ocean while the tide pulls us apart', mood: 'aching', references: '' });
    expect(themeImagery(inputs)[0]).toBe('water');
    expect(verbPool(inputs).length).toBe(14);
  });

  it('is deterministic — same brief yields the same pool', () => {
    const b = brief();
    expect(verbPool(b)).toEqual(verbPool(b));
  });
});

describe('imagery-coherence scoring', () => {
  it('scores 1 (vacuous) when no imagery-bank noun surfaces in the lines', () => {
    expect(imageryCoherence(['a line with no bank nouns at all'], brief())).toBe(1);
  });

  it('scores high when every bank noun belongs to the top cluster', () => {
    const inputs = brief({ theme: 'the ocean and the tide', mood: 'aching', references: '' });
    expect(imageryCoherence(['the harbor and the tide', 'a river past the ocean'], inputs)).toBe(1);
  });

  it('scores lower when bank nouns scatter across unrelated clusters', () => {
    const inputs = brief({ theme: 'the ocean and the tide', mood: 'aching', references: '' });
    // 'harbor'/'tide' are on-image (water); 'kitchen'/'doorway' are off-image (home)
    const mixed = imageryCoherence(['the harbor and the tide', 'the kitchen by the doorway'], inputs);
    expect(mixed).toBeLessThan(1);
    expect(mixed).toBeGreaterThan(0);
  });

  it('is deterministic for the same lines + brief', () => {
    const inputs = brief();
    const lines = ['it started with the block and the gold'];
    expect(imageryCoherence(lines, inputs)).toBe(imageryCoherence(lines, inputs));
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

describe('avoid-word enforcement — exclusions actually prevent generation, not just flag it', () => {
  it('never generates a banned imagery-bank noun across many seeds', async () => {
    const inputs = brief({ theme: 'chasing the light across the skyline', mood: 'hopeful', references: '' });
    const banned = ['skyline', 'mirror', 'flame'];
    for (let seed = 0; seed < 15; seed++) {
      const hooks = await mockLyricsProvider.generateHooks(inputs, 5, seed, banned);
      const secs = await mockLyricsProvider.generateSections(inputs, hooks[0], seed, banned);
      const text = [...hooks.map((h) => h.text), ...secs.flatMap((s) => s.lines)].join(' ').toLowerCase();
      for (const b of banned) expect(text).not.toMatch(new RegExp(`\\b${b}\\b`));
    }
  });

  it('never picks a banned rhyme word (e.g. "crown"/"throne") even for a bright, triumphant brief', async () => {
    const inputs = brief({ theme: 'the come-up, proving my worth, standing tall', mood: 'triumphant, proud, hopeful', references: '' });
    const banned = ['crown', 'throne'];
    for (let seed = 0; seed < 15; seed++) {
      const hooks = await mockLyricsProvider.generateHooks(inputs, 5, seed, banned);
      const secs = await mockLyricsProvider.generateSections(inputs, hooks[0], seed, banned);
      const text = [...hooks.map((h) => h.text), ...secs.flatMap((s) => s.lines)].join(' ').toLowerCase();
      expect(text).not.toMatch(/\bcrown\b/);
      expect(text).not.toMatch(/\bthrone\b/);
    }
  });

  it('drops a frame template outright when its own fixed wording is banned ("no turning back")', async () => {
    const inputs = brief();
    const banned = ['no turning back'];
    for (let seed = 0; seed < 15; seed++) {
      const hooks = await mockLyricsProvider.generateHooks(inputs, 5, seed, banned);
      const secs = await mockLyricsProvider.generateSections(inputs, hooks[0], seed, banned);
      const text = [...hooks.map((h) => h.text), ...secs.flatMap((s) => s.lines)].join(' ').toLowerCase();
      expect(text).not.toMatch(/no turning back/);
    }
  });

  it('never starves a pool when every word in a cluster is banned — still generates a full song', async () => {
    const allLight = ['candle', 'ember', 'lantern', 'sunrise', 'horizon', 'skyline', 'spark', 'glow', 'beacon', 'flame'];
    const inputs = brief({ theme: 'chasing the light', mood: 'hopeful', references: '' });
    const hooks = await mockLyricsProvider.generateHooks(inputs, 5, 1, allLight);
    const secs = await mockLyricsProvider.generateSections(inputs, hooks[0], 1, allLight);
    expect(hooks.length).toBeGreaterThan(0);
    expect(secs.flatMap((s) => s.lines).length).toBeGreaterThan(0);
  });

  it('verbPool/rhymeFamily accept a banned set directly and respect it', () => {
    const inputs = brief({ theme: 'grinding on the cold block, fighting the struggle, carrying the weight', mood: 'hard', references: '' });
    const pool = verbPool(inputs, new Set(['hustle', 'grind']));
    expect(pool).not.toContain('hustle');
    expect(pool).not.toContain('grind');

    const rng = makeRng(7);
    for (let i = 0; i < 20; i++) {
      const fam = rhymeFamily(rng, 0.5, 2, 'balanced', new Set(['crown', 'throne']));
      for (const e of fam) expect(['crown', 'throne']).not.toContain(e.w);
    }
  });
});

describe('singability dial — deliveryPreferences.syllableTarget (docs/pattern-packs.md meter backlog, scoped)', () => {
  it('is a no-op when unset — byte-identical to a plain brief (Iron Law #1)', async () => {
    const withoutDial = brief();
    const withUndefinedDial = brief({ deliveryPreferences: undefined });
    const a = await gen(withoutDial, 3);
    const b = await gen(withUndefinedDial, 3);
    expect(a).toEqual(b);
  });

  it('is deterministic — same inputs + seed produce byte-identical verses when set', async () => {
    const inputs = brief({ deliveryPreferences: { syllableTarget: [6, 9] } });
    const a = await gen(inputs, 9);
    const b = await gen(inputs, 9);
    expect(a).toEqual(b);
  });

  it('pulls verse-line syllable counts closer to a tight target than the unconstrained draw', async () => {
    const target: [number, number] = [6, 8];
    const unconstrained = brief();
    const constrained = brief({ deliveryPreferences: { syllableTarget: target } });
    // average over several seeds so one lucky/unlucky draw can't flip the result
    let sumUnconstrained = 0;
    let sumConstrained = 0;
    let n = 0;
    for (let seed = 0; seed < 8; seed++) {
      const a = verseLines(await gen(unconstrained, seed));
      const b = verseLines(await gen(constrained, seed));
      for (const l of a) { sumUnconstrained += 1 - syllableFit(lineSyllables(l), target); n++; }
      for (const l of b) sumConstrained += 1 - syllableFit(lineSyllables(l), target);
    }
    // constrained runs should have strictly less total "distance from the target" error
    expect(sumConstrained).toBeLessThan(sumUnconstrained);
    expect(n).toBeGreaterThan(0);
  });
});
