// Learn → vector recall — the brain as a coach. Stores a finished song's winning hook
// (and lead line) into SEMANTIC memory, then recalls meaning-close past work later.
//
// This lives in its OWN module (not learn.ts / recommend.ts) ON PURPOSE: it depends on
// vectorMemory.ts, which imports node:fs/node:path. Keeping it separate means the client
// bundle (which imports learn/recommend) never pulls Node built-ins — the $0 web app
// stays buildable, and this opt-in, server/CLI-side layer never touches the browser.
import type { SongPackage } from './types';
import type { Recommendation } from './recommend';
import { addMemory, semanticSearch, type Embedder } from './vectorMemory';

/**
 * Consolidate a finished song into semantic memory — store its winning hook (and the
 * lead lyric) so the brain can later recall "you've written something like this" by
 * MEANING, not just exact words. OPTIONAL + graceful: embeddings are the lazy, opt-in
 * dependency, so if it isn't installed (the $0 default) this is a silent no-op. Returns
 * how many memories were stored. Pass a fake `embed` in tests to exercise it offline.
 */
export async function rememberSong(
  pkg: SongPackage,
  opts: { embed?: Embedder; file?: string } = {},
): Promise<number> {
  // Store one memory per FACET so each agent system can recall by its own lens:
  //  hook       → Council / deliberation ("have I written a hook like this?")
  //  lyric      → originality (semantic near-duplicate lines)
  //  procedural → "have I crafted this THEME before?" (procedural memory)
  //  emotion    → "have I chased this FEELING before?" (limbic layer)
  const items: { text: string; type: 'hook' | 'lyric' | 'procedural' | 'emotion' }[] = [];
  if (pkg.chosenHook?.text) items.push({ text: pkg.chosenHook.text, type: 'hook' });
  const lead = pkg.sections.find((s) => s.lines.length > 1)?.lines[0];
  if (lead) items.push({ text: lead, type: 'lyric' });
  if (pkg.inputs?.theme) items.push({ text: pkg.inputs.theme, type: 'procedural' });
  if (pkg.inputs?.mood) items.push({ text: pkg.inputs.mood, type: 'emotion' });

  let stored = 0;
  for (const it of items) {
    try {
      await addMemory(it.text, { type: it.type, source: pkg.id, score: pkg.score.total }, opts);
      stored++;
    } catch {
      // optional embedding dep not installed → skip silently, $0 core stays intact
    }
  }
  return stored;
}

/**
 * Semantic recall — given what you're about to write, surface a past hook that MEANS
 * something similar ("you've been here before — build on it, or deliberately diverge").
 * Graceful: if the embedding dep isn't installed, returns null. Async + injectable so
 * it's testable offline with a fake embedder.
 */
export async function recommendSimilar(
  query: string,
  opts: { embed?: Embedder; file?: string; minScore?: number } = {},
): Promise<Recommendation | null> {
  try {
    const hits = await semanticSearch(query, {
      type: 'hook', topK: 1, minScore: opts.minScore ?? 0.8, embed: opts.embed, file: opts.file,
    });
    if (!hits.length) return null;
    const pct = Math.round(hits[0].similarity * 100);
    return {
      kind: 'craft',
      title: "You've written something like this",
      detail: `“${hits[0].entry.text}” reads ~${pct}% close in meaning. Build on it for a signature — or deliberately diverge so you're not repeating yourself.`,
    };
  } catch {
    return null; // optional dep missing → no semantic recall, everything else still works
  }
}

/** One recalled memory: the stored text, its source song, and how close it is (0..1). */
export interface Recall {
  text: string;
  source?: string;
  similarity: number;
}

/** Options an agent recall accepts — includes the hybrid + diversity knobs from vectorMemory. */
export interface RecallOptions {
  embed?: Embedder;
  file?: string;
  topK?: number;
  minScore?: number;
  hybrid?: number;     // 0..1 — blend lexical overlap into ranking (creative-text friendly)
  diversity?: number;  // 0..1 — MMR: don't return near-identical memories (great for procedural/originality)
}

/** Shared typed-recall core — embed the query, return the closest memories of one type. */
async function recall(
  query: string,
  type: 'hook' | 'lyric' | 'procedural' | 'emotion',
  opts: RecallOptions = {},
): Promise<Recall[]> {
  try {
    const hits = await semanticSearch(query, {
      type, topK: opts.topK ?? 3, minScore: opts.minScore ?? 0.75,
      embed: opts.embed, file: opts.file, hybrid: opts.hybrid, diversity: opts.diversity,
    });
    return hits.map((h) => ({ text: h.entry.text, source: h.entry.metadata.source, similarity: h.similarity }));
  } catch {
    return []; // optional dep missing → empty; each agent falls back to its rule-based path
  }
}

/**
 * PROCEDURAL memory recall — "have I crafted this kind of theme before?" Surfaces past
 * songs whose theme is semantically close, so the brain can lean on (or deliberately break)
 * a craft pattern it's used before. Opt-in + graceful.
 */
export function recallSimilarCraft(theme: string, opts?: RecallOptions): Promise<Recall[]> {
  return recall(theme, 'procedural', opts);
}

/**
 * LIMBIC recall — "have I chased this feeling before?" Surfaces past songs with a
 * semantically close mood, so the emotion layer can recall how it handled a similar take.
 */
export function recallSimilarEmotion(mood: string, opts?: RecallOptions): Promise<Recall[]> {
  return recall(mood, 'emotion', opts);
}

/**
 * COUNCIL / deliberation recall — "have I written a hook like this before?" Surfaces past
 * hooks close in meaning, so the board can flag self-repetition before it ships.
 */
export function recallSimilarHook(hookText: string, opts?: RecallOptions): Promise<Recall[]> {
  return recall(hookText, 'hook', opts);
}
