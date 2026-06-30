// Mock lyrics provider — the "Lyrical Combinator". Builds ORIGINAL hooks and
// verses by combining the user's own theme/mood/voice keywords with grounded
// structural scaffolds. No copyrighted text, no artist mimicry — deterministic
// per input so the same brief reproduces the same draft (good for tests + the
// uniqueness vault).
import type { LyricsProvider } from './providerTypes';
import type { SongInputs, HookOption, SongSection } from '../types';
import { makeRng, hashString, pick, keywords, titleCase, shuffle, tidyLine } from '../text';

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

const VERSE_FRAMES = [
  'I count the {noun} like I count the days gone by',
  'they ask me how I {verb} and I just point to the sky',
  '{who} on my mind every time the beat drop',
  'turned the {adj} mornings into something I could hold',
  'no shortcuts, just the {noun} and the long road',
  'wrote it down so {who} would always know',
  'the {adj} streets taught me patience and the cost',
  'I keep the receipts of everything I lost',
  'made a way where the map said there was none',
  'carry the name like it weighs a ton',
];

const VERBS = ['climb', 'carry', 'build', 'fight', 'hold on', 'keep moving', 'pray', 'grind', 'crawl', 'rebuild', 'reach', 'hustle', 'survive', 'push'];
const ADJ = ['cold', 'quiet', 'heavy', 'restless', 'patient', 'stubborn', 'grounded', 'hollow', 'guarded', 'weathered', 'relentless', 'distant'];

// words that read badly in a noun slot ("where the OUT used to be") — keep them
// out of the {noun}/{k} pool so the combinator stays grammatical.
const NOUN_STOP = new Set(['made', 'out', 'still', 'got', 'get', 'keep', 'let', 'gone', 'been', 'came', 'through', 'about', 'song']);

function fill(frame: string, inputs: SongInputs, rng: () => number): string {
  const ks = keywords([inputs.theme, inputs.mood, inputs.references].join(' ')).filter((k) => !NOUN_STOP.has(k));
  // shuffled pools, consumed in order, so a single line never repeats the same
  // filler word ("the road and the road") — distinct, grammatical output.
  const nouns = shuffle(ks.length ? ks : ['block', 'name', 'road', 'weight', 'city', 'street'], rng);
  const verbs = shuffle(VERBS, rng);
  const adjs = shuffle(ADJ, rng);
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
    const frames = shuffle(VERSE_FRAMES, rng);
    const v1 = dedupe(frames.slice(0, 4).map((f) => capitalize(fill(f, inputs, rng))));
    const v2 = dedupe(frames.slice(4, 8).map((f) => capitalize(fill(f, inputs, rng))));
    const bridge = dedupe(frames.slice(8).concat(frames.slice(0, 2)).slice(0, 2).map((f) => capitalize(fill(f, inputs, rng))));
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
