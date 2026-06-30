// The memory layer — the brain's semantic-memory tier. Loads the persistent,
// version-controlled creative memory (brain/memory.json) so the user's
// exclusions and preferences are ALWAYS applied without re-specifying them.
// Relative import (not the @ alias) so it resolves in both Next and vitest.
import memoryData from '../../brain/memory.json';
import { DEFAULT_BANNED_WORDS } from './bannedWords';

export interface CreativeMemory {
  owner?: string;
  updated?: string;
  note?: string;
  exclusions: { words: string[]; notes?: string[] };
  preferences?: {
    genres?: string[];
    moodLean?: string;
    vocals?: string;
    hooks?: string;
    notes?: string[];
  };
}

export const MEMORY = memoryData as CreativeMemory;

/** The full avoid-list the algorithm uses: generic clichés + the user's
 *  remembered exclusions + any per-song words, de-duplicated. */
export function allAvoidWords(extra: string[] = []): string[] {
  const words = [
    ...DEFAULT_BANNED_WORDS,
    ...(MEMORY.exclusions?.words ?? []),
    ...extra,
  ].map((w) => w.toLowerCase().trim()).filter(Boolean);
  return Array.from(new Set(words));
}

/** Remembered preferences (genre lean, mood, vocal style) for seeding the UI. */
export function memoryPreferences() {
  return MEMORY.preferences ?? {};
}
