import { describe, it, expect } from 'vitest';
import { voiceMirror } from '../becomingYou';
import type { SongPackage, SongInputs } from '../types';

function song(theme: string, lyrics: string): SongPackage {
  const inputs: SongInputs = { title: 'S', theme, mood: 'hard', genre: 'boom-bap', tempoMin: 88, tempoMax: 96, voice: 'g', audience: 'you', doNotUse: [], references: '', structure: 'full-song' };
  return {
    id: Math.random().toString(36).slice(2), title: 'S', createdAt: '2026-01-01T00:00:00Z', version: 1, inputs,
    brief: '', conceptSummary: '', hookOptions: [], chosenHook: null, sections: [{ label: 'Verse 1', lines: [lyrics] }], finalLyrics: lyrics,
    production: { tempoBpm: 90, drums: '', bass: '', instrumentation: [], arrangement: [], genreBlend: '', mixVibe: '' },
    vocals: { delivery: '', adlibs: [], doublesAndStacks: '' },
    visuals: { albumCoverPrompt: '', musicVideoPrompt: '', sceneIdeas: [], shortFormClipIdeas: [] },
    viralClips: [], promoCaption: '',
    uniqueness: { score: 100, flags: [], fingerprints: [], bannedWordsHit: [], rewriteSuggestions: [] },
    score: { hookStrength: 0, emotionalClarity: 0, originality: 0, replayValue: 0, visualIdentity: 0, shortFormPotential: 0, releaseReadiness: 0, total: 0, verdict: '' },
    release: [], agentOutputs: [],
  } as SongPackage;
}

describe('becoming you (voice self-portrait)', () => {
  it('is 0% with no prior songs (nothing learned yet)', () => {
    const m = voiceMirror(song('struggle and gold', 'the struggle made the gold'), undefined, []);
    expect(m.youPercent).toBe(0);
    expect(m.learnedFrom).toBe(0);
    expect(m.note).toMatch(/first song/i);
  });

  it('detects the learned voice showing up in a new song', () => {
    const prior = [song('struggle and gold', 'the struggle and the gold'), song('struggle streets', 'the struggle on the streets')];
    const current = song('a new one', 'the struggle never left the streets');
    const m = voiceMirror(current, undefined, prior);
    expect(m.learnedFrom).toBe(2);
    expect(m.youPercent).toBeGreaterThan(0);
    expect(m.signature.length).toBeGreaterThan(0);   // "struggle"/"streets" are the learned voice
  });

  it('counts liked (kept-on-edit) words as voice', () => {
    const taste = { liked: { crown: 3 }, disliked: {}, edits: 3 };
    const m = voiceMirror(song('x', 'i wore the crown'), taste, []);
    expect(m.signature).toContain('crown');
    expect(m.youPercent).toBeGreaterThan(0);
  });
});
