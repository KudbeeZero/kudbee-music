// The Writers-Room — HERMES's proprietary edge. Instead of one-shotting "AI
// lyrics", the brain walks an artist through the real craft of writing a song,
// one step at a time: it poses the craft question, proposes a few starting
// options WITH REASONS, and lets the artist choose/adapt — recording every
// choice so the brain learns their voice. This is the engine; the UI drives it.
//
// It embodies the belief system (brain/beliefs.json): assistant-not-autopilot,
// craft-over-generation, truth-first, learn-the-voice.
import type { SongInputs, SongPackage } from './types';
import { makeRng, hashString, shuffle, keywords, tidyLine, titleCase } from './text';
import { learnProfile } from './learn';
import { allAvoidWords } from './memory';
import { belief, type Belief } from './beliefs';
import { personaOverlay, type Persona } from './personas';
import { deriveLanguage, languageCoaching } from './language';
import { deriveEmotion, emotionCoaching } from './emotion';
import { divergentAngles } from './defaultMode';

/** One stage of the songwriting craft. */
export interface CraftStep {
  id: string;
  title: string;
  intent: string;     // the craft purpose of this stage
  belief?: string;    // belief id this stage embodies
}

/** The ordered process a real writer moves through. */
export const LYRIC_PROCESS: CraftStep[] = [
  { id: 'concept', title: 'Concept', intent: 'Find the one thing this song is really about.', belief: 'truth-first' },
  { id: 'truth', title: 'The truth', intent: 'Mine the specific, honest detail that makes it yours.', belief: 'truth-first' },
  { id: 'perspective', title: 'Perspective', intent: 'Decide who is speaking and who they are speaking to.', belief: 'craft-over-generation' },
  { id: 'title-metaphor', title: 'Title & metaphor', intent: 'Choose the central image the whole song hangs on.', belief: 'craft-over-generation' },
  { id: 'hook', title: 'Hook', intent: 'Write the repeatable core — and make it escalate, not just repeat.', belief: 'craft-over-generation' },
  { id: 'rhyme-cadence', title: 'Rhyme & cadence', intent: 'Set the rhyme scheme and the delivery pocket.', belief: 'craft-over-generation' },
  { id: 'verse-draft', title: 'Verse draft', intent: 'Build the verse line by line, image by image.', belief: 'craft-over-generation' },
  { id: 'revise', title: 'Revise', intent: 'Cut the cliché, tighten the image, keep only what is true.', belief: 'truth-first' },
  { id: 'arc', title: 'Arc', intent: 'Check the emotional journey: problem → tension → payoff.', belief: 'craft-over-generation' },
];

export function stepById(id: string): CraftStep | undefined {
  return LYRIC_PROCESS.find((s) => s.id === id);
}

/** What the brain knows about this artist, summarized from the vault. */
export interface ArtistContext {
  songCount: number;
  knownVoice: boolean;
  genres: string[];
  moods: string[];
  signatureWords: string[];   // recurring subjects across their catalog
  leansDark: boolean;
  avoid: string[];
  note: string;               // human-readable summary the UI can show
}

/** Derive the artist context from their vault (reuses the learning layer). */
export function artistContext(songs: SongPackage[], extraAvoid: string[] = []): ArtistContext {
  const p = learnProfile(songs);
  const known = p.songCount > 0;
  const note = known
    ? `${p.songCount} song${p.songCount === 1 ? '' : 's'} in — leans ${p.topGenres[0] || 'genre-fluid'}, ` +
      `${p.leansDark ? 'darker' : 'brighter'} moods, signatures: ${p.themeKeywords.slice(0, 4).join(', ') || '—'}.`
    : 'New artist — the brain has nothing to learn from yet. This first song starts the voice.';
  return {
    songCount: p.songCount,
    knownVoice: known,
    genres: p.topGenres,
    moods: p.topMoods,
    signatureWords: p.themeKeywords,
    leansDark: p.leansDark,
    avoid: allAvoidWords(extraAvoid),
    note,
  };
}

/** A starting point the brain proposes — never a finished answer, always a why. */
export interface CraftOption {
  text: string;
  why: string;
}

/** Everything the writers-room shows for one step. */
export interface StepGuidance {
  step: CraftStep;
  belief?: Belief;
  prompt: string;        // the craft question, contextualized to this song + artist
  coaching: string;      // a one-line nudge
  options: CraftOption[]; // 3 starting points to pick/adapt — assistant, not autopilot
}

// Per-step craft logic. Each returns coaching + option seeds (templated against
// the song idea + what the brain knows about the artist). Deterministic per seed.
type Maker = (kw: string[], ctx: ArtistContext, inputs: SongInputs, rng: () => number) => { prompt: string; coaching: string; options: CraftOption[] };

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const k = (kw: string[], i: number, fallback: string) => kw[i] || fallback;

