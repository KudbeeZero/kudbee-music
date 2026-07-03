import { describe, it, expect } from 'vitest';
import { AGENT_DEFINITIONS } from '../agents';
import { rankHooksByCouncil, voiceFit, COUNCIL_WEIGHTS, COUNCIL_WEIGHTS_WITH_VOICE, type CouncilVoice } from '../council';
import type { SongInputs, HookOption } from '../types';
import type { Taste } from '../storage';

// The Council splits the roster into a right bench (proposes) and a left bench
// (challenges). Guard that both benches are always populated so the board is real.
describe('the Council bench split', () => {
  it('has agents on both hemispheres', () => {
    const right = AGENT_DEFINITIONS.filter((d) => d.hemisphere === 'right');
    const left = AGENT_DEFINITIONS.filter((d) => d.hemisphere === 'left');
    expect(right.length).toBeGreaterThan(0);
    expect(left.length).toBeGreaterThan(0);
    expect(right.length + left.length).toBe(AGENT_DEFINITIONS.length);
  });
});

const inputs: SongInputs = {
  title: 'T', theme: 'building gold out of the cold streets', mood: 'hard, hopeful',
  genre: 'boom-bap', tempoMin: 88, tempoMax: 96, voice: 'gritty', audience: 'the block',
  doNotUse: [], references: '', structure: 'full-song',
};
const hook = (text: string, score: number): HookOption => ({ text, angle: '', cadence: '', score });

