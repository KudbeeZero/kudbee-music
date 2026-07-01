import { describe, it, expect } from 'vitest';
import { runPipeline } from '../pipeline';
import { brainSignature, toNftMetadata } from '../brainSignature';
import type { SongInputs, SongPackage } from '../types';

const brief: SongInputs = {
  title: 'Sig', theme: 'building gold out of the cold streets for my family',
  mood: 'emotional, defiant, intense', genre: 'soul hip-hop', tempoMin: 86, tempoMax: 94,
  voice: 'grounded', audience: 'my family', doNotUse: [], references: '', structure: 'full-song',
};

async function songs(n: number): Promise<SongPackage[]> {
  const out: SongPackage[] = [];
  for (let i = 0; i < n; i++) {
    const { pkg } = await runPipeline({ ...brief, title: `Sig ${i}` }, { id: `s${i}`, now: '2026-01-01T00:00:00Z', seed: i + 1 });
    out.push(pkg);
  }
  return out;
}

describe('brainSignature (dNFT trait card)', () => {
  it('produces valid traits from a catalog', async () => {
    const sig = brainSignature({ songs: await songs(3), becomingYou: 40 });
    expect(sig.songsMade).toBe(3);
    expect(sig.temperature).toBeGreaterThanOrEqual(0);
    expect(sig.temperature).toBeLessThanOrEqual(100);
    expect(['right', 'left', 'balanced']).toContain(sig.dominantHemisphere);
    expect(sig.becomingYou).toBe(40);
    expect(typeof sig.topRhymeSound).toBe('string');
    expect(sig.primaryEmotion.length).toBeGreaterThan(0);
  });

  it('handles an empty catalog (a brand-new brain)', () => {
    const sig = brainSignature({ songs: [], becomingYou: 0 });
    expect(sig.songsMade).toBe(0);
    expect(sig.primaryEmotion).toBe('unwritten');
  });

  it('is deterministic', async () => {
    const s = await songs(2);
    expect(brainSignature({ songs: s, becomingYou: 20 })).toEqual(brainSignature({ songs: s, becomingYou: 20 }));
  });

  it('shapes standard ERC-721 metadata a token can point to', async () => {
    const sig = brainSignature({ songs: await songs(2), becomingYou: 55 });
    const md = toNftMetadata(sig, { tokenId: 7 });
    expect(md.name).toBe('HERMES Brain #7');
    expect(md.description.length).toBeGreaterThan(20);
    expect(md.image).toMatch(/\/7\.png$/);
    expect(md.animation_url).toMatch(/\/7$/);
    expect(md.attributes).toHaveLength(6);
    expect(md.attributes.map((a) => a.trait_type)).toContain('Dominant Hemisphere');
    expect(md.attributes.find((a) => a.trait_type === 'Songs Made')?.value).toBe(2);
  });
});
