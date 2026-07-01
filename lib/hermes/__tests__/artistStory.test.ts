import { describe, it, expect } from 'vitest';
import { runPipeline } from '../pipeline';
import { deriveArtist } from '../artist';
import { currentChapter, nextUnlock, unlockedChapters } from '../story';
import type { SongInputs, SongPackage } from '../types';

const brief: SongInputs = {
  title: 'A', theme: 'building gold from the cold streets for my family', mood: 'emotional, defiant',
  genre: 'soul hip-hop', tempoMin: 86, tempoMax: 94, voice: 'grounded', audience: 'my family',
  doNotUse: [], references: '', structure: 'full-song',
};
async function songs(n: number): Promise<SongPackage[]> {
  const out: SongPackage[] = [];
  for (let i = 0; i < n; i++) {
    const { pkg } = await runPipeline({ ...brief, title: `A${i}` }, { id: `a${i}`, now: '2026-01-01T00:00:00Z', seed: i + 1 });
    out.push(pkg);
  }
  return out;
}

describe('Story Mode', () => {
  it('starts at First Spark and unlocks as you progress', () => {
    expect(currentChapter({ songCount: 0, becomingYou: 0, bestScore: 0 }).id).toBe('spark');
    expect(currentChapter({ songCount: 2, becomingYou: 0, bestScore: 0 }).id).toBe('voice');
    expect(currentChapter({ songCount: 5, becomingYou: 30, bestScore: 90 }).id).toBe('album');
  });

  it('reports the next unlock and its goal', () => {
    const nu = nextUnlock({ songCount: 0, becomingYou: 0, bestScore: 0 });
    expect(nu?.chapter.id).toBe('voice');
    expect(nu?.goal.length).toBeGreaterThan(0);
    expect(nextUnlock({ songCount: 9, becomingYou: 90, bestScore: 99 })).toBeNull();
  });

  it('unlockedChapters grows monotonically', () => {
    expect(unlockedChapters({ songCount: 0, becomingYou: 0, bestScore: 0 }).length).toBe(1);
    expect(unlockedChapters({ songCount: 5, becomingYou: 30, bestScore: 90 }).length).toBe(4);
  });
});

describe('create-your-own-artist v1', () => {
  it('derives a brand-new artist from an empty vault', () => {
    const a = deriveArtist([], undefined, { alias: 'Dom Shady' });
    expect(a.alias).toBe('Dom Shady');
    expect(a.songsMade).toBe(0);
    expect(a.chapter).toBe('First Spark');
    expect(a.bio).toMatch(/brand-new/i);
  });

  it('grows an identity from a catalog', async () => {
    const a = deriveArtist(await songs(3), undefined, { alias: 'Dom Shady', becomingYou: 15 });
    expect(a.songsMade).toBe(3);
    expect(a.signatureWords.length).toBeGreaterThan(0);
    expect(['right', 'left', 'balanced']).toContain(a.dominantHemisphere);
    expect(a.bio).toContain('Dom Shady');
  });

  it('falls back to an unnamed alias', () => {
    expect(deriveArtist([], undefined).alias).toBe('Unnamed Artist');
  });
});
