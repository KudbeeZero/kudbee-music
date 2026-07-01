// Banger score — 7 weighted categories summing to 100. Deterministic: derived
// from concrete signals (hook stats, uniqueness, structure) so it's testable.
import type {
  BangerScore, HookOption, UniquenessReport, VisualPackage, ViralClip,
  SongInputs, SongSection,
} from './types';
import { hasInternalRhyme, rhymeDensity } from './rhyme';
import { keywords } from './text';

export interface ScoreInputs {
  inputs: SongInputs;
  chosenHook: HookOption | null;
  sections: SongSection[];
  uniqueness: UniquenessReport;
  visuals: VisualPackage;
  viralClips: ViralClip[];
  emotionClarity: number; // 0–1 from Emotion Scanner
}

const clampTo = (v: number, max: number) => Math.max(0, Math.min(max, Math.round(v)));

export function scoreSong(s: ScoreInputs): BangerScore {
  const hook = s.chosenHook;
  const lineCount = s.sections.reduce((a, b) => a + b.lines.length, 0);

  // hook strength 0–20: HONEST signals, not length + RNG — brevity, whether the
  // hook actually references the theme, and whether it carries internal rhyme.
  const hookText = hook?.text ?? '';
  const hookLen = hook ? hookText.split(/\s+/).length : 0;
  const brevity = hook ? (hookLen <= 8 ? 1 : hookLen <= 12 ? 0.7 : 0.4) : 0;
  const themeKw = keywords(s.inputs.theme, 8);
  const refsTheme = hook && themeKw.some((k) => hookText.toLowerCase().includes(k)) ? 1 : 0;
  const internalRhyme = hook && hasInternalRhyme(hookText) ? 1 : 0;
  const hookStrength = clampTo(brevity * 6 + refsTheme * 5 + internalRhyme * 5 + (hook ? 4 : 0), 20);

  // emotional clarity 0–20
  const emotionalClarity = clampTo(s.emotionClarity * 20, 20);

  // originality 0–20 from the uniqueness score
  const originality = clampTo((s.uniqueness.score / 100) * 20, 20);

  // replay value 0–15: structural variety + tightness + how much the lyrics rhyme
  const distinctSections = new Set(s.sections.map((x) => x.label.replace(/\s*\d+$/, ''))).size;
  const variety = Math.min(1, distinctSections / 5);
  const tightness = lineCount >= 8 && lineCount <= 40 ? 1 : 0.6;
  const rhyme = rhymeDensity(s.sections.flatMap((x) => x.lines));
  const replayValue = clampTo((brevity * 0.35 + variety * 0.25 + tightness * 0.15 + rhyme * 0.25) * 15, 15);

  // visual identity 0–10
  const hasVisuals = s.visuals.albumCoverPrompt && s.visuals.musicVideoPrompt ? 1 : 0.4;
  const sceneDepth = Math.min(1, s.visuals.sceneIdeas.length / 4);
  const visualIdentity = clampTo((hasVisuals * 0.6 + sceneDepth * 0.4) * 10, 10);

  // short-form potential 0–10
  const shortFormPotential = clampTo(Math.min(1, s.viralClips.length / 3) * 10, 10);

  // release readiness 0–5: penalize banned/too-similar, reward complete metadata
  const blockers =
    s.uniqueness.flags.filter((f) => f.kind === 'too-similar').length * 1.5 +
    s.uniqueness.bannedWordsHit.length * 0.25;
  const metaComplete = s.inputs.title && s.inputs.genre && s.inputs.audience ? 1 : 0.5;
  const releaseReadiness = clampTo(Math.max(0, 5 * metaComplete - blockers), 5);

  const total =
    hookStrength + emotionalClarity + originality + replayValue +
    visualIdentity + shortFormPotential + releaseReadiness;

  return {
    hookStrength, emotionalClarity, originality, replayValue,
    visualIdentity, shortFormPotential, releaseReadiness,
    total,
    verdict: verdictFor(total),
  };
}

function verdictFor(total: number): string {
  if (total >= 85) return 'Certified banger — ship it.';
  if (total >= 70) return 'Strong record. Tighten the weak category and it sings.';
  if (total >= 55) return 'Promising. Needs a sharper hook or cleaner emotion.';
  if (total >= 40) return 'Demo energy. Rework the hook and originality.';
  return 'Back to the lab — concept needs a stronger center.';
}
