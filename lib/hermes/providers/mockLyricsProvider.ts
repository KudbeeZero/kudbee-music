// Mock lyrics provider — the "Lyrical Combinator". Builds ORIGINAL hooks and
// verses by combining the user's own theme/mood/voice keywords with grounded
// structural scaffolds. No copyrighted text, no artist mimicry — deterministic
// per input so the same brief reproduces the same draft (good for tests + the
// uniqueness vault).
import type { LyricsProvider } from './providerTypes';
import type { SongInputs, HookOption, SongSection, RhymeSchemeId } from '../types';
import { makeRng, hashString, pick, keywords, titleCase, shuffle, tidyLine, singularizeIfPlural } from '../text';
import { rhymeFamily, type RhymeTemp } from '../rhyme';
import { deriveEmotion } from '../emotion';
import { findOccasionPack } from '../occasionPacks';
import { lineSyllables, syllableFit } from '../meter';

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
// Which imagery cluster(s) each verb's ACTION belongs to — same cluster keys as
// NOUN_BANK. Lets the combinator bias verb choice toward the song's own imagery
// register (verb/noun agreement), the same way nouns already are.
const VERB_CLUSTERS: Record<string, string[]> = {
  climb: ['motion', 'nature'],
  carry: ['struggle', 'motion'],
  build: ['home', 'nature'],
  fight: ['struggle'],
  'hold on': ['struggle', 'memory'],
  'keep moving': ['motion'],
  pray: ['light', 'memory'],
  grind: ['struggle', 'street'],
  crawl: ['struggle', 'motion'],
  rebuild: ['home', 'motion'],
  reach: ['motion', 'light'],
  hustle: ['street', 'struggle'],
  survive: ['struggle'],
  push: ['motion', 'struggle'],
};
// adjectives split by affect — the limbic layer picks the pool that matches the mood
const ADJ_DARK = ['cold', 'quiet', 'heavy', 'restless', 'hollow', 'guarded', 'weathered', 'distant', 'stubborn', 'bitter'];
const ADJ_BRIGHT = ['golden', 'fearless', 'patient', 'steady', 'open', 'grateful', 'relentless', 'grounded', 'bright', 'awake'];
const ADJ_ALL = [...ADJ_DARK, ...ADJ_BRIGHT];
function adjPool(valence: number, banned: Set<string> = new Set()): string[] {
  const base = valence < -0.2 ? ADJ_DARK : valence > 0.2 ? ADJ_BRIGHT : ADJ_ALL;
  const allowed = base.filter((a) => !banned.has(a));
  return allowed.length ? allowed : base; // never starve the pool over an exclusion
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
  // pronouns — never a concrete noun ("through the she"); belt-and-suspenders with
  // text.ts's STOP list (themeNouns already filters these upstream via keywords()).
  'she', 'her', 'hers', 'herself', 'he', 'him', 'his', 'himself',
  'they', 'them', 'their', 'theirs', 'themselves', 'us', 'our', 'ours',
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

/**
 * Concrete nouns drawn from the song's imagery clusters (in relevance order), then the
 * rest. `picked` and `rest` are shuffled SEPARATELY (not the combined array) so a slice
 * off the front stays biased toward the top-ranked cluster(s) — shuffling the whole thing
 * before slicing would dilute the bias evenly across every cluster, on- and off-image alike.
 * `banned` (avoid-words — generic clichés + the artist's remembered exclusions) is
 * filtered out here, at the source, instead of only being flagged after the fact.
 */
function imageryNouns(inputs: SongInputs, rng: () => number, banned: Set<string> = new Set()): string[] {
  const clusters = themeImagery(inputs);
  // Occasion Pack nouns (stocking, mistletoe, diploma…) join the TOP tier, same
  // priority as the song's own highest-scoring imagery cluster — deliberate craft
  // vocabulary beats the generic bank whenever an occasion is set.
  const occasionNouns = findOccasionPack(inputs.occasion)?.nouns.filter((n) => !banned.has(n)) ?? [];
  const picked = [...occasionNouns, ...clusters.flatMap((c) => NOUN_BANK[c] ?? [])].filter((n, i, arr) => !banned.has(n) && arr.indexOf(n) === i);
  const rest = ALL_NOUNS.filter((n) => !picked.includes(n) && !banned.has(n));
  return [...shuffle(picked, rng), ...shuffle(rest, rng)];
}

/** A guaranteed-full noun pool: on-theme words first, then this song's Occasion Pack
 *  vocabulary (if any — present regardless of how rich the theme text already is, not
 *  just as padding), then backfilled from the matching imagery bank. */
function nounPool(inputs: SongInputs, rng: () => number, banned: Set<string> = new Set()): string[] {
  const theme = themeNouns(inputs).filter((n) => !banned.has(n.toLowerCase()));
  const occasion = (findOccasionPack(inputs.occasion)?.nouns ?? []).filter((n) => !banned.has(n) && !theme.includes(n));
  const pool = [...theme, ...occasion];
  if (pool.length < 6) pool.push(...imageryNouns(inputs, rng, banned).filter((n) => !pool.includes(n)).slice(0, 6 - pool.length));
  return pool;
}

/**
 * Verb/noun agreement: verbs biased toward the song's top imagery cluster(s), the
 * same register the noun pool already leans on — a struggle/street brief reaches
 * for "grind"/"hustle" more than a home/nature one reaches for "build"/"climb".
 * Restricts to the on-image subset only when it's wide enough to keep the verse
 * from repeating itself; falls back to the full pool so variety never starves.
 */
export function verbPool(inputs: SongInputs, banned: Set<string> = new Set()): string[] {
  const top = new Set(themeImagery(inputs).slice(0, 2));
  const allowed = VERBS.filter((v) => !banned.has(v));
  const onImage = allowed.filter((v) => VERB_CLUSTERS[v]?.some((c) => top.has(c)));
  return onImage.length >= 4 ? onImage : allowed.length ? allowed : VERBS;
}

/**
 * Image-coherence score (0..1): of the imagery-bank nouns that actually surfaced in
 * `lines`, the fraction belonging to one of the song's scoring cluster(s) — a
 * stronger signal than a theme-keyword mention (eval.ts's "thematic coherence"),
 * because it measures whether the words that landed share the song's visual
 * register instead of scattering into clusters the theme never touched. Uses
 * the SAME cluster set `imageryNouns()` actually draws from (every cluster with
 * a nonzero signal score, not an arbitrary top-N) — scoring against a narrower
 * window than the generator itself uses would flag words the generator considers
 * perfectly on-theme. Vacuously 1 (nothing to fault) when fewer than 3 bank nouns
 * appear — a thin/on-theme brief that barely touched the backfill bank isn't
 * incoherent, and 1-2 words is too small a sample for the ratio to mean anything.
 */
export function imageryCoherence(lines: string[], inputs: SongInputs): number {
  const top = new Set(themeImagery(inputs));
  const clusterOf = new Map<string, string>();
  for (const [cluster, nouns] of Object.entries(NOUN_BANK)) for (const n of nouns) clusterOf.set(n, cluster);
  const words = lines.join(' ').toLowerCase().split(/[^a-z]+/).filter(Boolean);
  const tagged = words.filter((w) => clusterOf.has(w));
  if (tagged.length < 3) return 1;
  const onImage = tagged.filter((w) => top.has(clusterOf.get(w)!));
  return +(onImage.length / tagged.length).toFixed(2);
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

/** True if a frame's own fixed wording contains an avoid-word/phrase (e.g. "no turning
 *  back" is baked into a TURN_LINES template, not a fillable slot — the only way to
 *  keep a banned phrase out of a line is to drop the frame itself from the pool). */
function hasBanned(text: string, banned: Set<string>): boolean {
  if (!banned.size) return false;
  // strip punctuation first — "no turning back, I want..." must still match "no
  // turning back" even though a comma (not a space) follows the phrase.
  const t = ' ' + text.toLowerCase().replace(/[.,!?;:'"()]/g, ' ') + ' ';
  for (const b of banned) if (t.includes(' ' + b + ' ')) return true;
  return false;
}

/** Drops frames whose fixed wording hits an avoid-word/phrase; never starves the pool. */
function filterFrames(pool: string[], banned: Set<string>): string[] {
  const kept = pool.filter((f) => !hasBanned(f, banned));
  return kept.length ? kept : pool;
}

interface VerseOpts {
  pool: string[]; thread: string[]; used: Set<string>; temp: RhymeTemp; anchorIdx: number; banned: Set<string>;
  /** Singability dial (types.ts SongInputs.deliveryPreferences) — undefined means
   *  today's single-draw-per-line behavior, byte-identical (Iron Law #1). */
  syllableTarget?: [number, number];
}

// pick a frame not already used elsewhere in the song (diversity guard), falling
// back to the whole pool once exhausted; records the choice so it isn't reused.
function pickFresh(pool: string[], used: Set<string>, rng: () => number): string {
  const fresh = pool.filter((x) => !used.has(x));
  const choice = pick(fresh.length ? fresh : pool, rng);
  used.add(choice);
  return choice;
}

// Rhyme-scheme layouts (roadmap 5.6, pattern packs): a family id per line position.
// Lines sharing a family id land on rhyming end-words; distinct ids don't rhyme with
// each other. A 4-line verse is the smallest unit where these read as genuinely
// different from sequential couplets — see the RhymeSchemeId doc comment in types.ts.
const SCHEME_LAYOUTS: Record<RhymeSchemeId, number[]> = {
  AABB: [0, 0, 1, 1],
  ABAB: [0, 1, 0, 1],
  ABBA: [0, 1, 1, 0],
  AAAA: [0, 0, 0, 0],
  XAXA: [0, 1, 2, 1], // lines 2 & 4 rhyme (family 1); lines 1 & 3 are free (distinct singleton families)
};
const FALLBACK_RHYME_WORDS = ['road', 'gold', 'light', 'time'];

/** Family id per line for a given scheme + line count. A 2-line unit (e.g. the
 *  Bridge) is always a single rhymed couplet — a scheme needs ≥4 lines to differ
 *  from AABB. Any other length falls back to sequential couplet pairing. */
function layoutFor(scheme: RhymeSchemeId, lineCount: number): number[] {
  if (lineCount === 2) return [0, 0];
  if (lineCount === 4) return SCHEME_LAYOUTS[scheme];
  return Array.from({ length: lineCount }, (_, i) => Math.floor(i / 2));
}

// Build a rhymed verse toward a section goal: `lineCount` lines arranged per the
// chosen rhyme scheme (default AABB — sequential couplets, the original combinator
// behavior). Threads a theme word through the first line of every pair so sections
// stay about the same thing. Deterministic per rng.
function buildRhymedVerse(
  inputs: SongInputs, rng: () => number, valence: number, lineCount: number, opts: VerseOpts,
  scheme: RhymeSchemeId = 'AABB',
): string[] {
  const { pool, thread, used, temp, anchorIdx, banned, syllableTarget } = opts;
  const layout = layoutFor(scheme, lineCount);

  // One rhyme-family draw per distinct family id, sized to how many lines share it —
  // so AAAA draws one 4-word family, XAXA draws a 2-word family plus two singletons.
  const wordQueues = new Map<number, string[]>();
  for (const fid of [...new Set(layout)]) {
    const count = layout.filter((x) => x === fid).length;
    const words = rhymeFamily(rng, valence, count, temp, banned).map((e) => e.w);
    while (words.length < count) words.push(FALLBACK_RHYME_WORDS[words.length % FALLBACK_RHYME_WORDS.length]);
    wordQueues.set(fid, words);
  }

  const lines: string[] = [];
  let prevFrame = '';
  for (let i = 0; i < lineCount; i++) {
    const word = wordQueues.get(layout[i])!.shift() ?? FALLBACK_RHYME_WORDS[i % FALLBACK_RHYME_WORDS.length];
    // Excluding prevFrame must never EMPTY the pool: when banned words shrink a
    // section's pool to a single frame, repeating it (different slot words) beats
    // pick(<empty>) returning undefined and crashing — reachable from the public
    // doNotUse field (audit follow-up).
    const framePool = prevFrame && pool.length > 1 ? pool.filter((x) => x !== prevFrame) : pool;
    // anchor threading: only the first line of every 2-line unit carries the theme anchor
    const anchor = thread.length && i % 2 === 0 ? thread[(anchorIdx + Math.floor(i / 2)) % thread.length] : '';
    let t: string;
    let lineText: string;
    if (syllableTarget) {
      // Singability dial: score up to 3 deterministic candidate frames (fresh-first,
      // same preference pickFresh uses) and keep the closest syllable-count fit —
      // MCFlow's "speed" dial, scoped to line length only (see lib/hermes/meter.ts).
      // A separate code path, only reachable when the dial is set, so today's
      // single-draw behavior with the dial unset stays byte-identical (Iron Law #1).
      const shuffled = shuffle(framePool, rng);
      const freshFirst = [...shuffled.filter((x) => !used.has(x)), ...shuffled.filter((x) => used.has(x))];
      const candidates = freshFirst.slice(0, Math.min(3, freshFirst.length));
      let best = { frame: candidates[0], text: '', score: -1 };
      for (const cand of candidates) {
        const filled = capitalize(fill(cand, inputs, rng, word, valence, anchor, banned));
        const score = syllableFit(lineSyllables(filled), syllableTarget);
        if (score > best.score) best = { frame: cand, text: filled, score };
      }
      t = best.frame;
      lineText = best.text;
      used.add(t);
    } else {
      t = pickFresh(framePool, used, rng);
      lineText = capitalize(fill(t, inputs, rng, word, valence, anchor, banned));
    }
    prevFrame = t;
    lines.push(lineText);
  }
  return dedupe(lines);
}

function fill(frame: string, inputs: SongInputs, rng: () => number, rhyme = '', valence = 0, anchor = '', banned: Set<string> = new Set()): string {
  // nouns come from the theme + references (the "what"); mood drives adjectives
  // separately (adjPool), so keeping it out of the noun slots reads more grammatically.
  // Real concrete nouns only (theme words that pass `nounable`, padded from the bank),
  // shuffled + consumed in order so a line never repeats a filler and never slots a
  // verb/adjective ("handed me GROWING") into a noun position.
  const nouns = shuffle(nounPool(inputs, rng, banned), rng);
  const verbs = shuffle(verbPool(inputs, banned), rng);
  const adjs = shuffle(adjPool(valence, banned), rng);   // emotion → diction: adjectives lean with the mood
  let ni = 0, vi = 0, ai = 0;
  // thematic threading: the first noun-type slot uses the section's anchor word (a
  // theme keyword), so the same idea recurs across sections instead of drifting.
  let anchorLeft = anchor ? 1 : 0;
  const nextNoun = () => (anchorLeft-- > 0 ? anchor : nouns[ni++ % nouns.length]);
  // pick a meaningful audience word — skip leading articles ("the lonely" -> "lonely")
  const WHO_STOP = new Set(['the', 'a', 'an', 'my', 'for', 'to', 'of', 'all']);
  const whoTokens = (inputs.audience || '').split(/\s+/).filter(Boolean);
  const who = whoTokens.find((w) => !WHO_STOP.has(w.toLowerCase())) || whoTokens[whoTokens.length - 1] || 'mine';
  // Determiner–noun number agreement, decided at the SLOT (review improvement #1):
  // when the template puts a noun slot right after a singular determiner ("took that
  // {noun}", "all this {noun}"), a plural theme word gets singularized — "took that
  // records" shipped in the flagship demo because nothing owned this. Template context
  // makes it unambiguous (unlike a line-level regex, which would corrupt relative
  // clauses like "the hook that lifts"). Noun consumption order is unchanged, so all
  // other output stays byte-identical.
  const SG_DET = /(\b(?:a|an|this|that|every)\s+)?/.source;
  const agree = (d: string | undefined, w: string) => (d ? d + singularizeIfPlural(w) : w);
  const out = frame
    .replace(new RegExp(SG_DET + '\\{k\\}', 'g'), (_m, d?: string) => (d ?? '') + titleCase(d ? singularizeIfPlural(nextNoun()) : nextNoun()))
    .replace(new RegExp(SG_DET + '\\{noun\\}', 'g'), (_m, d?: string) => agree(d, nextNoun()))
    .replace(/\{verb\}/g, () => verbs[vi++ % verbs.length])
    .replace(/\{adj\}/g, () => adjs[ai++ % adjs.length])
    .replace(/\{who\}/g, () => who)
    .replace(new RegExp(SG_DET + '\\{rhyme\\}', 'g'), (_m, d?: string) => agree(d, rhyme || nouns[ni++ % nouns.length]))
    .replace(new RegExp(SG_DET + '\\{place\\}', 'g'), (_m, d?: string) => agree(d, nextNoun()));
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

  async generateHooks(inputs, count, seed = 0, bannedWords = []) {
    const banned = new Set(bannedWords.map((w) => w.toLowerCase()));
    const rng = makeRng(seedOf(inputs, 'hooks', seed));
    const frames = shuffle(filterFrames(HOOK_FRAMES, banned), rng);
    const out: HookOption[] = [];
    for (let i = 0; i < count && i < frames.length; i++) {
      const text = capitalize(fill(frames[i], inputs, rng, '', 0, '', banned));
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

  async generateSections(inputs, hook, seed = 0, bannedWords = []) {
    const banned = new Set(bannedWords.map((w) => w.toLowerCase()));
    const rng = makeRng(seedOf(inputs, 'verse', seed));
    // the limbic layer sets the emotional valence → rhyme words + adjectives lean with it
    const valence = deriveEmotion(inputs).valence;
    const temp: RhymeTemp = inputs.rhymeTemp ?? 'balanced';
    const scheme: RhymeSchemeId = inputs.rhymeScheme ?? 'AABB';
    // the thread: a few theme words carried across every section so the song develops
    // one idea; the `used` guard stops a frame template repeating WITHIN a section
    // (the pools are disjoint per section type, so it never filters across sections —
    // honest-comment fix, review improvement #3; per-section variety comes from each
    // section having its own goal-specific pool, not from this set).
    // anchor words carried across sections must be real, DISTINCT nouns — on-theme first,
    // padded from the concrete bank so a thin theme (1 usable noun) doesn't repeat it every verse.
    const thread = [...themeNouns(inputs).filter((n) => !banned.has(n.toLowerCase())), ...imageryNouns(inputs, rng, banned)].slice(0, 3);
    const used = new Set<string>();
    const syllableTarget = inputs.deliveryPreferences?.syllableTarget;
    // hierarchical generation: each verse pursues its section goal (setup → turn → reflect)
    const v1 = buildRhymedVerse(inputs, rng, valence, 4, { pool: filterFrames(SETUP_LINES, banned), thread, used, temp, anchorIdx: 0, banned, syllableTarget }, scheme);
    const v2 = buildRhymedVerse(inputs, rng, valence, 4, { pool: filterFrames(TURN_LINES, banned), thread, used, temp, anchorIdx: 1, banned, syllableTarget }, scheme);
    const bridge = buildRhymedVerse(inputs, rng, valence, 2, { pool: filterFrames(REFLECT_LINES, banned), thread, used, temp, anchorIdx: 2, banned, syllableTarget }, scheme);
    const hookLines = [hook.text, hook.text, secondHookLine(inputs, rng, banned), hook.text];
    // Final-chorus lift (review improvement #2): the LAST hook of the arrangement
    // evolves one repeat into a fresh second line — the engine's own uniqueness
    // critique ("hook line repeats 9× — consider varying one word") and the seeded
    // Crossroads question's 'evolve' path, made real. The hook line itself stays the
    // anchor (3 of 4 lines), per the AABA return-to-A convention.
    const finalHookLines = [hook.text, secondHookLine(inputs, rng, banned), hook.text, hook.text];
    // Every Hook section gets its OWN array copy — the shared reference across
    // sections was a latent aliasing hazard (audit finding on #118): one in-place
    // mutation would have silently rewritten every chorus.
    const arrange = (sections: SongSection[]): SongSection[] => {
      const lastHook = sections.reduce((acc, s, i) => (s.label === 'Hook' ? i : acc), -1);
      return sections.map((s, i) =>
        s.label === 'Hook' ? { ...s, lines: i === lastHook ? [...finalHookLines] : [...hookLines] } : s);
    };

    // An Occasion Pack replaces the generic dedication with its own ("Merry
    // Christmas, {who}" / "Happy birthday, {who}") — the one place occasion truly
    // changes the WORDS, not just the imagery pool.
    const introFrame = findOccasionPack(inputs.occasion)?.dedicationFrame ?? '{who}, this one\'s for you';
    const full: SongSection[] = [
      { label: 'Intro', lines: [capitalize(fill(introFrame, inputs, rng, '', 0, '', banned))] },
      { label: 'Hook', lines: hookLines },
      { label: 'Verse 1', lines: v1 },
      { label: 'Hook', lines: hookLines },
      { label: 'Verse 2', lines: v2 },
      { label: 'Bridge', lines: bridge },
      { label: 'Hook', lines: hookLines },
    ];

    switch (inputs.structure) {
      case 'short-form': {
        // A dedicated 2-line unit — always a rhymed couplet, per layoutFor's 2-line
        // rule — instead of slicing the 4-line scheme-arranged verse: under
        // ABAB/ABBA/XAXA the first two lines of v1 belong to DIFFERENT rhyme
        // families, so the sliced "couplet" didn't rhyme. Built lazily inside this
        // case so every other structure's RNG draw order stays byte-identical.
        // Fresh `used` set (audit fix): v1's output is discarded for short-form but
        // had consumed most of SETUP_LINES — sharing its set could starve the pool
        // under banned-word filtering and collapse the couplet to one deduped line.
        const shortV1 = buildRhymedVerse(inputs, rng, valence, 2, { pool: filterFrames(SETUP_LINES, banned), thread, used: new Set<string>(), temp, anchorIdx: 0, banned, syllableTarget }, scheme);
        return arrange([{ label: 'Hook', lines: hookLines }, { label: 'Verse 1', lines: shortV1 }]);
      }
      case 'radio-edit':
        return arrange(full.filter((s) => s.label !== 'Bridge'));
      case 'hook-first':
        return arrange(full);
      case 'verse-first':
        return arrange([{ label: 'Verse 1', lines: v1 }, { label: 'Hook', lines: hookLines }, { label: 'Verse 2', lines: v2 }, { label: 'Hook', lines: hookLines }]);
      case 'full-song':
        // A genuinely longer arrangement, not a hook-first duplicate: rides out on a
        // repeated final hook rather than a single closing one — closer to the AABA
        // craft convention of returning to the A material without new lyrics after the
        // first cycle (see docs/pattern-packs.md). hook-first stays the shorter, single-outro shape.
        return arrange([...full, { label: 'Hook', lines: hookLines }]);
      default:
        return arrange(full);
    }
  },
};

function secondHookLine(inputs: SongInputs, rng: () => number, banned: Set<string> = new Set()): string {
  const frames = filterFrames(['and {who} know I {verb} for it', 'all this {noun}, I earned it slow'], banned);
  return capitalize(fill(pick(frames, rng), inputs, rng, '', 0, '', banned));
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
