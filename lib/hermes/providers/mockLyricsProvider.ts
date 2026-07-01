// Mock lyrics provider — the "Lyrical Combinator". Builds ORIGINAL hooks and
// verses by combining the user's own theme/mood/voice keywords with grounded
// structural scaffolds. No copyrighted text, no artist mimicry — deterministic
// per input so the same brief reproduces the same draft (good for tests + the
// uniqueness vault).
import type { LyricsProvider } from './providerTypes';
import type { SongInputs, HookOption, SongSection } from '../types';
import { makeRng, hashString, pick, keywords, titleCase, shuffle, tidyLine } from '../text';
import { rhymeFamily } from '../rhyme';
import { deriveEmotion } from '../emotion';

function seedOf(inputs: SongInputs, salt = '', seed = 0): number {
  return hashString(
    [inputs.title, inputs.theme, inputs.mood, inputs.genre, inputs.voice, salt].join('|'),
  ) ^ (seed >>> 0);
}

// Scaffolds are abstract frames; {k}=keyword, {who}=audience, {place}=ref token.
const HOOK_FRAMES = [
  'for {who}, I {verb} through the {noun}',
  '{k}, that\'s the only thing I kept',
  'tell {who} I made it out the {noun}',
  'I been {adj} but I never let it show',
  'still standing where the {noun} used to be',
  'every step a promise that I {verb}',
  'this one\'s for the {noun} that raised me',
];

const VERBS = ['climb', 'carry', 'build', 'fight', 'hold on', 'keep moving', 'pray', 'grind', 'crawl', 'rebuild', 'reach', 'hustle', 'survive', 'push'];
// adjectives split by affect — the limbic layer picks the pool that matches the mood
const ADJ_DARK = ['cold', 'quiet', 'heavy', 'restless', 'hollow', 'guarded', 'weathered', 'distant', 'stubborn', 'bitter'];
const ADJ_BRIGHT = ['golden', 'fearless', 'patient', 'steady', 'open', 'grateful', 'relentless', 'grounded', 'bright', 'awake'];
const ADJ_ALL = [...ADJ_DARK, ...ADJ_BRIGHT];
function adjPool(valence: number): string[] {
  return valence < -0.2 ? ADJ_DARK : valence > 0.2 ? ADJ_BRIGHT : ADJ_ALL;
}

// words that read badly in a noun slot ("where the OUT used to be") — keep them
// out of the {noun}/{k} pool so the combinator stays grammatical.
const NOUN_STOP = new Set(['made', 'out', 'still', 'got', 'get', 'keep', 'let', 'gone', 'been', 'came', 'through', 'about', 'song']);

// Couplet lines end on a {rhyme} slot so two of them land a real end-rhyme.
const COUPLET_LINES = [
  'still {verb} my way up out the {rhyme}',
  'they never saw me chase the {rhyme}',
  'I keep it close, the {adj} {rhyme}',
  'everything I lost became the {rhyme}',
  'no map, no plan, just the {rhyme}',
  'I carry the weight of the {rhyme}',
  'they ask me why I need the {rhyme}',
  'wrote my whole name across the {rhyme}',
  'out them {adj} nights I found the {rhyme}',
  'nobody ever handed me the {rhyme}',
  'I bet it all on the {rhyme}',
  'learned to love the {adj} {rhyme}',
];

// Build a rhymed verse: `couplets` pairs of lines, each pair ending on two
// different-but-rhyming lexicon words. Deterministic per rng.
function buildRhymedVerse(inputs: SongInputs, rng: () => number, valence: number, couplets: number): string[] {
  const lines: string[] = [];
  for (let c = 0; c < couplets; c++) {
    const fam = rhymeFamily(rng, valence, 2);
    const a = fam[0]?.w ?? 'road';
    const b = fam[1]?.w ?? 'gold';
    const t1 = pick(COUPLET_LINES, rng);
    const t2 = pick(COUPLET_LINES.filter((x) => x !== t1), rng);
    lines.push(capitalize(fill(t1, inputs, rng, a, valence)));
    lines.push(capitalize(fill(t2, inputs, rng, b, valence)));
  }
  return dedupe(lines);
}

