import { describe, it, expect } from 'vitest';
import { rankHooksByCouncil } from '../council';
import { GUEST_JUDGES, findGuestJudge } from '../guestJudges';
import type { SongInputs, HookOption } from '../types';

const inputs: SongInputs = {
  title: 'T', theme: 'building gold out of the cold streets', mood: 'hard, hopeful',
  genre: 'boom-bap', tempoMin: 88, tempoMax: 96, voice: 'gritty', audience: 'the block',
  doNotUse: [], references: '', structure: 'full-song',
};
const hook = (text: string, score: number): HookOption => ({ text, angle: '', cadence: '', score });

describe('GUEST_JUDGES roster', () => {
  it('has three distinct personas, each with a unique id', () => {
    expect(GUEST_JUDGES).toHaveLength(3);
    const ids = new Set(GUEST_JUDGES.map((j) => j.id));
    expect(ids.size).toBe(3);
  });

  it('every judge\'s voice.id matches the judge\'s own id', () => {
    for (const j of GUEST_JUDGES) expect(j.voice.id).toBe(j.id);
  });

  it('findGuestJudge finds a known judge and returns undefined for an unknown one', () => {
    expect(findGuestJudge('ar-exec')?.label).toBe('The A&R Exec');
    expect(findGuestJudge('nonexistent')).toBeUndefined();
  });

  it('every judge\'s score stays in [0,100] across a range of hooks', () => {
    const hooks = [
      hook('yeah uh ok whatever nah', 99),
      hook('the cold streets made the gold in me', 60),
      hook('', 0),
      hook('a', 10),
      hook('home is where the love and hope and light live on forever and ever amen', 40),
    ];
    for (const j of GUEST_JUDGES) {
      for (const h of hooks) {
        const ctx = { hook: h, inputs, sections: [], deliberation: { secondThought: [] } as any, passed: 0, craft: 50 };
        const s = j.voice.score(ctx);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(100);
      }
    }
  });

  it('is deterministic — same hook scores the same every time, per judge', () => {
    const h = hook('the cold streets made the gold in me', 60);
    const ctx = { hook: h, inputs, sections: [], deliberation: { secondThought: [] } as any, passed: 2, craft: 70 };
    for (const j of GUEST_JUDGES) {
      expect(j.voice.score(ctx)).toBe(j.voice.score(ctx));
    }
  });
});

describe('Guest Judges wired through rankHooksByCouncil', () => {
  it("Your Mom favors warm/hopeful language over dark/street language", () => {
    const yourMom = findGuestJudge('your-mom')!.voice;
    const warm = hook('home is filled with love and hope and light', 60);
    const dark = hook('cold hard streets of pain and broken glass', 60);
    const ranked = rankHooksByCouncil([warm, dark], inputs, [], undefined, [yourMom]);
    expect(ranked[0].hook.text).toBe(warm.text);
  });

  it('The TikTok Algorithm favors the shorter of two equally-scored hooks', () => {
    const tiktok = findGuestJudge('tiktok')!.voice;
    const short = hook('gold streets', 60);
    const long = hook('a long winding tale about gold in the cold hard streets of home', 60);
    const ranked = rankHooksByCouncil([short, long], inputs, [], undefined, [tiktok]);
    expect(ranked[0].hook.text).toBe(short.text);
  });

  it('multiple guest judges can be combined and still keep scores in [0,100]', () => {
    const voices = GUEST_JUDGES.map((j) => j.voice);
    const hooks = [hook('the cold streets made the gold in me', 60), hook('a whole new world of glowing light', 55)];
    for (const r of rankHooksByCouncil(hooks, inputs, [], undefined, voices)) {
      expect(r.councilScore).toBeGreaterThanOrEqual(0);
      expect(r.councilScore).toBeLessThanOrEqual(100);
    }
  });
});
