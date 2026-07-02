// Pattern Packs (roadmap 5.6) — named presets that set BOTH the structure and
// rhyme-scheme dials together, so a visitor can pick "one different pattern"
// instead of tuning two dropdowns separately. Grounded in the lyric-structure-
// variety research (see docs/pattern-packs.md) — every pack's sourceNote says
// exactly what's research-backed (the FORM) versus a general craft-variety
// offering (the RHYME SCHEME, whose genre-to-scheme mapping did not survive
// verification — see the doc's honest caveats section).
//
// Deliberately NOT a field on SongInputs: applying a pack just sets `structure`
// + `rhymeScheme` on the brief, so SongInputs stays the single source of truth
// for generation (no second "which pack" field that could drift from the
// values actually driving the combinator).
import type { SongStructure, RhymeSchemeId } from './types';
import packs from '../../brain/patternPacks.json';

export interface PatternPack {
  id: string;
  label: string;
  structure: SongStructure;
  rhymeScheme: RhymeSchemeId;
  blurb: string;
  sourceNote: string;
}

export const PATTERN_PACKS: PatternPack[] = packs as PatternPack[];

export function findPatternPack(id: string): PatternPack | undefined {
  return PATTERN_PACKS.find((p) => p.id === id);
}
