// The Council's scoring — the deliberating board doesn't just show benches, it RANKS
// the hook candidates. Each hook is integrated across the three hemispheric voices the
// brain already computes: the left hemisphere's challenges (cognition), the reward
// circuit's crave-ability, and the right hemisphere's own confidence (hook score).
// Pure + deterministic, $0 — the same signals, now load-bearing.
import type { SongInputs, HookOption, SongSection, Deliberation } from './types';
import type { Taste } from './storage';
import { deliberate } from './cognition';
import { craveScore } from './reward';
import { tokenize } from './text';

export interface CouncilRanking {
  hook: HookOption;
  deliberation: Deliberation;   // the left-hemisphere challenges on this hook
  craft: number;                // 0..100 — reward-circuit crave-ability (standalone)
  passed: number;               // 0..3 — challenges survived
  voice?: number;               // 0..100 — fit with the artist's learned taste (only when taste is supplied)
  councilScore: number;         // 0..100 — the integrated verdict
  rank: number;                 // 1-based
}

/** Weights for the three voices (sum = 100). Kept explicit so the ranking is auditable. */
export const COUNCIL_WEIGHTS = { challenge: 45, reward: 35, confidence: 20 } as const;

/** Weights once the artist's learned taste joins as a 4th voice (sum = 100). Only
 *  used once there's real signal to weight (taste.edits > 0) — an artist with zero
 *  edit history has no "voice" yet, so the 3-voice weights stay the baseline. */
export const COUNCIL_WEIGHTS_WITH_VOICE = { challenge: 40, reward: 30, confidence: 15, voice: 15 } as const;

/**
 * How much a hook echoes the artist's learned taste — liked-word hits minus
 * disliked-word hits, normalized around a neutral 50 (no signal either way lands
 * exactly on 50, not 0, so an unweighted-in-either-direction hook doesn't read as
 * "the board hates this"). Same liked/disliked-tally idiom as becomingYou.ts's
 * voiceMirror, scoped to one hook instead of a whole song. Pure.
 */
export function voiceFit(hookText: string, taste: Taste): number {
  const words = tokenize(hookText);
  if (!words.length) return 50;
  let score = 0;
  for (const w of words) {
    if (taste.liked[w]) score += 1;
    if (taste.disliked[w]) score -= 1;
  }
  return Math.round(Math.max(0, Math.min(100, 50 + (score / words.length) * 50)));
}

/** Everything a pluggable guest voice needs to score one hook candidate — the
 *  same signals the built-in challenge/reward/confidence/taste voices already
 *  see, handed to a guest voice instead of being inlined into its own formula. */
export interface CouncilVoiceContext {
  hook: HookOption;
  inputs: SongInputs;
  sections: SongSection[];
  deliberation: Deliberation;
  passed: number;   // 0..3 challenges survived
  craft: number;    // 0..100 crave-ability
  taste?: Taste;
}

/** A pluggable Council voice — "connect another panel/council" made real. `weight`
 *  is relative among other guest voices (see rankHooksByCouncil's blending below);
 *  `score` must return 0..100. This is the extension point the Guest Judges and
 *  Agent Packs features build on. */
export interface CouncilVoice {
  id: string;
  label: string;
  weight: number;
  score: (ctx: CouncilVoiceContext) => number;
}

/** The maximum combined share of the final councilScore guest voices can claim —
 *  the built-in board (challenge/reward/confidence/taste) always keeps at least
 *  half the verdict, no matter how many guests are seated. */
const MAX_GUEST_SHARE = 50;

/**
 * Rank hook candidates the way the Council would: deliberate each, score its crave, and
 * integrate with the hook's own confidence. Deterministic — ties break by challenges
 * survived, then raw hook score, then input order. This is what the board actually
 * decides on, not decoration.
 *
 * `taste` is optional and additive: with no taste (or an artist who hasn't edited
 * anything yet, `taste.edits === 0`), the ranking is byte-identical to before this
 * voice existed — a passed-in Taste with real edit history is what activates the
 * 4th voice and re-normalizes the weights.
 *
 * `guestVoices` is optional and additive the same way: with none supplied, the
 * final rounding collapses back to exactly the built-in-only computation (byte-
 * identical to before guest voices existed). With guests supplied, they claim a
 * capped share of the final score (see MAX_GUEST_SHARE) split proportionally by
 * their own weights — the built-in board's verdict always still counts for most
 * of the score.
 */
export function rankHooksByCouncil(
  hooks: HookOption[],
  inputs: SongInputs,
  sections: SongSection[] = [],
  taste?: Taste,
  guestVoices: CouncilVoice[] = [],
): CouncilRanking[] {
  const useVoice = !!taste && taste.edits > 0;
  const w = useVoice ? COUNCIL_WEIGHTS_WITH_VOICE : COUNCIL_WEIGHTS;
  const guestWeightSum = guestVoices.reduce((sum, v) => sum + v.weight, 0);
  const guestShare = guestWeightSum > 0 ? Math.min(MAX_GUEST_SHARE, guestWeightSum) : 0;
  const builtInShare = 100 - guestShare;
  const scored = hooks.map((hook, i) => {
    const deliberation = deliberate(hook.text, inputs);
    const passed = deliberation.secondThought.filter((c) => c.passes).length;
    const craft = craveScore(hook, sections).score;
    const voice = useVoice ? voiceFit(hook.text, taste!) : undefined;
    const builtInScore =
      (passed / 3) * w.challenge +
      (craft / 100) * w.reward +
      (Math.min(100, Math.max(0, hook.score)) / 100) * w.confidence +
      (useVoice ? (voice! / 100) * (w as typeof COUNCIL_WEIGHTS_WITH_VOICE).voice : 0);
    const ctx: CouncilVoiceContext = { hook, inputs, sections, deliberation, passed, craft, taste };
    const guestScore = guestWeightSum > 0
      ? guestVoices.reduce((sum, v) => sum + (v.score(ctx) / 100) * (v.weight / guestWeightSum) * guestShare, 0)
      : 0;
    const councilScore = Math.round((builtInScore / 100) * builtInShare + guestScore);
    return { hook, deliberation, craft, passed, voice, councilScore, i };
  });
  scored.sort((a, b) =>
    (b.councilScore - a.councilScore) ||
    (b.passed - a.passed) ||
    (b.hook.score - a.hook.score) ||
    (a.i - b.i),
  );
  return scored.map(({ i, ...r }, idx) => ({ ...r, rank: idx + 1 }));
}
