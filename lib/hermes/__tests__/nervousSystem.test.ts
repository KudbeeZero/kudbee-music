import { describe, it, expect } from 'vitest';
import { REGIONS, PATHWAYS, agentRegion, regionState, activePathways } from '../brainMap';
import { createNervousSystem, signalForAgent, outgoingPathways } from '../nervousSystem';
import { createWorkingMemory } from '../workingMemory';
import type { AgentOutput } from '../types';

const out = (id: string, status: AgentOutput['status']): AgentOutput =>
  ({ id, name: id, status, finding: '', confidence: 0, warnings: [], suggestedNextAction: '', data: {} } as AgentOutput);

describe('brain map (anatomy)', () => {
  it('splits memory into short-term and long-term, and wires nerves between real regions', () => {
    const ids = REGIONS.map((r) => r.id);
    expect(ids).toContain('short-term');
    expect(ids).toContain('long-term');
    // every pathway connects two regions that exist
    for (const [a, b] of PATHWAYS) {
      expect(ids).toContain(a);
      expect(ids).toContain(b);
    }
  });

  it('maps an agent to its region and reads a region as running/done', () => {
    expect(agentRegion('hooksmith')?.id).toBe('generative');
    expect(agentRegion('ar-judge')?.id).toBe('decision');
    const gen = REGIONS.find((r) => r.id === 'generative')!;
    expect(regionState(gen, { hooksmith: out('hooksmith', 'running') })).toBe('running');
    expect(regionState(gen, {
      hooksmith: out('hooksmith', 'done'), 'lyric-chemist': out('lyric-chemist', 'done'),
      'visual-director': out('visual-director', 'done'), 'viral-clip-scout': out('viral-clip-scout', 'done'),
    })).toBe('done');
    // Language & Culture is now wired (driven by the lyric-chemist), no longer "soon"
    const lang = REGIONS.find((r) => r.id === 'language')!;
    expect(regionState(lang, {})).toBe('idle');
    expect(regionState(lang, { 'lyric-chemist': out('lyric-chemist', 'running') })).toBe('running');
  });

  it('lights the nerves touching a running region', () => {
    // hooksmith running lights the generative region AND short-term memory (it holds
    // the draft), so active nerves touch one of those running regions.
    const paths = activePathways({ hooksmith: out('hooksmith', 'running') });
    const running = new Set(['generative', 'short-term']);
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.every(([a, b]) => running.has(a) || running.has(b))).toBe(true);
    expect(paths.some(([a, b]) => a === 'generative' || b === 'generative')).toBe(true);
  });
});

describe('nervous system (signal bus)', () => {
  it('fires signals to subscribers with an increasing sequence, and keeps history', () => {
    const ns = createNervousSystem();
    const seen: number[] = [];
    const off = ns.subscribe((s) => seen.push(s.seq));
    ns.fire({ region: 'intent', note: 'brief' });
    ns.fire({ region: 'generative', note: 'hook' });
    off();
    ns.fire({ region: 'decision', note: 'after unsub' });
    expect(seen).toEqual([0, 1]);              // unsubscribed before the 3rd
    expect(ns.history().length).toBe(3);
    expect(ns.history()[2].seq).toBe(2);
  });

  it('turns an agent into the signal for its region', () => {
    expect(signalForAgent('originality-auditor', 'check')?.region).toBe('analytical');
    expect(outgoingPathways('short-term')).toEqual([['short-term', 'long-term']]);
  });
});

describe('working memory (short-term, decaying) → consolidation', () => {
  it('holds only the most recent items (decays past capacity)', () => {
    const wm = createWorkingMemory(3);
    for (let i = 0; i < 5; i++) wm.note({ kind: 'choice', text: `line ${i}` });
    expect(wm.size()).toBe(3);
    expect(wm.recent().map((m) => m.text)).toEqual(['line 2', 'line 3', 'line 4']);
  });

  it('consolidates salient words from choices/drafts, ignoring transient signals', () => {
    const wm = createWorkingMemory(20);
    wm.note({ kind: 'choice', text: 'carry the crown, carry the weight' });
    wm.note({ kind: 'draft', text: 'the crown made the king' });
    wm.note({ kind: 'signal', text: 'generative fired' });   // transient — should not consolidate
    const { keep } = wm.consolidate();
    expect(keep).toContain('crown');                          // recurred → kept
    expect(keep).not.toContain('generative');                 // signals excluded
  });
});
