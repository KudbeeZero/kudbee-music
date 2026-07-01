// Brain "temperature" — the thermal signature that makes the Brain Scan run hot
// where YOU are as an artist. Pure + deterministic so the visual is driven by testable
// logic, not vibes. Emotional/expressive artists heat the right hemisphere; artists who
// refine and edit heat the left; the more you've made and the more the brain has become
// you, the hotter overall. All $0, from signals the brain already tracks.
import { REGIONS, type RegionId } from './brainMap';

export interface BrainHeatInput {
  songCount: number;       // how much you've made
  edits: number;           // taste.edits — how much you refine (analytical lean)
  emotionIntensity: number; // 0..1 — how intense your material runs (generative lean)
  emotionValence: number;   // -1..1 (unused for temp, kept for future hue tuning)
  becomingYou: number;      // 0..100 — how much the current song is your learned voice
}

export interface BrainHeat {
  regions: Record<RegionId, number>; // per-region temperature 0..1
  overall: number;                    // 0..1 base warmth
  dominance: number;                  // -1 (left/analytical) .. +1 (right/generative)
  label: string;                      // human-readable artist type
}

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

/** Compute the artist's thermal brain signature. */
export function brainHeat(i: BrainHeatInput): BrainHeat {
  const activity = clamp(i.songCount / 8);
  const overall = clamp(0.18 + 0.45 * activity + 0.22 * clamp(i.emotionIntensity) + 0.15 * clamp(i.becomingYou / 100));
  const refine = clamp(i.edits / 12);
  const dominance = clamp(clamp(i.emotionIntensity) - refine, -1, 1);

  const regions = {} as Record<RegionId, number>;
  for (const r of REGIONS) {
    let t = overall;
    if (r.side === 'right') t *= 1 + Math.max(0, dominance) * 0.6;
    else if (r.side === 'left') t *= 1 + Math.max(0, -dominance) * 0.6;
    regions[r.id] = clamp(t);
  }

  const label =
    dominance > 0.2 ? 'Right-brained — generative, emotional'
    : dominance < -0.2 ? 'Left-brained — analytical, precise'
    : 'Balanced — both hemispheres firing';

  return { regions, overall, dominance, label };
}
