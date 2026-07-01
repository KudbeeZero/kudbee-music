// The Council's scoring — the deliberating board doesn't just show benches, it RANKS
// the hook candidates. Each hook is integrated across the three hemispheric voices the
// brain already computes: the left hemisphere's challenges (cognition), the reward
// circuit's crave-ability, and the right hemisphere's own confidence (hook score).
// Pure + deterministic, $0 — the same signals, now load-bearing.
import type { SongInputs, HookOption, SongSection, Deliberation } from './types';
import { deliberate } from './cognition';
import { craveScore } from './reward';

export interface CouncilRanking {
  hook: HookOption;
  deliberation: Deliberation;   // the left-hemisphere challenges on this hook
  craft: number;                // 0..100 — reward-circuit crave-ability (standalone)
  passed: number;               // 0..3 — challenges survived
  councilScore: number;         // 0..100 — the integrated verdict
  rank: number;                 // 1-based
}

/** Weights for the three voices (sum = 100). Kept explicit so the ranking is auditable. */
export const COUNCIL_WEIGHTS = { challenge: 45, reward: 35, confidence: 20 } as const;

/**
 * Rank hook candidates the way the Council would: deliberate each, score its crave, and
 * integrate with the hook's own confidence. Deterministic — ties break by challenges
 * survived, then raw hook score, then input order. This is what the board actually
 * decides on, not decoration.
 */
export function rankHooksByCouncil(
  hooks: HookOption[],
  inputs: SongInputs,
  sections: SongSection[] = [],
): CouncilRanking[] {
  const scored = hooks.map((hook, i) => {
    const deliberation = deliberate(hook.text, inputs);
    const passed = deliberation.secondThought.filter((c) => c.passes).length;
    const craft = craveScore(hook, sections).score;
    const councilScore = Math.round(
      (passed / 3) * COUNCIL_WEIGHTS.challenge +
      (craft / 100) * COUNCIL_WEIGHTS.reward +
      (Math.min(100, Math.max(0, hook.score)) / 100) * COUNCIL_WEIGHTS.confidence,
    );
    return { hook, deliberation, craft, passed, councilScore, i };
  });
  scored.sort((a, b) =>
    (b.councilScore - a.councilScore) ||
    (b.passed - a.passed) ||
    (b.hook.score - a.hook.score) ||
    (a.i - b.i),
  );
  return scored.map(({ i, ...r }, idx) => ({ ...r, rank: idx + 1 }));
}
