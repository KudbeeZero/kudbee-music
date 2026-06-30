// HERMES brain — the dominance dial.
//
// Lateralization, honestly modeled: both hemispheres ALWAYS run. `brain` only
// shifts which one *leads* — a bias, not a switch. The right hemisphere is
// generative/divergent (bolder cuts, looser sync, richer grade); the left is
// analytical/convergent (tighter sync, shorter legible holds, calmer grade,
// stricter QA). `balanced` is the neutral default and is byte-identical to the
// pre-dial pipeline, so the flagship render never changes unless you ask it to.
//
// Each preset only presets knobs that ALREADY exist in the pipeline:
//   maxhold/jump  -> studio/build-timeline.mjs cut length + footage jump
//   mingap/lead/lyricLead -> section + lyric timing
//   grade         -> studio/player.html split-tone intensity (via render payload)
//   qa            -> studio/qa.mjs thresholds (sync drift / legibility tolerance)
export const BRAINS = {
  // neutral — matches the original constants exactly (do not change these)
  balanced: { maxhold: 4.6, jump: 90,  mingap: 0.75, lead: 1.0, lyricLead: 0.12, grade: 1.0,  qa: { syncDriftMs: 220, minHoldS: 0.45 } },
  // right-dominant — let it breathe and get bold
  right:    { maxhold: 6.0, jump: 140, mingap: 0.55, lead: 0.7, lyricLead: 0.22, grade: 1.35, qa: { syncDriftMs: 320, minHoldS: 0.35 } },
  // left-dominant — precise, legible, on-spec
  left:     { maxhold: 3.4, jump: 60,  mingap: 1.00, lead: 1.3, lyricLead: 0.06, grade: 0.80, qa: { syncDriftMs: 140, minHoldS: 0.55 } },
};

// Resolve a brain by name (case-insensitive); unknown names fall back to balanced.
export function resolveBrain(name) {
  const key = String(name || 'balanced').toLowerCase();
  const preset = BRAINS[key] || BRAINS.balanced;
  return { name: BRAINS[key] ? key : 'balanced', ...preset };
}
