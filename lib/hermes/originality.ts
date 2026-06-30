// Local originality checker. No internet in V1 — it compares against the local
// vault and a set of heuristics, then scores 0–100 with warnings + rewrites.
import type { UniquenessReport, UniquenessFlag } from './types';
import { DEFAULT_BANNED_WORDS, suggestReplacement } from './bannedWords';
import { normalizeLine, ngrams, lineSimilarity, hashString } from './text';

export interface PriorSong {
  id: string;
  title: string;
  finalLyrics: string;
  fingerprints: string[];
}

export interface OriginalityOptions {
  bannedWords?: string[];
  priorSongs?: PriorSong[];
  /** lines >= this similarity to a prior generated line are flagged */
  similarityThreshold?: number;
}

const CLICHES = [
  'at the end of the day', 'through thick and thin', 'ride or die',
  'against all odds', 'light at the end of the tunnel', 'born to win',
  'tears in my eyes', 'against the world', 'top of the world',
];

/** Stable per-line fingerprints (normalized-line hashes, hex). */
export function fingerprintLyrics(lyrics: string): string[] {
  return splitLines(lyrics).map((l) => hashString(normalizeLine(l)).toString(16));
}

function splitLines(lyrics: string): string[] {
  return lyrics
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^\[.*\]$/.test(l)); // drop [Section] markers
}

export function checkOriginality(lyrics: string, opts: OriginalityOptions = {}): UniquenessReport {
  const banned = (opts.bannedWords ?? DEFAULT_BANNED_WORDS).map((w) => w.toLowerCase());
  const priors = opts.priorSongs ?? [];
  const simThreshold = opts.similarityThreshold ?? 0.6;

  const lines = splitLines(lyrics);
  const flags: UniquenessFlag[] = [];
  const rewriteSuggestions: { line: string; suggestion: string }[] = [];

  // 1) banned / avoid words
  const bannedWordsHit: string[] = [];
  const text = ' ' + normalizeLine(lyrics) + ' ';
  for (const w of banned) {
    const needle = normalizeLine(w);
    if (!needle) continue;
    if (text.includes(' ' + needle + ' ') || text.includes(' ' + needle + "'")) {
      bannedWordsHit.push(w);
      const sugg = suggestReplacement(w);
      const line = lines.find((l) => normalizeLine(l).split(' ').includes(needle.split(' ')[0]));
      flags.push({ kind: 'banned-word', detail: `avoid-word "${w}"`, line, suggestion: sugg });
      if (line && sugg) rewriteSuggestions.push({ line, suggestion: `try "${sugg}" instead of "${w}"` });
    }
  }

  // A repeating chorus is normal songcraft, so collapse identical lines to a
  // distinct set before judging "overuse" — we only care about uniqueness, not
  // how many times the hook (correctly) comes back.
  const distinct = [...new Set(lines.map(normalizeLine))].filter(Boolean);

  // 2) a single line repeating a LOT (>=6) is worth a gentle "vary a word" nudge
  const counts = new Map<string, number>();
  for (const l of lines) {
    const k = normalizeLine(l);
    if (!k) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  for (const [k, c] of counts) {
    if (c >= 6) {
      const line = lines.find((l) => normalizeLine(l) === k)!;
      flags.push({ kind: 'repeated-hook', detail: `hook line repeats ${c}× — consider varying one word`, line });
    }
  }

  // 3) overused phrase: a 4-gram that recurs across 3+ DISTINCT lines (genuine
  // filler), not the same chorus coming back around
  const gramCounts = new Map<string, number>();
  for (const dl of distinct) {
    for (const g of ngrams(dl.split(' '), 4)) gramCounts.set(g, (gramCounts.get(g) ?? 0) + 1);
  }
  for (const [g, c] of gramCounts) {
    if (c >= 3) flags.push({ kind: 'overused-phrase', detail: `phrase "${g}" used in ${c} different lines` });
  }

  // 4) clichés
  for (const c of CLICHES) {
    if (text.includes(' ' + c + ' ')) {
      flags.push({ kind: 'cliche', detail: `cliché "${c}"`, suggestion: 'make it specific to the story' });
    }
  }

  // 5) similarity to prior generated songs (line-level + fingerprint overlap)
  const fingerprints = fingerprintLyrics(lyrics);
  const fpSet = new Set(fingerprints);
  for (const prior of priors) {
    const priorLines = splitLines(prior.finalLyrics);
    // exact fingerprint collisions
    const overlap = prior.fingerprints.filter((f) => fpSet.has(f)).length;
    if (overlap >= 2) {
      flags.push({
        kind: 'too-similar',
        detail: `${overlap} lines identical to a prior song ("${prior.title}")`,
      });
    }
    // near-duplicate (and exact-duplicate) lines vs the prior song
    for (const l of lines) {
      if (l.length < 8) continue;
      for (const pl of priorLines) {
        const sim = lineSimilarity(l, pl);
        if (sim >= simThreshold) {
          const exact = normalizeLine(l) === normalizeLine(pl);
          flags.push({
            kind: 'too-similar',
            detail: exact ? `line is identical to "${prior.title}"` : `line is ${(sim * 100) | 0}% similar to "${prior.title}"`,
            line: l,
            suggestion: 'rephrase with your own image',
          });
          break;
        }
      }
    }
  }

  const score = scoreUniqueness(lines.length, flags);
  return { score, flags, fingerprints, bannedWordsHit, rewriteSuggestions };
}

function scoreUniqueness(lineCount: number, flags: UniquenessFlag[]): number {
  // Uniqueness is mostly about NOT resembling other material. Cross-song
  // similarity and clichés are the real signals; a repeating hook or an
  // avoid-word are gentle nudges, not score-killers.
  let score = 100;
  for (const f of flags) {
    switch (f.kind) {
      case 'too-similar': score -= 14; break;
      case 'cliche': score -= 6; break;
      case 'overused-phrase': score -= 4; break;
      case 'repeated-hook': score -= 2; break;
      case 'banned-word': score -= 1.5; break;
    }
  }
  if (lineCount >= 16 && flags.filter((f) => f.kind === 'too-similar').length === 0) score += 4;
  return Math.max(0, Math.min(100, Math.round(score)));
}