function fill(frame: string, inputs: SongInputs, rng: () => number, rhyme = '', valence = 0): string {
  const ks = keywords([inputs.theme, inputs.mood, inputs.references].join(' ')).filter((k) => !NOUN_STOP.has(k));
  // shuffled pools, consumed in order, so a single line never repeats the same
  // filler word ("the road and the road") — distinct, grammatical output.
  const nouns = shuffle(ks.length ? ks : ['block', 'name', 'road', 'weight', 'city', 'street'], rng);
  const verbs = shuffle(VERBS, rng);
  const adjs = shuffle(adjPool(valence), rng);   // emotion → diction: adjectives lean with the mood
  let ni = 0, vi = 0, ai = 0;
  // pick a meaningful audience word — skip leading articles ("the lonely" -> "lonely")
  const WHO_STOP = new Set(['the', 'a', 'an', 'my', 'for', 'to', 'of', 'all']);
  const whoTokens = (inputs.audience || '').split(/\s+/).filter(Boolean);
  const who = whoTokens.find((w) => !WHO_STOP.has(w.toLowerCase())) || whoTokens[whoTokens.length - 1] || 'mine';
  const out = frame
    .replace(/\{k\}/g, () => titleCase(nouns[ni++ % nouns.length]))
    .replace(/\{noun\}/g, () => nouns[ni++ % nouns.length])
    .replace(/\{verb\}/g, () => verbs[vi++ % verbs.length])
    .replace(/\{adj\}/g, () => adjs[ai++ % adjs.length])
    .replace(/\{who\}/g, () => who)
    .replace(/\{rhyme\}/g, () => rhyme || nouns[ni++ % nouns.length])
    .replace(/\{place\}/g, () => nouns[ni++ % nouns.length]);
  return tidyLine(out);
}

function dedupe(lines: string[]): string[] {
  const seen = new Set<string>();
  return lines.filter((l) => {
    const k = l.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export const mockLyricsProvider: LyricsProvider = {
  id: 'mock-lyrics',
  live: false,

  async generateHooks(inputs, count, seed = 0) {
    const rng = makeRng(seedOf(inputs, 'hooks', seed));
    const frames = shuffle(HOOK_FRAMES, rng);
    const out: HookOption[] = [];
    for (let i = 0; i < count && i < frames.length; i++) {
      const text = capitalize(fill(frames[i], inputs, rng));
      const len = text.split(/\s+/).length;
      out.push({
        text,
        angle: pick(
          ['call-and-response chant', 'confessional one-liner', 'anthem declaration', 'melodic question'],
          rng,
        ),
        cadence: pick(['half-time, laid back', 'bouncy triplets', 'on-beat and punchy', 'floating melodic'], rng),
        score: 60 + Math.round((len <= 8 ? 1 : 0.6) * 30 + rng() * 8),
      });
    }
    return out;
  },

  async generateSections(inputs, hook, seed = 0) {
    const rng = makeRng(seedOf(inputs, 'verse', seed));
    // the limbic layer sets the emotional valence → rhyme words + adjectives lean with it
    const valence = deriveEmotion(inputs).valence;
    // rhymed couplets — verses now land real end-rhymes (built on the lexicon)
    const v1 = buildRhymedVerse(inputs, rng, valence, 2);
    const v2 = buildRhymedVerse(inputs, rng, valence, 2);
    const bridge = buildRhymedVerse(inputs, rng, valence, 1);
    const hookLines = [hook.text, hook.text, secondHookLine(inputs, rng), hook.text];

    const full: SongSection[] = [
      { label: 'Intro', lines: [capitalize(fill('{who}, this one\'s for you', inputs, rng))] },
      { label: 'Hook', lines: hookLines },
      { label: 'Verse 1', lines: v1 },
      { label: 'Hook', lines: hookLines },
      { label: 'Verse 2', lines: v2 },
      { label: 'Bridge', lines: bridge },
      { label: 'Hook', lines: hookLines },
    ];

    switch (inputs.structure) {
      case 'short-form':
        return [{ label: 'Hook', lines: hookLines }, { label: 'Verse 1', lines: v1.slice(0, 2) }];
      case 'radio-edit':
        return full.filter((s) => s.label !== 'Bridge');
      case 'hook-first':
        return full;
      case 'verse-first':
        return [{ label: 'Verse 1', lines: v1 }, { label: 'Hook', lines: hookLines }, { label: 'Verse 2', lines: v2 }, { label: 'Hook', lines: hookLines }];
      default:
        return full;
    }
  },
};

function secondHookLine(inputs: SongInputs, rng: () => number): string {
  return capitalize(fill(pick(['and {who} know I {verb} for it', 'all this {noun}, I earned it slow'], rng), inputs, rng));
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
