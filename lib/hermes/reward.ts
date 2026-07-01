// The reward / dopamine circuit — the brain's drive system. It scores a hook's
// "crave-ability": the compulsion to hear it again. Neuroscience ties musical reward
// to prediction + payoff (the ventral striatum lights up on the resolve of an
// expectation), so we reward: a hook that RETURNS, that MUTATES on a later return
// (surprise inside the familiar), that's short enough to chant, and that's singable
// (open vowel sounds). Local + deterministic.
import type { HookOption, SongSection } from './types';

export interface Crave {
  score: number; // 0..100
  factors: { returns: number; mutation: number; brevity: number; singability: number };
  note: string;
}

const OPEN_VOWELS = /[aeiou]/gi;

/** How singable a line is: vowel-openness + ends on an open/long sound. */
function singability(text: string): number {
  const letters = text.replace(/[^a-z]/gi, '');
  if (!letters) return 0;
  const vowelRatio = (text.match(OPEN_VOWELS)?.length ?? 0) / letters.length;
  const endsOpen = /[aeiouy]\b|[aeiou][a-z]?\b/i.test(text.trim()) ? 1 : 0.6;
  return Math.max(0, Math.min(1, vowelRatio * 1.6)) * 0.7 + endsOpen * 0.3;
}

/** Score how much a listener will crave the hook again. */
export function craveScore(hook: HookOption | null, sections: SongSection[]): Crave {
  if (!hook) return { score: 0, factors: { returns: 0, mutation: 0, brevity: 0, singability: 0 }, note: 'No hook to reward.' };

  const hookSections = sections.filter((s) => /hook|chorus/i.test(s.label));
  const returnCount = hookSections.length;
  const returns = Math.min(1, returnCount / 3); // ~3 returns is the sweet spot

  // mutation: within the hook's lines, is there variation (not pure copy-paste)?
  const hookLines = hookSections[0]?.lines ?? [hook.text];
  const distinct = new Set(hookLines.map((l) => l.toLowerCase())).size;
  const mutation = hookLines.length > 1 ? Math.min(1, (distinct - 1) / 2) : 0;

  const words = hook.text.split(/\s+/).length;
  const brevity = words <= 6 ? 1 : words <= 9 ? 0.75 : words <= 12 ? 0.5 : 0.3;

  const sing = singability(hook.text);

  const score = Math.round((returns * 0.3 + mutation * 0.25 + brevity * 0.25 + sing * 0.2) * 100);
  const note =
    score >= 75 ? 'Compulsive — you\'ll want it again.' :
    score >= 55 ? 'Catchy; a mutated return would push it higher.' :
    'Low pull — shorten it, make it return, or land on an open vowel.';
  return { score, factors: { returns: +returns.toFixed(2), mutation: +mutation.toFixed(2), brevity, singability: +sing.toFixed(2) }, note };
}
