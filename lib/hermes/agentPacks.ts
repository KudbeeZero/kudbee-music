// Agent Packs — genre/culture-flavored Council voices, the second consumer of the
// guestVoices plug-in point (alongside Guest Judges). Where a Guest Judge is a
// persona, a pack is a genre/scene lens — same underlying CouncilVoice mechanism,
// packaged and labeled differently. Same rules as Guest Judges: pure, deterministic,
// grounded in real lexicon/craft data, never invented randomness, never a network call.
import type { CouncilVoice, CouncilVoiceContext } from './council';
import { tokenize } from './text';
import { wordInfo } from './lexicon';
import { clamp0to100, lengthFit } from './guestJudges';

function traditionalistScore(ctx: CouncilVoiceContext): number {
  const words = tokenize(ctx.hook.text);
  if (!words.length) return 50;
  let hits = 0;
  let matches = 0;
  for (const w of words) {
    const info = wordInfo(w);
    if (info) {
      hits++;
      if (info.i === 'street' || info.i === 'time') matches++;
    }
  }
  const imageryScore = hits ? (matches / hits) * 100 : 50;
  const length = lengthFit(words.length, 8, 10);
  return clamp0to100(imageryScore * 0.6 + length * 0.4);
}

function popRadioScore(ctx: CouncilVoiceContext): number {
  const words = tokenize(ctx.hook.text);
  if (!words.length) return 50;
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  const maxRepeat = Math.max(...counts.values());
  const repetition = Math.min(100, (maxRepeat - 1) * 50);
  const brevity = Math.max(0, 100 - words.length * 8);
  return clamp0to100(repetition * 0.5 + brevity * 0.5);
}

function poetrySlamScore(ctx: CouncilVoiceContext): number {
  const words = tokenize(ctx.hook.text);
  if (!words.length) return 50;
  const tags = new Set<string>();
  let hits = 0;
  for (const w of words) {
    const info = wordInfo(w);
    if (info) {
      hits++;
      tags.add(info.i);
    }
  }
  const density = (hits / words.length) * 100;
  const diversity = Math.min(100, tags.size * 25);
  return clamp0to100(density * 0.5 + diversity * 0.5);
}

export interface AgentPack {
  id: string;
  label: string;
  emoji: string;
  description: string;
  voice: CouncilVoice;
}

export const AGENT_PACKS: AgentPack[] = [
  {
    id: 'boom-bap-traditionalist',
    label: 'Boom-Bap Traditionalist',
    emoji: '🥁',
    description: 'Old-school ear — rewards gritty street/time imagery over polish.',
    voice: { id: 'boom-bap-traditionalist', label: 'Boom-Bap Traditionalist', weight: 30, score: traditionalistScore },
  },
  {
    id: 'pop-radio',
    label: 'Pop Radio',
    emoji: '📻',
    description: 'Wants it stuck in your head — rewards short, repeatable phrasing.',
    voice: { id: 'pop-radio', label: 'Pop Radio', weight: 30, score: popRadioScore },
  },
  {
    id: 'poetry-slam',
    label: 'Poetry Slam',
    emoji: '🎤',
    description: 'Wants density and craft — rewards richer imagery variety over brevity.',
    voice: { id: 'poetry-slam', label: 'Poetry Slam', weight: 30, score: poetrySlamScore },
  },
];

export function findAgentPack(id: string): AgentPack | undefined {
  return AGENT_PACKS.find((p) => p.id === id);
}
