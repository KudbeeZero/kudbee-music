// Dual-process cognition — the "assistant, not autopilot" loop made explicit.
// First thought (System 1, right hemisphere): the fast generative proposal.
// Second thought (System 2, left hemisphere): reflective critique — is it true?
// original? does it earn it? — using the SAME real checks the brain already runs.
// Decision (integration, corpus callosum): keep or revise. Deterministic, local, $0.
import type { SongInputs, HookOption, Critique, Deliberation, CritiqueKey } from './types';
import { keywords } from './text';
import { isClear } from './safety';
import { hasInternalRhyme } from './rhyme';

// Types live in types.ts so the SongPackage can carry a Deliberation without an import
// cycle. Re-exported here for existing call sites.
export type { Critique, Deliberation, CritiqueKey } from './types';

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
    { key: 'true', question: 'Is it true to the brief?', passes: isTrue, note: isTrue ? 'references the theme' : 'feels generic — tie it to the story' },
    { key: 'original', question: 'Is it original?', passes: isOriginal, note: isOriginal ? 'no famous-phrase echo' : 'echoes a known line — change it' },
    { key: 'earns-it', question: 'Does it earn it?', passes: earnsIt, note: earnsIt ? 'carries craft (image/rhyme)' : 'thin — add an image or a rhyme' },
  ];

  const passed = secondThought.filter((c) => c.passes).length;
  const confidence = +(passed / secondThought.length).toFixed(2);
  const verdict: 'keep' | 'revise' = passed >= 2 ? 'keep' : 'revise';
  const decision = verdict === 'keep'
    ? `Keep it — survives ${passed}/3 challenges. Yours to accept or push further.`
    : `Revise — only ${passed}/3 hold up. ${secondThought.find((c) => !c.passes)?.note ?? ''}`.trim();

  return { firstThought: text, secondThought, verdict, decision, confidence };
}

/**
 * The deliberation to DISPLAY for a hook: reuse the pipeline's stored one only when it
 * actually belongs to this hook (its firstThought is the hook text), otherwise compute a
 * fresh one. Prevents a stale readout after the artist picks a different hook (the stored
 * `cognition` was minted for the auto-chosen hook and doesn't follow a re-pick).
 */
export function deliberationForHook(hookText: string, inputs: SongInputs, stored?: Deliberation | null): Deliberation {
  return stored && stored.firstThought === hookText ? stored : deliberate(hookText, inputs);
}

/**
 * Choose a hook by CLOSING THE COGNITION LOOP — the second thought is load-bearing, not
 * decorative. Each candidate is deliberated; the winner is the one that (1) fixes the most
 * critiques the artist previously flagged (`feedback`), then (2) survives the most
 * challenges, then (3) has the highest raw hook score, with input order as a stable
 * final tiebreak. Deterministic. When `feedback` is empty this simply prefers the
 * best-reasoned hook among the top options — so cognition actually changes what ships.
 */
export function selectHookByCognition(
  candidates: HookOption[],
  inputs: SongInputs,
  feedback: CritiqueKey[] = [],
): { chosen: HookOption | null; deliberation: Deliberation | null } {
  if (!candidates.length) return { chosen: null, deliberation: null };
  const fb = new Set(feedback);
  const scored = candidates.map((h, i) => {
    const d = deliberate(h.text, inputs);
    const passed = d.secondThought.filter((c) => c.passes).length;
    const fixes = fb.size ? d.secondThought.filter((c) => fb.has(c.key) && c.passes).length : 0;
    return { h, d, passed, fixes, i };
  });
  scored.sort((a, b) =>
    (b.fixes - a.fixes) ||       // first: address the critiques the artist flagged
    (b.passed - a.passed) ||     // then: survive the most challenges
    (b.h.score - a.h.score) ||   // then: raw hook score
    (a.i - b.i),                 // stable: original order
  );
  return { chosen: scored[0].h, deliberation: scored[0].d };
}
