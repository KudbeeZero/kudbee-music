import { describe, it, expect } from 'vitest';
import { scoreSong } from '../scoring';
import type { ScoreInputs } from '../scoring';
import type { SongInputs } from '../types';

const baseInputs: SongInputs = {
  title: 'For You', theme: 'a song for my daughter, street but emotional',
  mood: 'emotional', genre: '808 trap', tempoMin: 130, tempoMax: 150,
  voice: 'me', audience: 'my daughter', doNotUse: [], references: '', structure: 'hook-first',
};

function build(over: Partial<ScoreInputs> = {}): ScoreInputs {
  return {
    inputs: baseInputs,
    chosenHook: { text: 'tell my daughter I made it out', angle: 'declaration', cadence: 'punchy', score: 80 },
    sections: [
      { label: 'Hook', lines: ['a', 'b', 'c', 'd'] },
      { label: 'Verse 1', lines: ['e', 'f', 'g', 'h'] },
      { label: 'Bridge', lines: ['i', 'j'] },
    ],
    uniqueness: { score: 90, flags: [], fingerprints: [], bannedWordsHit: [], rewriteSuggestions: [] },
    visuals: { albumCoverPrompt: 'cover', musicVideoPrompt: 'video', sceneIdeas: ['a', 'b', 'c', 'd'], shortFormClipIdeas: [] },
    viralClips: [
      { label: 'a', startHint: '', durationSec: 15, caption: '', hookLine: '' },
      { label: 'b', startHint: '', durationSec: 12, caption: '', hookLine: '' },
      { label: 'c', startHint: '', durationSec: 18, caption: '', hookLine: '' },
    ],
    emotionClarity: 0.9,
    ...over,
  };
}

describe('banger score', () => {
  it('totals exactly the sum of its categories', () => {
    const s = scoreSong(build());
    const sum =
      s.hookStrength + s.emotionalClarity + s.originality + s.replayValue +
      s.visualIdentity + s.shortFormPotential + s.releaseReadiness;
    expect(s.total).toBe(sum);
  });

  it('stays within 0–100 and respects category caps', () => {
    const s = scoreSong(build());
    expect(s.total).toBeGreaterThanOrEqual(0);
    expect(s.total).toBeLessThanOrEqual(100);
    expect(s.hookStrength).toBeLessThanOrEqual(20);
    expect(s.emotionalClarity).toBeLessThanOrEqual(20);
    expect(s.originality).toBeLessThanOrEqual(20);
    expect(s.replayValue).toBeLessThanOrEqual(15);
    expect(s.visualIdentity).toBeLessThanOrEqual(10);
    expect(s.shortFormPotential).toBeLessThanOrEqual(10);
    expect(s.releaseReadiness).toBeLessThanOrEqual(5);
  });

  it('penalizes low originality and weak emotion', () => {
    const strong = scoreSong(build());
    const weak = scoreSong(build({
      uniqueness: { score: 20, flags: [{ kind: 'too-similar', detail: 'x' }], fingerprints: [], bannedWordsHit: [], rewriteSuggestions: [] },
      emotionClarity: 0.2,
    }));
    expect(weak.total).toBeLessThan(strong.total);
  });
});
