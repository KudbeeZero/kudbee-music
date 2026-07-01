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

// Words that read badly in a NOUN slot ("where the OUT used to be", "handed me
// GROWING") — verbs, auxiliaries, adjectives, adverbs, and bare abstractions. The
// combinator drops these before filling {noun}/{k}/{place} so the line stays grammatical.
const NON_NOUN = new Set([
  // aux / linking / modal / common verbs
  'made', 'make', 'out', 'still', 'got', 'get', 'keep', 'let', 'gone', 'been', 'came',
  'come', 'through', 'about', 'song', 'was', 'were', 'are', 'has', 'had', 'have', 'did',
  'does', 'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must', 'into',
  'onto', 'from', 'over', 'under', 'want', 'need', 'know', 'feel', 'take', 'give',
  'break', 'turn', 'grow', 'build', 'run', 'hold', 'find', 'lose', 'said', 'told',
  // irregular past-tense verbs — no -ed, so the suffix rule misses them ("the BUILT")
  'built', 'kept', 'held', 'found', 'lost', 'gave', 'took', 'went', 'brought', 'bought',
  'caught', 'taught', 'fought', 'sought', 'thought', 'grew', 'drew', 'threw', 'knew',
  'flew', 'stood', 'meant', 'sent', 'spent', 'lent', 'built', 'felt', 'dealt', 'swept',
  // common 3rd-person verbs that look like plural nouns ("grew up on KEEPS/SEES")
  'keeps', 'sees', 'drops', 'makes', 'takes', 'gives', 'goes', 'does', 'says', 'gets',
  'runs', 'feels', 'knows', 'wants', 'needs', 'breaks', 'turns', 'holds', 'finds', 'loses',
  'falls', 'calls', 'tries', 'moves', 'comes', 'leaves', 'lives', 'stays', 'grinds', 'fights',
  // adjectives / adverbs / abstractions that read wrong as a concrete noun
  'supposed', 'beautiful', 'lonely', 'really', 'very', 'just', 'always', 'never',
  'every', 'some', 'more', 'most', 'much', 'many', 'own', 'same', 'another', 'something',
  'nothing', 'everything', 'anything', 'someone', 'anyone', 'everyone',
  'yet', 'fake', 'real', 'free', 'next', 'last', 'first', 'best', 'only', 'even', 'else',
  'enough', 'quite', 'almost', 'else', 'true', 'false', 'whole', 'half', 'sure', 'able',
  // prepositions / conjunctions — never a concrete noun ("started with the ACROSS")
  'across', 'while', 'upon', 'within', 'without', 'between', 'among', 'toward', 'towards',
  'beyond', 'during', 'before', 'after', 'since', 'until', 'unless', 'though', 'although',
  'whether', 'because', 'against', 'around', 'along', 'above', 'below', 'behind', 'beside',
]);

// The few -ing / -ed words that ARE nouns (so the suffix heuristic doesn't reject them).
const NOUN_ING = new Set(['morning', 'evening', 'feeling', 'ceiling', 'blessing', 'offering', 'lightning', 'building', 'crossing', 'longing']);
const NOUN_ED = new Set(['shade', 'blade', 'grade', 'trade', 'creed', 'seed', 'weed', 'bed', 'bread', 'thread', 'road', 'load', 'code']);

// Concrete nouns grouped by IMAGERY CLUSTER. Backfill draws from the cluster(s) that match
// the song's theme/mood first, so a street song pulls street images and a water song pulls
// water images — the noun bank coheres with the subject instead of feeling random. Every
// word is a real, singable noun, so a {noun} slot is never starved into a broken word.
const NOUN_BANK: Record<string, string[]> = {
  street:   ['block', 'corner', 'concrete', 'pavement', 'city', 'alley', 'rooftop', 'curb', 'fence', 'streetlight'],
  home:     ['doorway', 'hallway', 'window', 'kitchen', 'porch', 'table', 'photograph', 'blanket', 'doorstep', 'name'],
  nature:   ['garden', 'seed', 'root', 'thorn', 'branch', 'harvest', 'mountain', 'valley', 'meadow', 'stone'],
  water:    ['harbor', 'current', 'river', 'tide', 'ocean', 'anchor', 'shoreline', 'raindrop', 'wave', 'flood'],
  light:    ['candle', 'ember', 'lantern', 'sunrise', 'horizon', 'skyline', 'spark', 'glow', 'beacon', 'flame'],
  struggle: ['iron', 'chain', 'gravel', 'dust', 'weight', 'hunger', 'bruise', 'ash', 'debt', 'scar'],
  motion:   ['engine', 'ladder', 'bridge', 'railroad', 'highway', 'compass', 'mile', 'staircase', 'runway', 'wheel'],
  memory:   ['record', 'mirror', 'shadow', 'ghost', 'promise', 'letter', 'echo', 'photograph', 'keepsake', 'memory'],
};
const ALL_NOUNS = Object.values(NOUN_BANK).flat();

