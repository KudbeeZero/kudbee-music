// Re-choosing the lead hook, honestly. When the artist picks a different hook from
// the options, the decision has to ripple: the A&R banger score depends on the chosen
// hook, so we recompute it (deterministically, same as the pipeline) rather than leave
// a stale number. Everything else in the package is unchanged, so this is a faithful
// re-score — not a regeneration. Local, $0.
import type { HookOption, SongPackage } from './types';
import { scoreSong } from './scoring';
import { emotionClarity } from './emotion';

/** Return a copy of the package with `hook` set as the lead, and the score rebuilt. */
export function withChosenHook(pkg: SongPackage, hook: HookOption): SongPackage {
  const clarity = emotionClarity(pkg.inputs, pkg.sections);
  const score = scoreSong({
    inputs: pkg.inputs,
    chosenHook: hook,
    sections: pkg.sections,
    uniqueness: pkg.uniqueness,
    visuals: pkg.visuals,
    viralClips: pkg.viralClips,
    emotionClarity: clarity,
  });
  return { ...pkg, chosenHook: hook, score, version: pkg.version + 1 };
}
