import { describe, it, expect } from 'vitest';
import { proceduralMemory } from '../procedural';
import { recommend } from '../recommend';
import { learnProfile } from '../learn';
import type { SongPackage, SongInputs, SongSection } from '../types';

function song(structure: SongInputs['structure'], endings: string[]): SongPackage {
  const sections: SongSection[] = [{ label: 'Verse 1', lines: endings.map((e) => `walking down the ${e}`) }];
  return {
    id: Math.random().toString(36).slice(2), title: 'S', createdAt: '2026-01-01T00:00:00Z', version: 1,
    inputs: { title: 'S', theme: 'the road', mood: 'hard', genre: 'boom-bap', tempoMin: 88, tempoMax: 96, voice: 'g', audience: 'you', doNotUse: [], references: '', structure },
    brief: '', conceptSummary: '', hookOptions: [], chosenHook: null, sections, finalLyrics: '',
    production: { tempoBpm: 90, drums: '', bass: '', instrumentation: [], arrangement: [], genreBlend: '', mixVibe: '' },
    vocals: { delivery: '', adlibs: [], doublesAndStacks: '' },
    visuals: { albumCoverPrompt: '', musicVideoPrompt: '', sceneIdeas: [], shortFormClipIdeas: [] },
    viralClips: [], promoCaption: '',
    uniqueness: { score: 100, flags: [], fingerprints: [], bannedWordsHit: [], rewriteSuggestions: [] },
    score: { hookStrength: 0, emotionalClarity: 0, originality: 0, replayValue: 0, visualIdentity: 0, shortFormPotential: 0, releaseReadiness: 0, total: 0, verdict: '' },
    release: [], agentOutputs: [],
  } as SongPackage;
}

describe('procedural memory (the artist\'s recurring craft moves)', () => {
  it('derives favorite structure, recurring rhyme sounds, and a signature move', () => {
    const songs = [song('full-song', ['gold', 'cold', 'road']), song('full-song', ['hold', 'told', 'sky'])];
    const p = proceduralMemory(songs);
    expect(p.songCount).toBe(2);
    expect(p.favoriteStructure).toBe('full-song');
    expect(p.topRhymeSounds[0].sound).toBe('old');           // gold/cold/hold/told all -old
    expect(p.signatureMove).toMatch(/full song/);
    expect(proceduralMemory([]).songCount).toBe(0);
  });

  it('surfaces a "signature move" recommendation once there are >= 2 songs', () => {
    const songs = [song('full-song', ['gold', 'cold']), song('full-song', ['hold', 'told'])];
    const recs = recommend(learnProfile(songs), songs);
    expect(recs.some((r) => r.kind === 'procedural' && /signature move/i.test(r.title))).toBe(true);
  });
});
