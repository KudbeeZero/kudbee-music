// Guest Judges — selectable persona voices for the Council, built on the
// guestVoices plug-in point rankHooksByCouncil() gained in the voice-registry
// refactor. Each persona is a pure, deterministic heuristic over the same
// signals the board already computes (no network, no invented randomness) —
// a different lens on real data, not a fake opinion.
import type { CouncilVoice, CouncilVoiceContext } from './council';
import { tokenize } from './text';
import { wordInfo } from './lexicon';

/** Shared by any persona/pack voice scoring a 0..100 result. */
export function clamp0to100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** How close a word count is to a target, falling off linearly outside it. */
export function lengthFit(n: number, target: number, falloffPerWord: number): number {
  if (n === 0) return 0;
  return Math.max(0, 100 - Math.abs(n - target) * falloffPerWord);
}

function arExecScore(ctx: CouncilVoiceContext): number {
  const n = tokenize(ctx.hook.text).length;
  // Radio hooks live in a tight 4-8 word pocket — reward that, blend with the
  // board's own crave-ability (the same craft score reward already computes).
  return clamp0to100(lengthFit(n, 6, 15) * 0.6 + ctx.craft * 0.4);
}

function tiktokScore(ctx: CouncilVoiceContext): number {
  const words = tokenize(ctx.hook.text);
  const brevity = words.length === 0 ? 0 : Math.max(0, 100 - words.length * 10);
  let vivid = 0;
  let hits = 0;
  for (const w of words) {
    const info = wordInfo(w);
    if (info) {
      hits++;
      if (info.i === 'motion' || info.i === 'street' || info.i === 'body') vivid++;
    }
  }
  const vividScore = hits ? (vivid / hits) * 100 : 50;
  return clamp0to100(brevity * 0.5 + vividScore * 0.5);
}

function yourMomScore(ctx: CouncilVoiceContext): number {
  const words = tokenize(ctx.hook.text);
  if (!words.length) return 50;
  let sum = 0;
  let hits = 0;
  for (const w of words) {
    const info = wordInfo(w);
    if (info) {
      hits++;
      sum += info.a;
      if (info.i === 'family' || info.i === 'hope' || info.i === 'light') sum += 0.3;
    }
  }
  if (!hits) return 50;
  return clamp0to100(50 + (sum / hits) * 50);
}

export interface GuestJudge {
  id: string;
  label: string;
  emoji: string;
  description: string;
  voice: CouncilVoice;
}

export const GUEST_JUDGES: GuestJudge[] = [
  {
    id: 'ar-exec',
    label: 'The A&R Exec',
    emoji: '🕴️',
    description: 'Wants a hit single, not a poem — rewards short, punchy, radio-ready hooks.',
    voice: { id: 'ar-exec', label: 'The A&R Exec', weight: 30, score: arExecScore },
  },
  {
    id: 'tiktok',
    label: 'The TikTok Algorithm',
    emoji: '📱',
    description: 'Only has six seconds — rewards brevity and vivid, motion-forward imagery.',
    voice: { id: 'tiktok', label: 'The TikTok Algorithm', weight: 30, score: tiktokScore },
  },
  {
    id: 'your-mom',
    label: 'Your Mom',
    emoji: '👩',
    description: "Doesn't care if it charts — rewards warm, hopeful, family-forward language.",
    voice: { id: 'your-mom', label: 'Your Mom', weight: 30, score: yourMomScore },
  },
];

export function findGuestJudge(id: string): GuestJudge | undefined {
  return GUEST_JUDGES.find((j) => j.id === id);
}