// Which imagery clusters a theme/mood word points at — cheap keyword→cluster routing.
const IMAGERY_SIGNALS: Record<string, string[]> = {
  street:   ['street', 'block', 'hood', 'city', 'concrete', 'corner', 'trap', 'gang', 'pavement', 'urban'],
  home:     ['home', 'family', 'mother', 'father', 'raised', 'kids', 'house', 'town', 'roots', 'blood'],
  nature:   ['grow', 'garden', 'seed', 'root', 'nature', 'mountain', 'earth', 'bloom', 'harvest', 'wild'],
  water:    ['ocean', 'water', 'sea', 'river', 'tide', 'harbor', 'drown', 'flood', 'rain', 'distance'],
  light:    ['light', 'gold', 'shine', 'sun', 'hope', 'bright', 'dawn', 'fire', 'burn', 'glow'],
  struggle: ['cold', 'pain', 'broke', 'struggle', 'hunger', 'hard', 'fight', 'weight', 'dark', 'lost'],
  motion:   ['road', 'journey', 'run', 'climb', 'drive', 'move', 'chase', 'race', 'far', 'leave'],
  memory:   ['memory', 'past', 'ghost', 'remember', 'gone', 'miss', 'nostalgi', 'used', 'back', 'time'],
};

// The combinator's own action verbs are verbs by definition — never nouns ("the CARRY
// that raised me"). Derived from VERBS so the two lists can't drift.
const VERB_SET = new Set(VERBS.map((v) => v.split(' ')[0]));

/** True if a word can plausibly fill a concrete-noun slot. Heuristic, deterministic, $0. */
export function nounable(w: string): boolean {
  const s = w.toLowerCase();
  if (s.length < 3 || NON_NOUN.has(s) || VERB_SET.has(s)) return false;
  if (/ing$/.test(s) && !NOUN_ING.has(s)) return false;   // gerunds: growing, breaking
  if (/ed$/.test(s) && !NOUN_ED.has(s)) return false;      // participles/adjectives: supposed, handed
  if (/ly$/.test(s)) return false;                          // adverbs: quickly, really
  return true;
}

/** Audience tokens ("my daughter" → {daughter}) — kept OUT of noun slots so a line never
 *  reads "for daughter … through the daughter" (the {who} word doubling as a {noun}). */
function audienceWords(inputs: SongInputs): Set<string> {
  return new Set((inputs.audience || '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2));
}

/** Theme/reference words that pass as concrete nouns, in stable order (on-theme first). */
export function themeNouns(inputs: SongInputs): string[] {
  const audience = audienceWords(inputs);
  return keywords([inputs.theme, inputs.references].join(' '), 12).filter((w) => nounable(w) && !audience.has(w.toLowerCase()));
}

/**
 * The imagery clusters this song evokes, most-relevant first — scored by how many of each
 * cluster's signal words appear in the theme + mood. Deterministic. Falls back to a
 * sensible default blend when nothing matches, so backfill is always coherent, never random.
 */
export function themeImagery(inputs: SongInputs): string[] {
  const hay = ' ' + [inputs.theme, inputs.mood, inputs.references].join(' ').toLowerCase() + ' ';
  const scored = Object.entries(IMAGERY_SIGNALS)
    .map(([cluster, sigs]) => ({ cluster, score: sigs.reduce((n, s) => n + (hay.includes(s) ? 1 : 0), 0) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || a.cluster.localeCompare(b.cluster)); // stable tie-break
  const ranked = scored.map((c) => c.cluster);
  // default blend keeps output grounded when a theme doesn't trip any signal
  return ranked.length ? ranked : ['struggle', 'light', 'motion'];
}

/** Concrete nouns drawn from the song's imagery clusters (in relevance order), then the rest. */
function imageryNouns(inputs: SongInputs): string[] {
  const clusters = themeImagery(inputs);
  const picked = clusters.flatMap((c) => NOUN_BANK[c] ?? []);
  const rest = ALL_NOUNS.filter((n) => !picked.includes(n));
  return [...picked, ...rest];
}

/** A guaranteed-full noun pool: on-theme words first, padded from the matching imagery bank. */
function nounPool(inputs: SongInputs, rng: () => number): string[] {
  const theme = themeNouns(inputs);
  const pool = [...theme];
  if (pool.length < 6) pool.push(...shuffle(imageryNouns(inputs), rng).filter((n) => !pool.includes(n)).slice(0, 6 - pool.length));
  return pool;
}

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
  // Real concrete nouns only (theme words that pass `nounable`, padded from the bank),
  // shuffled + consumed in order so a line never repeats a filler and never slots a
  // verb/adjective ("handed me GROWING") into a noun position.
  const nouns = shuffle(nounPool(inputs, rng), rng);
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
    // anchor words carried across sections must be real, DISTINCT nouns — on-theme first,
    // padded from the concrete bank so a thin theme (1 usable noun) doesn't repeat it every verse.
    const thread = [...themeNouns(inputs), ...shuffle(imageryNouns(inputs), rng)].slice(0, 3);
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
