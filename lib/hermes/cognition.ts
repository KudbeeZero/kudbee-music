// Dual-process cognition — the "assistant, not autopilot" loop made explicit.
// First thought (System 1, right hemisphere): the fast generative proposal.
// Second thought (System 2, left hemisphere): reflective critique — is it true?
// original? does it earn it? — using the SAME real checks the brain already runs.
// Decision (integration, corpus callosum): keep or revise. Deterministic, local, $0.
import type { SongInputs } from './types';
import { keywords } from './text';
import { isClear } from './safety';
import { hasInternalRhyme } from './rhyme';

export interface Critique {
  question: string;
  passes: boolean;
  note: string;
}

export interface Deliberation {
  firstThought: string;    // the fast, generative proposal (right hemisphere)
  secondThought: Critique[]; // the reflective challenges (left hemisphere)
  verdict: 'keep' | 'revise';
  decision: string;        // the integrated call (the artist gets the final say)
  confidence: number;      // 0..1 — share of challenges the proposal survives
}

/**
 * Run a proposal through first-thought → second-thought → decision. The critiques
 * are real signals (theme reference, famous-phrase safety, craft), not theater, so
 * the verdict actually means something.
 */
export function deliberate(proposal: string, inputs: SongInputs): Deliberation {
  const text = (proposal ?? '').trim();
  const themeKw = keywords([inputs.theme, inputs.references].join(' '));
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);

  const isTrue = themeKw.some((k) => text.toLowerCase().includes(k));
  const isOriginal = isClear(text);
  // "earns it" — carries craft: some length + internal rhyme or a concrete image
  const earnsIt = words.length >= 4 && (hasInternalRhyme(text) || themeKw.some((k) => text.toLowerCase().includes(k)));

  const secondThought: Critique[] = [
    { question: 'Is it true to the brief?', passes: isTrue, note: isTrue ? 'references the theme' : 'feels generic — tie it to the story' },
    { question: 'Is it original?', passes: isOriginal, note: isOriginal ? 'no famous-phrase echo' : 'echoes a known line — change it' },
    { question: 'Does it earn it?', passes: earnsIt, note: earnsIt ? 'carries craft (image/rhyme)' : 'thin — add an image or a rhyme' },
  ];

  const passed = secondThought.filter((c) => c.passes).length;
  const confidence = +(passed / secondThought.length).toFixed(2);
  const verdict: 'keep' | 'revise' = passed >= 2 ? 'keep' : 'revise';
  const decision = verdict === 'keep'
    ? `Keep it — survives ${passed}/3 challenges. Yours to accept or push further.`
    : `Revise — only ${passed}/3 hold up. ${secondThought.find((c) => !c.passes)?.note ?? ''}`.trim();

  return { firstThought: text, secondThought, verdict, decision, confidence };
}