const MAKERS: Record<string, Maker> = {
  concept: (kw, ctx, inputs) => ({
    prompt: `What is "${inputs.title || 'this song'}" really about — in one sentence, no genre words?`,
    coaching: 'A song is about one thing. Name it before you write a line.',
    options: [
      { text: `One scene where ${k(kw, 0, 'the struggle')} and ${k(kw, 1, 'the hope')} collide`, why: 'A single scene beats a summary — it gives the listener something to see.' },
      { text: `The cost of ${k(kw, 0, 'the come-up')}, told without flinching`, why: 'Truth-first: name the price, not just the win.' },
      { text: `${cap(k(kw, 1, 'loyalty'))} as the through-line under every verse`, why: 'A spine keeps the song from wandering into a list.' },
    ],
  }),
  truth: (kw, ctx, inputs) => ({
    prompt: `What is the one detail about ${k(kw, 0, 'this')} that only you would know?`,
    coaching: 'Specific beats universal. The small true detail is what makes it yours, not anyone\'s.',
    options: [
      { text: `A object or place tied to ${k(kw, 0, 'it')} — name it exactly`, why: 'Concrete nouns carry more weight than feelings stated outright.' },
      { text: `The moment it changed — the before and the after`, why: 'A turn gives the verse a reason to move.' },
      { text: `What you'd never say out loud about ${k(kw, 1, 'this')}`, why: 'The risky line is usually the honest one.' },
    ],
  }),
  perspective: (kw, ctx, inputs) => ({
    prompt: `Who is speaking, and who are they speaking to?`,
    coaching: `You voiced this ${inputs.voice || 'as yourself'}${inputs.audience ? ` for ${inputs.audience}` : ''} — hold that POV all the way through.`,
    options: [
      { text: `First person, addressing ${inputs.audience || 'one person'} directly`, why: '"You" makes it intimate and keeps every line accountable.' },
      { text: `First person, talking to your past self`, why: 'A built-in arc: who you were vs who you are.' },
      { text: `Narrator watching it happen`, why: 'Distance lets you show the scene without explaining it.' },
    ],
  }),
  'title-metaphor': (kw, ctx, inputs) => ({
    prompt: `What single image does the whole song hang on?`,
    coaching: 'One central metaphor, returned to in the hook, beats five mixed ones.',
    options: [
      { text: `"${inputs.title || cap(k(kw, 0, 'Gold'))}" as a thing you can hold, weigh, lose`, why: 'A physical image you can act on in every verse.' },
      { text: `Turn ${k(kw, 0, 'the struggle')} into the title image itself`, why: 'The hook and the title reinforce each other.' },
      { text: `A contrast title — two opposite words pressed together`, why: 'Tension in the title promises tension in the song.' },
    ],
  }),
  hook: (kw, ctx, inputs) => ({
    prompt: `Write the hook — the line that repeats. Then change ONE word on its last return.`,
    coaching: 'A great hook escalates. Same shape, one word evolves, so the third time hits different.',
    options: [
      { text: `Short declaration about ${k(kw, 0, 'it')} (≤8 words), punchy`, why: 'Short hooks are the ones people chant back.' },
      { text: `A promise: "every ___ a ___ that I ___"`, why: 'A repeatable frame you can mutate on the last pass.' },
      { text: `Name the stakes in the hook, not the verse`, why: 'The chorus is the thesis — put the heart there.' },
    ],
  }),
  'rhyme-cadence': (kw, ctx, inputs) => ({
    prompt: `Pick a rhyme scheme and a pocket for the verse.`,
    coaching: `Tempo ${inputs.tempoMin}–${inputs.tempoMax} BPM — lock the cadence to the beat, not the page.`,
    options: [
      { text: `AABB couplets, end-rhymed — straightforward and strong`, why: 'Clear payoff every two lines; easy to follow on first listen.' },
      { text: `Internal rhyme mid-line, looser ends`, why: 'Internal rhyme keeps energy up without sing-song endings.' },
      { text: `Multisyllabic chains on the punchlines only`, why: 'Save the complex rhymes for the lines you want remembered.' },
    ],
  }),
  'verse-draft': (kw, ctx, inputs) => ({
    prompt: `Draft the first four lines — image, image, turn, land.`,
    coaching: 'Open on a picture, not a thesis. Earn the abstract line by line three.',
    options: [
      { text: `Line 1: a concrete image of ${k(kw, 0, 'the scene')}`, why: 'Ground the listener before you ask them to feel anything.' },
      { text: `Line 3: the turn — "but", "now", "still"`, why: 'A pivot word signals the emotional move and reads as honest.' },
      { text: `Line 4: land on the hook\'s idea in new words`, why: 'Set up the chorus so it feels inevitable, not bolted on.' },
    ],
  }),
  revise: (kw, ctx, inputs) => ({
    prompt: `Read it back. What is the most clichéd line — and what is the truest?`,
    coaching: ctx.avoid.length ? `Watch your avoid-list (${ctx.avoid.slice(0, 4).join(', ')}…) — warn, never block.` : 'Cut one cliché, keep one risk.',
    options: [
      { text: `Swap the most generic noun for the specific one from step 2`, why: 'Specific detail is the single biggest lift in a revision.' },
      { text: `Delete any line that only restates the line before`, why: 'Repetition without escalation is dead weight.' },
      { text: `Keep the line that scared you to write`, why: 'Truth-first: the uncomfortable line is usually the best one.' },
    ],
  }),
  arc: (kw, ctx, inputs) => ({
    prompt: `Trace the journey: where is the problem, the tension, the payoff?`,
    coaching: 'If the bridge says what the first verse already said, you have no arc — you have a loop.',
    options: [
      { text: `Verse 1 = problem, Verse 2 = tension, Bridge = payoff`, why: 'A clean three-act shape the listener feels even if they can\'t name it.' },
      { text: `Make the bridge the one moment the hook flips meaning`, why: 'Re-contextualizing the hook is the most satisfying turn in a song.' },
      { text: `End on the image from the title, changed by the journey`, why: 'Closing the loop on the central metaphor lands the whole song.' },
    ],
  }),
};

