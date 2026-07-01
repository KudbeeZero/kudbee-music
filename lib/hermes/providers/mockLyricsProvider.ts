// Mock lyrics provider — the "Lyrical Combinator". Builds ORIGINAL hooks and
// verses by combining the user's own theme/mood/voice keywords with grounded
// structural scaffolds. No copyrighted text, no artist mimicry — deterministic
// per input so the same brief reproduces the same draft (good for tests + the
// uniqueness vault).
import type { LyricsProvider } from './providerTypes';
import type { SongInputs, HookOption, SongSection } from '../types';
import { makeRng, hashString, pick, keywords, titleCase, shuffle, tidyLine } from '../text';
import { rhymeFamily, type RhymeTemp } from '../rhyme';
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
// Hierarchical generation: each SECTION has a GOAL, and draws from a pool of frames
// written for that goal — Verse 1 sets the scene, Verse 2 raises the stakes, the
// Bridge reflects — so the song develops one idea instead of repeating generic lines.
// Each goal frame carries a {noun} (a theme word — this is where thematic threading
// lands) and ends on a {rhyme} (a lexicon rhyme word), so verses both stay on-theme
// and land real couplets.
// Verse 1 — establish: where it started, the ground truth.
const SETUP_LINES = [
  'it started with the {noun} and the {rhyme}',
  'grew up on {noun}, chasing the {rhyme}',
  'all I had was {noun} and the {rhyme}',
  'came up on {noun}, dreaming of the {rhyme}',
  'nothing in my hands but {noun} and the {rhyme}',
  'they handed me {noun} instead of the {rhyme}',
];
// Verse 2 — escalate: the stakes rise, something turns.
const TURN_LINES = [
  'now I {verb} the {noun} into the {rhyme}',
  'everything changed, traded {noun} for the {rhyme}',
  'no turning back, I want the {noun} and the {rhyme}',
  'took that {noun} and turned it to a {rhyme}',
  'stakes got higher, {noun} became the {rhyme}',
  'put the {noun} down, reaching for the {rhyme}',
];
// Bridge — reflect: the quiet payoff, what it cost and meant.
const REFLECT_LINES = [
  'when it\'s quiet I still hear the {noun} and the {rhyme}',
  'looking back, the {noun} was always the {rhyme}',
  'wouldn\'t trade the {noun} for a {rhyme}',
  'made my peace with {noun} and the {rhyme}',
  'every {noun} of mine became a {rhyme}',
  'somewhere in the {noun} I found the {rhyme}',
];

interface VerseOpts { pool: string[]; thread: string[]; used: Set<string>; temp: RhymeTemp; anchorIdx: number; }

// pick a frame not already used elsewhere in the song (diversity guard), falling
// back to the whole pool once exhausted; records the choice so it isn't reused.
function pickFresh(pool: string[], used: Set<string>, rng: () => number): string {
  const fresh = pool.filter((x) => !used.has(x));
  const choice = pick(fresh.length ? fresh : pool, rng);
  used.add(choice);
  return choice;
}

// Build a rhymed verse toward a section goal: `couplets` pairs of lines, each pair
// ending on two different-but-rhyming lexicon words. Threads a theme word through
// the opening line so sections stay about the same thing. Deterministic per rng.
function buildRhymedVerse(inputs: SongInputs, rng: () => number, valence: number, couplets: number, opts: VerseOpts): string[] {
  const { pool, thread, used, temp, anchorIdx } = opts;
  const lines: string[] = [];
  for (let c = 0; c < couplets; c++) {
    const fam = rhymeFamily(rng, valence, 2, temp);
    const a = fam[0]?.w ?? 'road';
    const b = fam[1]?.w ?? 'gold';
    const t1 = pickFresh(pool, used, rng);
    const t2 = pickFresh(pool.filter((x) => x !== t1), used, rng);
    const anchor = thread.length ? thread[(anchorIdx + c) % thread.length] : '';
    lines.push(capitalize(fill(t1, inputs, rng, a, valence, c === 0 ? anchor : '')));
    lines.push(capitalize(fill(t2, inputs, rng, b, valence, '')));
  }
  return dedupe(lines);
}

function fill(frame: string, inputs: SongInputs, rng: () => number, rhyme = '', valence = 0, anchor = ''): string {
  // nouns come from the theme + references (the "what"); mood drives adjectives
  // separately (adjPool), so keeping it out of the noun slots reads more grammatically.
  const ks = keywords([inputs.theme, inputs.references].join(' ')).filter((k) => !NOUN_STOP.has(k));
  // shuffled pools, consumed in order, so a single line never repeats the same
  // filler word ("the road and the road") — distinct, grammatical output.
  const nouns = shuffle(ks.length ? ks : ['block', 'name', 'road', 'weight', 'city', 'street'], rng);
  const verbs = shuffle(VERBS, rng);
  const adjs = shuffle(adjPool(valence), rng);   // emotion → diction: adjectives lean with the mood
  let ni = 0, vi = 0, ai = 0;
  // thematic threading: the first noun-type slot uses the section's anchor word (a
  // theme keyword), so the same idea recurs across sections instead of drifting.
  let anchorLeft = anchor ? 1 : 0;
  const nextNoun = () => (anchorLeft-- > 0 ? anchor : nouns[ni++ % nouns.length]);
  // pick a meaningful audience word — skip leading articles ("the lonely" -> "lonely")
  const WHO_STOP = new Set(['the', 'a', 'an', 'my', 'for', 'to', 'of', 'all']);
  const whoTokens = (inputs.audience || '').split(/\s+/).filter(Boolean);
  const who = whoTokens.find((w) => !WHO_STOP.has(w.toLowerCase())) || whoTokens[whoTokens.length - 1] || 'mine';
  const out = frame
    .replace(/\{k\}/g, () => titleCase(nextNoun()))
    .replace(/\{noun\}/g, () => nextNoun())
    .replace(/\{verb\}/g, () => verbs[vi++ % verbs.length])
    .replace(/\{adj\}/g, () => adjs[ai++ % adjs.length])
    .replace(/\{who\}/g, () => who)
    .replace(/\{rhyme\}/g, () => rhyme || nouns[ni++ % nouns.length])
    .replace(/\{place\}/g, () => nextNoun());
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
    const temp: RhymeTemp = inputs.rhymeTemp ?? 'balanced';
    // the thread: a few theme words carried across every section so the song develops
    // one idea; the diversity guard stops any frame template being reused song-wide.
    const thread = keywords([inputs.theme, inputs.references].join(' ')).filter((k) => !NOUN_STOP.has(k)).slice(0, 3);
    const used = new Set<string>();
    // hierarchical generation: each verse pursues its section goal (setup → turn → reflect)
    const v1 = buildRhymedVerse(inputs, rng, valence, 2, { pool: SETUP_LINES, thread, used, temp, anchorIdx: 0 });
    const v2 = buildRhymedVerse(inputs, rng, valence, 2, { pool: TURN_LINES, thread, used, temp, anchorIdx: 1 });
    const bridge = buildRhymedVerse(inputs, rng, valence, 1, { pool: REFLECT_LINES, thread, used, temp, anchorIdx: 2 });
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
