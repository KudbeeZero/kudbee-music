// Mock audio / image / video prompt providers. Direction-only in V1 (no bytes,
// no vendor). All deterministic from the brief.
import type { AudioProvider, ImagePromptProvider, VideoPromptProvider, ProviderBundle } from './providerTypes';
import type { ProductionNotes } from '../types';
import { makeRng, hashString, pick, keywords } from '../text';
import { mockLyricsProvider } from './mockLyricsProvider';

const DRUM_KITS = ['808-driven trap kit, rolling hats', 'boom-bap with dusty snares', 'half-time hybrid with live percussion', 'minimal knock, heavy kick'];
const BASS = ['sliding 808 with glide', 'sub bass locked to the kick', 'warm analog bassline', 'distorted 808 for the drop'];
const INSTRUMENTS = ['muted piano', 'detuned bell lead', 'string pad', 'vinyl texture', 'lo-fi guitar loop', 'choir swell', 'pluck arp'];

export const mockAudioProvider: AudioProvider = {
  id: 'mock-audio',
  live: false,
  async suggestProduction(inputs) {
    const rng = makeRng(hashString(inputs.genre + inputs.mood + 'prod'));
    const tempoBpm = Math.round((inputs.tempoMin + inputs.tempoMax) / 2) || 140;
    const inst = [...INSTRUMENTS].sort(() => rng() - 0.5).slice(0, 3);
    const notes: ProductionNotes = {
      tempoBpm,
      drums: pick(DRUM_KITS, rng),
      bass: pick(BASS, rng),
      instrumentation: inst,
      arrangement: [
        'Intro: sparse, just the lead motif + vinyl',
        'Hook: full drums in, 808 glide, double the vocal',
        'Verse: pull the pad, let the knock breathe',
        'Bridge: drop drums, swell, then re-enter on the one',
        'Outro: filter the beat down, leave the hook ringing',
      ],
      genreBlend: `${inputs.genre} core with melodic/emotional top line`,
      mixVibe: 'wide, warm low end, vocal up front, slight tape saturation',
    };
    return notes;
  },
};

export const mockImagePromptProvider: ImagePromptProvider = {
  id: 'mock-image',
  live: false,
  async albumCoverPrompt(inputs, concept) {
    const ks = keywords([inputs.theme, inputs.mood, inputs.references].join(' ')).slice(0, 4).join(', ');
    return [
      `Album cover, square 1:1. Cinematic, ${inputs.mood} mood.`,
      `Subject reflects: ${concept}.`,
      `Visual motifs: ${ks || 'street, family, light'}.`,
      `Color: deep shadows, one warm accent light. Film grain, 35mm.`,
      `No text, no logos, no real-artist likeness. Original styling.`,
    ].join(' ');
  },
};

export const mockVideoPromptProvider: VideoPromptProvider = {
  id: 'mock-video',
  live: false,
  async musicVideoPrompt(inputs, concept) {
    const rng = makeRng(hashString(inputs.title + 'video'));
    const ks = keywords([inputs.theme, inputs.references].join(' '));
    const scenes = [
      `Opening: slow 16:9 push-in on the subject, ${inputs.mood} light, city at dawn.`,
      `Hook: handheld, performance energy, ${pick(['rain on glass', 'neon reflections', 'golden hour'], rng)}.`,
      `Verse: storytelling cutaways tied to "${ks[0] ?? concept}".`,
      `Bridge: single locked-off wide, subject still while the world moves.`,
      `Outro: pull back to reveal the place it all started.`,
    ];
    const prompt = `Cinematic 16:9 music video. Concept: ${concept}. ${inputs.mood} tone, ${inputs.genre} energy. Grounded, not corny; real locations, natural light with one stylized accent. Original — no copyrighted footage or artist mimicry.`;
    return { prompt, scenes };
  },
};

export const mockProviders: ProviderBundle = {
  lyrics: mockLyricsProvider,
  audio: mockAudioProvider,
  image: mockImagePromptProvider,
  video: mockVideoPromptProvider,
};
