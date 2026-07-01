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

/**
 * Words the app has learned (via the in-app avoid-words list — one-tap exclusions
 * or auto-excluded repeated cuts) that AREN'T yet in the durable, version-controlled
 * record (`DEFAULT_BANNED_WORDS` + `brain/memory.json`). Those learned words only
 * live in that browser's localStorage — this is the diff a "copy to remember
 * permanently" UI action offers, so a real exclusion survives a cleared browser or
 * a different device instead of staying session-local.
 */
export function newLearnedExclusions(currentBanned: string[]): string[] {
  const known = new Set(
    [...DEFAULT_BANNED_WORDS, ...(MEMORY.exclusions?.words ?? [])].map((w) => w.toLowerCase().trim()),
  );
  const seen = new Set<string>();
  return currentBanned
    .map((w) => w.toLowerCase().trim())
    .filter((w) => w && !known.has(w) && !seen.has(w) && (seen.add(w), true));
}
