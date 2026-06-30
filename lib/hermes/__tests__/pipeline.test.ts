import { describe, it, expect } from 'vitest';
import { runPipeline } from '../pipeline';
import { AGENT_DEFINITIONS } from '../agents';
import type { SongInputs } from '../types';

const idea: SongInputs = {
  title: 'Out the Mud',
  theme: 'Chicago pain song for my daughter, made it out the struggle',
  mood: 'emotional but hard',
  genre: '808 trap',
  tempoMin: 130, tempoMax: 145,
  voice: 'street, real, not corny',
  audience: 'my daughter',
  doNotUse: [],
  references: 'melodic hook energy, emotional storytelling',
  structure: 'hook-first',
};

describe('pipeline', () => {
  it('returns an output for every one of the 10 agents', async () => {
    const { agentOutputs } = await runPipeline(idea, { id: 'test', now: '2026-01-01T00:00:00Z' });
    expect(agentOutputs.length).toBe(AGENT_DEFINITIONS.length);
    for (const def of AGENT_DEFINITIONS) {
      expect(agentOutputs.find((o) => o.id === def.id)).toBeTruthy();
    }
  });

  it('assembles a complete song package', async () => {
    const { pkg } = await runPipeline(idea, { id: 'test', now: '2026-01-01T00:00:00Z' });
    expect(pkg.id).toBe('test');
    expect(pkg.hookOptions.length).toBeGreaterThanOrEqual(3);
    expect(pkg.chosenHook).toBeTruthy();
    expect(pkg.sections.length).toBeGreaterThan(0);
    expect(pkg.finalLyrics).toContain('[Hook]');
    expect(pkg.score.total).toBeGreaterThanOrEqual(0);
    expect(pkg.uniqueness.fingerprints.length).toBeGreaterThan(0);
    expect(pkg.visuals.musicVideoPrompt).toMatch(/16:9/);
    expect(pkg.release.length).toBeGreaterThan(0);
  });

  it('does not tank uniqueness just because the chorus repeats', async () => {
    // regression: a normal song with a hook returning 3× should still read as
    // original — the repeating chorus is songcraft, not plagiarism.
    const { pkg } = await runPipeline(idea, { id: 't', now: '2026-01-01T00:00:00Z' });
    expect(pkg.uniqueness.score).toBeGreaterThan(55);
    expect(pkg.score.originality).toBeGreaterThan(5); // out of 20
  });

  it('is deterministic for the same input (no seed)', async () => {
    const a = await runPipeline(idea, { id: 'x', now: '2026-01-01T00:00:00Z' });
    const b = await runPipeline(idea, { id: 'x', now: '2026-01-01T00:00:00Z' });
    expect(a.pkg.finalLyrics).toBe(b.pkg.finalLyrics);
    expect(a.pkg.score.total).toBe(b.pkg.score.total);
  });

  it('reproduces a seeded draft but varies across seeds', async () => {
    const a = await runPipeline(idea, { id: 'a', now: '2026-01-01T00:00:00Z', seed: 1 });
    const b = await runPipeline(idea, { id: 'b', now: '2026-01-01T00:00:00Z', seed: 1 });
    const c = await runPipeline(idea, { id: 'c', now: '2026-01-01T00:00:00Z', seed: 2 });
    expect(a.pkg.finalLyrics).toBe(b.pkg.finalLyrics);        // same seed → same draft
    expect(a.pkg.finalLyrics).not.toBe(c.pkg.finalLyrics);    // new seed → fresh take
  });

  it('reports progress for each step', async () => {
    const seen: string[] = [];
    await runPipeline(idea, { id: 't', now: '2026-01-01T00:00:00Z', onProgress: (p) => { if (p.status === 'running') seen.push(p.agentId); } });
    expect(seen).toContain('conductor');
    expect(seen).toContain('ar-judge');
    expect(seen).toContain('rights-release-guard');
  });
});
