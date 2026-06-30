import { describe, it, expect, beforeEach } from 'vitest';
import { saveSong, listSongs, getSong, deleteSong, __clearVault, priorSongsForOriginality } from '../storage';
import { runPipeline } from '../pipeline';
import type { SongInputs } from '../types';

const idea: SongInputs = {
  title: 'Vault Test', theme: 'building something lasting', mood: 'hopeful',
  genre: 'trap', tempoMin: 130, tempoMax: 150, voice: 'me', audience: 'the team',
  doNotUse: [], references: '', structure: 'full-song',
};

describe('vault storage', () => {
  beforeEach(() => __clearVault());

  it('saves and lists without crashing (server/in-memory fallback)', async () => {
    const { pkg } = await runPipeline(idea, { id: 'a', now: '2026-01-01T00:00:00Z' });
    const stored = saveSong(pkg);
    expect(stored.version).toBe(1);
    expect(listSongs().length).toBe(1);
    expect(getSong('a')?.title).toBe('Vault Test');
  });

  it('bumps version when the same title is saved again', async () => {
    const a = (await runPipeline(idea, { id: 'a', now: '2026-01-01T00:00:00Z' })).pkg;
    const b = (await runPipeline(idea, { id: 'b', now: '2026-01-02T00:00:00Z' })).pkg;
    saveSong(a);
    const second = saveSong(b);
    expect(second.version).toBe(2);
  });

  it('exposes prior songs for the originality checker', async () => {
    const a = (await runPipeline(idea, { id: 'a', now: '2026-01-01T00:00:00Z' })).pkg;
    saveSong(a);
    const priors = priorSongsForOriginality('other');
    expect(priors.length).toBe(1);
    expect(priors[0].fingerprints.length).toBeGreaterThan(0);
  });

  it('deletes cleanly', async () => {
    const a = (await runPipeline(idea, { id: 'a', now: '2026-01-01T00:00:00Z' })).pkg;
    saveSong(a);
    deleteSong('a');
    expect(listSongs().length).toBe(0);
  });
});
