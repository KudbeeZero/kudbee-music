// Semantic originality — a MEANING-level novelty check that layers on top of the
// fingerprint/bigram check in originality.ts. The base check catches exact + reworded
// lines; this catches a paraphrase that reuses NONE of the same words but says the same
// thing, by comparing embeddings against the vault's stored lines (see vectorRecall.ts).
//
// Server/CLI-only ON PURPOSE (it imports vectorMemory → node:fs): the browser originality
// check stays as-is, and this optional layer never enters the client bundle. Opt-in +
// graceful — no embedding dep installed ⇒ empty result, $0 core unaffected.
import type { UniquenessReport, UniquenessFlag } from './types';
import { semanticSearch, type Embedder } from './vectorMemory';

export interface SemanticOriginalityOptions {
  embed?: Embedder;
  file?: string;
  /** cosine similarity at/above which a line is flagged as meaning-close (default 0.85). */
  minScore?: number;
}

/** Real lyric lines only (drop [Section] markers + very short lines). */
function lyricLines(lyrics: string): string[] {
  return lyrics.split('\n').map((l) => l.trim()).filter((l) => l.length > 7 && !/^\[.*\]$/.test(l));
}

/**
 * Flag lines that are semantically close to a stored prior line/hook. Returns
 * UniquenessFlags ('too-similar') so they merge cleanly with the base report. Graceful:
 * if the embedding dep is missing, returns []. Deterministic given the same store.
 */
export async function semanticOriginality(
  lyrics: string,
  opts: SemanticOriginalityOptions = {},
): Promise<UniquenessFlag[]> {
  const min = opts.minScore ?? 0.85;
  const flags: UniquenessFlag[] = [];
  const seen = new Set<string>();
  for (const line of lyricLines(lyrics)) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      const hits = await semanticSearch(line, { topK: 1, minScore: min, embed: opts.embed, file: opts.file });
      if (hits.length) {
        flags.push({
          kind: 'too-similar',
          detail: `line is ~${(hits[0].similarity * 100) | 0}% close in MEANING to a prior line — a paraphrase the word-level check misses`,
          line,
          suggestion: 'rephrase with your own image',
        });
      }
    } catch {
      return flags; // optional dep missing → stop; the base report already stands on its own
    }
  }
  return flags;
}

/** Penalty per semantic near-duplicate — mirrors the base 'too-similar' weight. */
const SEMANTIC_PENALTY = 14;

/**
 * Merge semantic flags into a base UniquenessReport (append + re-score). Pure — no I/O,
 * no embeddings — so the merge logic is unit-testable on its own. New flags don't
 * double-count a line the base check already flagged as too-similar.
 */
export function mergeSemanticFlags(report: UniquenessReport, semantic: UniquenessFlag[]): UniquenessReport {
  const alreadyFlagged = new Set(
    report.flags.filter((f) => f.kind === 'too-similar' && f.line).map((f) => f.line!.toLowerCase()),
  );
  const fresh = semantic.filter((f) => !(f.line && alreadyFlagged.has(f.line.toLowerCase())));
  if (!fresh.length) return report;
  const score = Math.max(0, Math.min(100, report.score - fresh.length * SEMANTIC_PENALTY));
  return { ...report, flags: [...report.flags, ...fresh], score };
}