describe('rankHooksByCouncil (the board ranks the hooks)', () => {
  it('ranks an on-theme, crafted hook above a thin one — regardless of raw score', () => {
    const hooks = [
      hook('yeah uh ok whatever nah', 99),              // top raw score, thin + off-theme
      hook('the cold streets made the gold in me', 60), // on-theme, survives challenges
    ];
    const ranked = rankHooksByCouncil(hooks, inputs);
    expect(ranked[0].hook.text).toBe('the cold streets made the gold in me');
    expect(ranked[0].rank).toBe(1);
    expect(ranked[0].councilScore).toBeGreaterThan(ranked[1].councilScore);
  });

  it('assigns dense, 1-based ranks and keeps every candidate', () => {
    const hooks = [hook('a b c d', 40), hook('gold streets cold streets', 55), hook('e f g h', 30)];
    const ranked = rankHooksByCouncil(hooks, inputs);
    expect(ranked).toHaveLength(3);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it('scores in [0,100] with the documented weight split', () => {
    expect(COUNCIL_WEIGHTS.challenge + COUNCIL_WEIGHTS.reward + COUNCIL_WEIGHTS.confidence).toBe(100);
    for (const r of rankHooksByCouncil([hook('gold in the cold streets', 70)], inputs)) {
      expect(r.councilScore).toBeGreaterThanOrEqual(0);
      expect(r.councilScore).toBeLessThanOrEqual(100);
    }
  });

  it('is deterministic + stable for equal scores', () => {
    const hooks = [hook('x x x x', 50), hook('y y y y', 50), hook('z z z z', 50)];
    const a = rankHooksByCouncil(hooks, inputs).map((r) => r.hook.text);
    const b = rankHooksByCouncil(hooks, inputs).map((r) => r.hook.text);
    expect(a).toEqual(b);
  });

  it('returns empty for no hooks', () => {
    expect(rankHooksByCouncil([], inputs)).toEqual([]);
  });
});

describe('voiceFit — the artist\'s learned taste, scored per hook (review-plan PR1)', () => {
  const taste = (liked: string[], disliked: string[] = []): Taste => ({
    liked: Object.fromEntries(liked.map((w) => [w, 1])),
    disliked: Object.fromEntries(disliked.map((w) => [w, 1])),
    edits: 1,
  });

  it('neutral 50 when no taste words appear at all', () => {
    expect(voiceFit('some hook with no signal', taste(['gold', 'street']))).toBe(50);
  });

  it('above 50 when liked words appear, below 50 when disliked words appear', () => {
    const liked = voiceFit('the gold street shines', taste(['gold', 'street']));
    const disliked = voiceFit('the gold street shines', taste([], ['gold', 'street']));
    expect(liked).toBeGreaterThan(50);
    expect(disliked).toBeLessThan(50);
  });

  it('handles an empty hook without crashing', () => {
    expect(voiceFit('', taste(['gold']))).toBe(50);
  });

  it('clamps to [0, 100]', () => {
    const allLiked = voiceFit('gold gold gold gold', taste(['gold']));
    const allDisliked = voiceFit('gold gold gold gold', taste([], ['gold']));
    expect(allLiked).toBeLessThanOrEqual(100);
    expect(allDisliked).toBeGreaterThanOrEqual(0);
  });
});

describe('rankHooksByCouncil — taste as a 4th voice (review-plan PR1)', () => {
  const hooks = [
    hook('the cold streets made the gold in me', 60),
    hook('a whole new world of glowing light', 60),
  ];

  it('with no taste argument, ranking is byte-identical to the 3-voice baseline', () => {
    const withoutArg = rankHooksByCouncil(hooks, inputs);
    const withUndefined = rankHooksByCouncil(hooks, inputs, [], undefined);
    expect(withoutArg).toEqual(withUndefined);
    for (const r of withoutArg) expect(r.voice).toBeUndefined();
  });

  it('taste with zero edit history does not activate the 4th voice (no signal yet)', () => {
    const freshTaste: Taste = { liked: { gold: 5 }, disliked: {}, edits: 0 };
    const baseline = rankHooksByCouncil(hooks, inputs);
    const withFreshTaste = rankHooksByCouncil(hooks, inputs, [], freshTaste);
    expect(withFreshTaste).toEqual(baseline);
  });

  it('a real taste (edits > 0) can flip the ranking toward the artist\'s liked words', () => {
    // Both hooks score equally on the 3 baseline voices (same raw score, same
    // 4-word crafted length) — taste is the only thing that can move the needle.
    const learnedTaste: Taste = { liked: { streets: 5, gold: 5, cold: 5 }, disliked: {}, edits: 3 };
    const ranked = rankHooksByCouncil(hooks, inputs, [], learnedTaste);
    expect(ranked[0].hook.text).toBe('the cold streets made the gold in me');
    expect(ranked[0].voice).toBeGreaterThan(ranked[1].voice!);
  });

  it('scores stay in [0,100] and the weights still sum to 100 in both modes', () => {
    expect(COUNCIL_WEIGHTS.challenge + COUNCIL_WEIGHTS.reward + COUNCIL_WEIGHTS.confidence).toBe(100);
    expect(
      COUNCIL_WEIGHTS_WITH_VOICE.challenge + COUNCIL_WEIGHTS_WITH_VOICE.reward +
      COUNCIL_WEIGHTS_WITH_VOICE.confidence + COUNCIL_WEIGHTS_WITH_VOICE.voice,
    ).toBe(100);
    const learnedTaste: Taste = { liked: { gold: 3 }, disliked: {}, edits: 1 };
    for (const r of rankHooksByCouncil(hooks, inputs, [], learnedTaste)) {
      expect(r.councilScore).toBeGreaterThanOrEqual(0);
      expect(r.councilScore).toBeLessThanOrEqual(100);
    }
  });

  it('is deterministic given a fixed taste', () => {
    const learnedTaste: Taste = { liked: { gold: 2, streets: 1 }, disliked: { light: 1 }, edits: 2 };
    const a = rankHooksByCouncil(hooks, inputs, [], learnedTaste).map((r) => r.councilScore);
    const b = rankHooksByCouncil(hooks, inputs, [], learnedTaste).map((r) => r.councilScore);
    expect(a).toEqual(b);
  });
});

describe('rankHooksByCouncil — guest voices (the plug-in registry)', () => {
  const hooks = [
    hook('the cold streets made the gold in me', 60),
    hook('a whole new world of glowing light', 60),
  ];

  it('with no guest voices, ranking is byte-identical to the built-in-only baseline', () => {
    const baseline = rankHooksByCouncil(hooks, inputs);
    const withEmptyGuests = rankHooksByCouncil(hooks, inputs, [], undefined, []);
    expect(withEmptyGuests).toEqual(baseline);
  });

  it('a guest voice that always favors one hook can flip the ranking', () => {
    // Both hooks are equal on every built-in voice (same raw score, same length) —
    // only a guest voice moves the needle here.
    const favorsSecond: CouncilVoice = {
      id: 'test-guest', label: 'Always prefers the second hook', weight: 40,
      score: (ctx) => (ctx.hook.text.includes('glowing') ? 100 : 0),
    };
    const ranked = rankHooksByCouncil(hooks, inputs, [], undefined, [favorsSecond]);
    expect(ranked[0].hook.text).toBe('a whole new world of glowing light');
  });

  it('the built-in board never loses more than half the verdict, however many/heavy the guests', () => {
    const loudGuest: CouncilVoice = {
      id: 'loud', label: 'Enormous weight', weight: 100_000,
      score: (ctx) => (ctx.hook.text.includes('glowing') ? 100 : 0),
    };
    // hook 1 wins every built-in voice by a wide margin (near-perfect raw score,
    // on-theme) — even an enormously-weighted guest voice capped at 50% share
    // should not be enough to flip it away from the built-in board's clear pick.
    const lopsided = [
      hook('the cold gritty streets made the hard gold in me', 100),
      hook('meh', 1),
    ];
    const ranked = rankHooksByCouncil(lopsided, inputs, [], undefined, [loudGuest]);
    expect(ranked[0].hook.text).toBe('the cold gritty streets made the hard gold in me');
  });

  it('scores stay in [0,100] with guest voices attached', () => {
    const guest: CouncilVoice = { id: 'g', label: 'g', weight: 30, score: () => 100 };
    for (const r of rankHooksByCouncil(hooks, inputs, [], undefined, [guest])) {
      expect(r.councilScore).toBeGreaterThanOrEqual(0);
      expect(r.councilScore).toBeLessThanOrEqual(100);
    }
  });

  it('multiple guest voices split their share proportionally by weight', () => {
    const strongGuest: CouncilVoice = { id: 'strong', label: 'strong', weight: 90, score: () => 100 };
    const weakGuest: CouncilVoice = { id: 'weak', label: 'weak', weight: 10, score: () => 0 };
    const ranked = rankHooksByCouncil([hooks[0]], inputs, [], undefined, [strongGuest, weakGuest]);
    // The strong guest wants 100, the weak guest wants 0, weighted 90/10 — the
    // guest share should land much closer to the strong guest's number.
    const builtInOnly = rankHooksByCouncil([hooks[0]], inputs)[0].councilScore;
    expect(ranked[0].councilScore).toBeGreaterThan(builtInOnly);
  });

  it('is deterministic with guest voices attached', () => {
    const guest: CouncilVoice = { id: 'g', label: 'g', weight: 25, score: (ctx) => ctx.hook.text.length % 100 };
    const a = rankHooksByCouncil(hooks, inputs, [], undefined, [guest]).map((r) => r.councilScore);
    const b = rankHooksByCouncil(hooks, inputs, [], undefined, [guest]).map((r) => r.councilScore);
    expect(a).toEqual(b);
  });
});
