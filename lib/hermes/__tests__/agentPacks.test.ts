import { describe, it, expect } from 'vitest';
import { rankHooksByCouncil } from '../council';
import { AGENT_PACKS, findAgentPack } from '../agentPacks';
import type { SongInputs, HookOption } from '../types';

const inputs: SongInputs = {
  title: 'T', theme: 'building gold out of the cold streets', mood: 'hard, hopeful',
  genre: 'boom-bap', tempoMin: 88, tempoMax: 96, voice: 'gritty', audience: 'the block',
  doNotUse: [], references: '', structure: 'full-song',
};
const hook = (text: string, score: number): HookOption => ({ text, angle: '', cadence: '', score });

describe('AGENT_PACKS roster', () => {
  it('has three distinct packs, each with a unique id', () => {
    expect(AGENT_PACKS).toHaveLength(3);
    const ids = new Set(AGENT_PACKS.map((p) => p.id));
    expect(ids.size).toBe(3);
  });

  it("every pack's voice.id matches the pack's own id", () => {
    for (const p of AGENT_PACKS) expect(p.voice.id).toBe(p.id);
  });

  it('findAgentPack finds a known pack and returns undefined for an unknown one', () => {
    expect(findAgentPack('pop-radio')?.label).toBe('Pop Radio');
    expect(findAgentPack('nonexistent')).toBeUndefined();
  });

  it("every pack's score stays in [0,100] across a range of hooks", () => {
    const hooks = [
      hook('yeah uh ok whatever nah', 99),
      hook('the cold streets made the gold in me', 60),
      hook('', 0),
      hook('gold gold gold gold gold', 40),
      hook('home is where the love and hope and light live on forever and ever amen', 40),
    ];
    for (const p of AGENT_PACKS) {
      for (const h of hooks) {
        const ctx = { hook: h, inputs, sections: [], deliberation: { secondThought: [] } as any, passed: 0, craft: 50 };
        const s = p.voice.score(ctx);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(100);
      }
    }
  });

  it('is deterministic — same hook scores the same every time, per pack', () => {
    const h = hook('the cold streets made the gold in me', 60);
    const ctx = { hook: h, inputs, sections: [], deliberation: { secondThought: [] } as any, passed: 2, craft: 70 };
    for (const p of AGENT_PACKS) {
      expect(p.voice.score(ctx)).toBe(p.voice.score(ctx));
    }
  });
});

describe('Agent Packs wired through rankHooksByCouncil', () => {
  it('Pop Radio favors a hook with a repeated word over one with none', () => {
    const popRadio = findAgentPack('pop-radio')!.voice;
    const repeated = hook('gold gold streets of gold', 60);
    const varied = hook('a whole new world of glowing light', 60);
    const ranked = rankHooksByCouncil([repeated, varied], inputs, [], undefined, [popRadio]);
    expect(ranked[0].hook.text).toBe(repeated.text);
  });

  it('Poetry Slam favors a hook with more distinct imagery over a flat one', () => {
    const poetrySlam = findAgentPack('poetry-slam')!.voice;
    const rich = hook('cold hard streets of gold and family hope and light', 60);
    const flat = hook('yeah uh ok whatever nah', 60);
    const ranked = rankHooksByCouncil([rich, flat], inputs, [], undefined, [poetrySlam]);
    expect(ranked[0].hook.text).toBe(rich.text);
  });

  it('Boom-Bap Traditionalist favors street/time imagery over unrelated imagery', () => {
    const traditionalist = findAgentPack('boom-bap-traditionalist')!.voice;
    const street = hook('cold hard streets where the time never stops moving', 60);
    const unrelated = hook('home is filled with love and family light', 60);
    const ranked = rankHooksByCouncil([street, unrelated], inputs, [], undefined, [traditionalist]);
    expect(ranked[0].hook.text).toBe(street.text);
  });

  it('multiple packs can combine with Guest Judges voices and still keep scores in [0,100]', () => {
    const voices = AGENT_PACKS.map((p) => p.voice);
    const hooks = [hook('the cold streets made the gold in me', 60), hook('a whole new world of glowing light', 55)];
    for (const r of rankHooksByCouncil(hooks, inputs, [], undefined, voices)) {
      expect(r.councilScore).toBeGreaterThanOrEqual(0);
      expect(r.councilScore).toBeLessThanOrEqual(100);
    }
  });
});