/**
 * Guide one step of the writers-room. Deterministic per seed, so the same idea
 * gives a stable starting point (pass a fresh seed for a different angle). The
 * options are starting points to pick/adapt — never finished answers.
 */
export function guideStep(
  stepId: string,
  ctx: { inputs: SongInputs; artist: ArtistContext; seed?: number; persona?: Persona },
): StepGuidance {
  const step = stepById(stepId);
  if (!step) throw new Error(`unknown step: ${stepId}`);
  const kw = keywords([ctx.inputs.theme, ctx.inputs.references].join(' '), 8);
  const seed = (ctx.seed ?? 0) ^ hashString(stepId + '|' + (ctx.inputs.title || ''));
  const rng = makeRng(seed >>> 0);
  const made = MAKERS[stepId](kw, ctx.artist, ctx.inputs, rng);

  // tidy; options stay in a stable-but-seed-varied order
  let options = shuffle(made.options, rng).map((o) => ({ text: tidyLine(o.text), why: o.why }));
  let coaching = made.coaching;

  // a chosen persona "wears" its craft-DNA into the step (no names, just craft)
  if (ctx.persona) {
    const overlay = personaOverlay(ctx.persona, stepId, ctx.inputs);
    coaching = overlay.coaching;
    if (overlay.option) options = [overlay.option, ...options].slice(0, 3);
  }

  // the Language & Culture area shapes the actual words on the truth/draft steps
  if (stepId === 'truth' || stepId === 'verse-draft') {
    coaching = `${coaching} ${languageCoaching(deriveLanguage(ctx.inputs))}`;
  }
  // the Limbic layer shapes the feeling on the concept + arc steps
  if (stepId === 'concept' || stepId === 'arc') {
    coaching = `${coaching} ${emotionCoaching(deriveEmotion(ctx.inputs))}`;
  }
  // the Default-Mode Network offers a divergent angle on the concept step
  if (stepId === 'concept') {
    const a = divergentAngles(ctx.inputs, 1, ctx.seed ?? 0)[0];
    if (a) options = [{ text: a.angle, why: `Default-Mode: ${a.why}` }, ...options].slice(0, 3);
  }

  return { step, belief: step.belief ? belief(step.belief) : undefined, prompt: made.prompt, coaching, options };
}

/** Progress helper: the next step after the given id (or the first). */
export function nextStep(currentId?: string): CraftStep | undefined {
  if (!currentId) return LYRIC_PROCESS[0];
  const i = LYRIC_PROCESS.findIndex((s) => s.id === currentId);
  return i >= 0 ? LYRIC_PROCESS[i + 1] : undefined;
}

/**
 * Turn a choice into voice signals. Words the artist keeps are 'their voice';
 * the brain learns them (the UI feeds these to storage.recordTaste). Returns the
 * content words in what they chose vs the options they passed on.
 */
export function choiceSignals(chosen: string, passedOver: string[]): { kept: string[]; dropped: string[] } {
  const kept = keywords(chosen, 6);
  const passedKw = new Set(passedOver.flatMap((t) => keywords(t, 6)));
  const keptSet = new Set(kept);
  const dropped = [...passedKw].filter((w) => !keptSet.has(w));
  return { kept, dropped };
}

export { titleCase };
