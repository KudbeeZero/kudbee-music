// Generic cliché avoid-list (WARN-only — a hit never blocks generation, just
// surfaces a suggestion). The user's PERSONAL, growing exclusion list lives in
// the memory layer (brain/memory.json) and is merged in via lib/hermes/memory.ts
// `allAvoidWords()`.
export const DEFAULT_BANNED_WORDS: string[] = [
  'echo', 'shadow', 'fire', 'flame', 'highs', 'lows', 'whisper', 'scars',
  'pain', 'fade', 'bonding', 'villain', 'pivot', 'every', 'diamond', 'crown',
  'mirror', 'regrets', 'twisted', 'broken', 'rise', 'soldier of truth',
  'dreaming', 'chest', 'cement', 'flutter',
  // proactive, generic "sounds like AI wrote it" clichés (2026-07-01) — added
  // ahead of a specific complaint, not in reaction to one, so the tool gets
  // ahead of the pattern instead of only reacting one word at a time.
  'tapestry', 'unraveling', 'embrace', 'unwavering', 'kaleidoscope', 'symphony',
  'phoenix', 'wildfire', 'haunting', 'silhouette', 'veins', 'unspoken',
  'canvas', 'labyrinth', 'constellation', 'shattered', 'fractured', 'empire',
];

// A few non-corny stand-ins offered when an avoid-word shows up. Intentionally
// concrete/grounded rather than another cliché.
export const REPLACEMENT_HINTS: Record<string, string[]> = {
  pain: ['the ache', 'the weight', 'what it cost'],
  fire: ['the heat', 'the burn-off', 'the spark'],
  shadow: ['the dark side', 'the after-image', 'what trails me'],
  broken: ['half-built', 'cracked open', 'coming apart'],
  rise: ['climb', 'get up', 'come back'],
  crown: ['the title', 'top spot', 'the name'],
  diamond: ['the rock', 'the shine', 'cut glass'],
  mirror: ['the glass', 'my reflection', 'the window'],
  dreaming: ['planning', 'building it', 'awake on it'],
  scars: ['the marks', 'old stitches', 'the proof'],
  concrete: ['the pavement', 'the asphalt', 'the gravel'],
  chain: ['the weight', 'the lock', 'the leash'],
  bed: ['the floor', 'the empty room', 'the cold side'],
  bedroom: ['the empty room', 'the four walls', 'the dark'],
  tapestry: ['the patchwork', 'the pieces', 'what it is made of'],
  embrace: ['hold onto', 'lean into', 'take it in'],
  unwavering: ['steady', 'locked in', 'set in stone'],
  phoenix: ['the comeback', 'the second wind', 'the rebuild'],
  shattered: ['cracked', 'broken open', 'in pieces'],
  haunting: ['still with me', 'stuck in my head', 'will not let go'],
};

export function suggestReplacement(word: string): string | undefined {
  const hits = REPLACEMENT_HINTS[word.toLowerCase()];
  return hits ? hits[0] : undefined;
}
