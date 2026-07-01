// Vendor-neutral provider seams. V1 ships mock implementations; a future lane
// can drop in a real AI/music vendor behind these same interfaces without
// touching the agents or pipeline.
import type { SongInputs, HookOption, SongSection, ProductionNotes } from '../types';

// `seed` is an optional regeneration nonce — same seed reproduces the same draft
// (stable tests + meaningful vault), a new seed yields a fresh take on the same
// brief. A live provider may ignore it or fold it into its own sampling.
export interface LyricsProvider {
  readonly id: string;
  readonly live: boolean; // false = mock/local
  generateHooks(inputs: SongInputs, count: number, seed?: number, bannedWords?: string[]): Promise<HookOption[]>;
  generateSections(inputs: SongInputs, hook: HookOption, seed?: number, bannedWords?: string[]): Promise<SongSection[]>;
}

export interface AudioProvider {
  readonly id: string;
  readonly live: boolean;
  /** V1: produce production direction only (no audio bytes). */
  suggestProduction(inputs: SongInputs): Promise<ProductionNotes>;
}

export interface ImagePromptProvider {
  readonly id: string;
  readonly live: boolean;
  albumCoverPrompt(inputs: SongInputs, concept: string): Promise<string>;
}

export interface VideoPromptProvider {
  readonly id: string;
  readonly live: boolean;
  musicVideoPrompt(inputs: SongInputs, concept: string): Promise<{ prompt: string; scenes: string[] }>;
}

export interface ProviderBundle {
  lyrics: LyricsProvider;
  audio: AudioProvider;
  image: ImagePromptProvider;
  video: VideoPromptProvider;
}
