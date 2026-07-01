// Vector memory — an OPTIONAL local semantic-search layer for the brain. It adds
// meaning-based recall on top of the existing rule/lexicon systems (it never replaces
// them): find memories by *what they mean*, not just exact words. Fully local + offline
// (embeddings run on-device via @xenova/transformers) and OPT-IN — the dependency is
// lazy-loaded, so the $0 core install stays light and nothing here runs unless you use it.
//
// Design notes:
//  - The embedding model is a heavy, optional dependency. We `import()` it lazily and
//    only when an embedding is actually needed, so `npm install` and CI stay light.
//    To enable it, the user installs it themselves:  npm i @xenova/transformers
//  - The *search math* (cosine similarity + ranking) is pure and dependency-free, so it
//    is fully unit-tested WITHOUT ever downloading a model.
//  - Storage is a plain JSON file (brain/vector-memory.json), same "brain is the file
//    system" pattern as the rest of the vault.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { keywords } from './text';

/** Swap the model here (or via addMemory/semanticSearch opts). Kept configurable on purpose. */
export const EMBED_CONFIG = {
  model: 'nomic-ai/nomic-embed-text-v1.5',
  /** nomic asks for a task prefix; harmless for other models. */
  queryPrefix: 'search_query: ',
  documentPrefix: 'search_document: ',
};

/** Kinds of memory we embed — used for metadata filtering in search. */
export type MemoryType = 'hook' | 'lyric' | 'preference' | 'procedural' | 'emotion';

export interface MemoryMetadata {
  type: MemoryType;
  timestamp: string;    // ISO
  score?: number;       // e.g. a banger/quality score, if relevant
  tags?: string[];
  source?: string;      // e.g. a song id
}

export interface VectorEntry {
  id: string;
  text: string;
  embedding: number[];
  metadata: MemoryMetadata;
}

export interface SearchResult {
  entry: VectorEntry;
  similarity: number;   // cosine similarity in [-1, 1]
}

export interface SearchOptions {
  topK?: number;        // max results (default 5)
  minScore?: number;    // minimum cosine similarity to include (default 0)
  type?: MemoryType;    // restrict to one memory type
  embed?: Embedder;     // inject an embedder (tests/alt models); defaults to the local model
  file?: string;        // override the store path
  /** raw query text — enables the LEXICAL half of hybrid search (set automatically by semanticSearch). */
  queryText?: string;
  /** HYBRID weight in [0,1]: 0 = pure vector (default, unchanged), 1 = pure lexical overlap.
   *  Blends deterministic keyword overlap with cosine — often better for short creative text. */
  hybrid?: number;
  /** DIVERSITY (MMR) in [0,1]: 0 = off (default), →1 = penalize results similar to ones already
   *  picked, so recall doesn't return three near-identical memories. Deterministic. */
  diversity?: number;
}

/** A function that turns text into a vector. The default is the local on-device model. */
export type Embedder = (text: string, kind: 'query' | 'document') => Promise<number[]>;

const DEFAULT_FILE = join(process.cwd(), 'brain', 'vector-memory.json');

// ----------------------------------------------------------------------------
// Pure search core — no model, no I/O. Fully testable.
// ----------------------------------------------------------------------------

/** Cosine similarity of two equal-length vectors. Returns 0 for degenerate input. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Fixed precision for ranking — 8 decimal places. Cosine values are compared as
 * integers (similarity × 1e8, rounded) so tiny floating-point / BLAS differences across
 * hardware (Intel, Apple Silicon, AMD) can't reorder results. Raw similarity is still
 * returned to the caller; only the SORT KEY is quantized.
 */
export const RANK_PRECISION = 1e8;

/** Quantize a similarity to an integer rank key (absorbs sub-1e-8 FP noise). */
export function quantize(sim: number): number {
  return Math.round(sim * RANK_PRECISION);
}

const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Rank entries against a query vector: cosine-similarity each, optionally filter by
 * type + a minimum score, sort, and cap at topK. Pure — the heart of search.
 *
 * REPRODUCIBILITY: HERMES promises deterministic output, so search must be stable
 * across machines. Two safeguards:
 *   1. Sort by the QUANTIZED rank (similarity × 1e8, rounded), not the raw float — so
 *      hardware/BLAS-level FP differences below 1e-8 never change the order.
 *   2. Deterministic TIE-BREAK: when quantized ranks are equal (very close scores), fall
 *      back to entry.id (then text) ascending — so a near-tie always resolves the same
 *      way, run to run and machine to machine.
 * The stored embeddings are the reproducible source of truth: given the same store, this
 * function returns byte-identical ordering everywhere, even if the embedding MODEL's own
 * math varies by hardware (the vectors are computed once, then persisted).
 *
 * WHY simple cosine (not HNSW/FAISS) right now: the memory set is small, so a linear
 * scan is instant and keeps us dependency-light and local-first. UPGRADE PATH: when the
 * store grows large, swap ONLY this function's body for an ANN index (e.g. hnswlib-node)
 * built from the same `entries` — the public API stays identical, so callers never change.
 */
export function rankBySimilarity(queryVec: number[], entries: VectorEntry[], opts: SearchOptions = {}): SearchResult[] {
  const { topK = 5, minScore = 0, type, queryText, hybrid = 0, diversity = 0 } = opts;
  const h = Math.max(0, Math.min(1, hybrid));

  // Score each entry. `similarity` stays the RAW cosine (what callers see); `score` is the
  // ranking key — optionally blended with deterministic lexical overlap for hybrid search.
  const scored = entries
    .filter((e) => (type ? e.metadata.type === type : true))
    .map((entry) => {
      const similarity = cosineSimilarity(queryVec, entry.embedding);
      const lexical = h > 0 && queryText ? lexicalOverlap(queryText, entry.text) : 0;
      const score = h > 0 && queryText ? (1 - h) * Math.max(0, similarity) + h * lexical : similarity;
      return { entry, similarity, score, rank: quantize(score) };
    })
    .filter((r) => r.similarity >= minScore)
    .sort((a, b) => (b.rank - a.rank) || cmp(a.entry.id, b.entry.id) || cmp(a.entry.text, b.entry.text));

  const chosen = diversity > 0 ? mmrSelect(scored, Math.max(0, Math.min(1, diversity)), topK) : scored.slice(0, topK);
  return chosen.map(({ entry, similarity }) => ({ entry, similarity })); // public result keeps the RAW similarity
}

/**
 * Deterministic lexical overlap (Jaccard over content keywords) in [0,1]. Reuses the same
 * `keywords()` the rest of the brain uses, so hybrid search agrees with the lexicon systems.
 */
export function lexicalOverlap(a: string, b: string): number {
  const ka = new Set(keywords(a, 32));
  const kb = new Set(keywords(b, 32));
  if (!ka.size || !kb.size) return 0;
  let inter = 0;
  for (const w of ka) if (kb.has(w)) inter++;
  return inter / (ka.size + kb.size - inter); // Jaccard
}

interface Scored { entry: VectorEntry; similarity: number; score: number; rank: number; }

/**
 * Maximal Marginal Relevance selection. `diversity` d in [0,1] sets how hard to push apart:
 * each next pick maximizes `(1−d)·score − d·maxSimilarityToAlreadyPicked`, so near-duplicate
 * memories don't all surface together (higher d = more diverse). Deterministic — every
 * comparison is quantized and ties break by entry.id, so the same store returns the same
 * diversified set on every machine.
 */
function mmrSelect(scored: Scored[], diversity: number, topK: number): Scored[] {
  const rel = 1 - diversity; // relevance weight
  const pool = [...scored];
  const picked: Scored[] = [];
  while (picked.length < topK && pool.length) {
    let bestIdx = 0;
    let bestKey = -Infinity;
    let bestId = '';
    for (let i = 0; i < pool.length; i++) {
      const cand = pool[i];
      let maxSim = 0;
      for (const p of picked) maxSim = Math.max(maxSim, cosineSimilarity(cand.entry.embedding, p.entry.embedding));
      const mmr = quantize(rel * cand.score - diversity * maxSim);
      if (mmr > bestKey || (mmr === bestKey && (bestId === '' || cand.entry.id < bestId))) {
        bestKey = mmr; bestIdx = i; bestId = cand.entry.id;
      }
    }
    picked.push(pool.splice(bestIdx, 1)[0]);
  }
  return picked;
}

// ----------------------------------------------------------------------------
// Store — plain JSON, graceful on missing file / bad I/O.
// ----------------------------------------------------------------------------

/** Load all stored entries (empty array if the store doesn't exist or is unreadable). */
export function loadMemories(file: string = DEFAULT_FILE): VectorEntry[] {
  try {
    if (!existsSync(file)) return [];
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    return Array.isArray(parsed?.entries) ? (parsed.entries as VectorEntry[]) : [];
  } catch {
    return [];
  }
}

/** Persist entries (creates the folder if needed). Swallows I/O errors after logging. */
export function saveMemories(entries: VectorEntry[], file: string = DEFAULT_FILE): void {
  try {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify({ model: EMBED_CONFIG.model, entries }, null, 2) + '\n');
  } catch (err) {
    console.warn('[vectorMemory] failed to save store:', err);
  }
}

// ----------------------------------------------------------------------------
// The local embedder — lazily loaded, optional dependency.
// ----------------------------------------------------------------------------

let pipePromise: Promise<(text: string, opts: unknown) => Promise<{ data: Float32Array }>> | null = null;

/** Lazy singleton: load @xenova/transformers + the feature-extraction pipeline once. */
async function getPipeline() {
  if (!pipePromise) {
    pipePromise = (async () => {
      let mod: { pipeline: (task: string, model: string) => Promise<unknown> };
      try {
        // Indirect specifier so bundlers/tsc don't require the optional dep to be present.
        const spec = '@xenova/transformers';
        mod = (await import(/* @vite-ignore */ spec)) as typeof mod;
      } catch {
        throw new Error(
          '[vectorMemory] optional dependency missing. Enable semantic memory with:  npm i @xenova/transformers',
        );
      }
      return (await mod.pipeline('feature-extraction', EMBED_CONFIG.model)) as (t: string, o: unknown) => Promise<{ data: Float32Array }>;
    })();
  }
  return pipePromise;
}

/** The default on-device embedder (mean-pooled + normalized sentence embedding). */
export const localEmbedder: Embedder = async (text, kind) => {
  const pipe = await getPipeline();
  const prefix = kind === 'query' ? EMBED_CONFIG.queryPrefix : EMBED_CONFIG.documentPrefix;
  const out = await pipe(prefix + text, { pooling: 'mean', normalize: true });
  return Array.from(out.data);
};

// ----------------------------------------------------------------------------
// Public API — add + search.
// ----------------------------------------------------------------------------

/** Embed a piece of text + store it as a memory. Returns the new entry. */
export async function addMemory(
  text: string,
  metadata: Omit<MemoryMetadata, 'timestamp'> & { timestamp?: string },
  opts: { embed?: Embedder; file?: string } = {},
): Promise<VectorEntry> {
  const embed = opts.embed ?? localEmbedder;
  const file = opts.file ?? DEFAULT_FILE;
  const embedding = await embed(text, 'document');
  const entry: VectorEntry = {
    id: `${metadata.type}-${hash(text)}`,
    text,
    embedding,
    metadata: { ...metadata, timestamp: metadata.timestamp ?? new Date().toISOString() },
  };
  const entries = loadMemories(file).filter((e) => e.id !== entry.id); // upsert
  entries.push(entry);
  saveMemories(entries, file);
  return entry;
}

/**
 * Semantic search: embed the query, cosine-rank it against every stored memory, and
 * return the top matches (optionally filtered by type + a minimum similarity).
 */
export async function semanticSearch(query: string, opts: SearchOptions = {}): Promise<SearchResult[]> {
  const embed = opts.embed ?? localEmbedder;
  const file = opts.file ?? DEFAULT_FILE;
  const queryVec = await embed(query, 'query');
  // thread the raw query text through so hybrid (lexical) search can run when opts.hybrid > 0
  return rankBySimilarity(queryVec, loadMemories(file), { queryText: query, ...opts });
}

/** Alias matching the requested API name — same behavior as semanticSearch. */
export const searchSimilar = semanticSearch;

/** Small stable id helper (djb2). */
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/*
 * ── Integration guidance (not wired yet — v1 is this module only) ────────────
 *
 * learn.ts (on saving a successful song):
 *   for (const hook of pkg.hookOptions) await addMemory(hook.text, { type: 'hook', source: pkg.id, score: pkg.score.total });
 *   await addMemory(pkg.finalLyrics, { type: 'lyric', source: pkg.id });
 *
 * originality.ts (semantic novelty — a stronger signal than exact fingerprints):
 *   const near = await semanticSearch(candidateLine, { type: 'lyric', topK: 3, minScore: 0.85 });
 *   if (near.length) flag('too-similar', `semantically close to a prior line (${(near[0].similarity*100)|0}%)`);
 *
 * procedural memory / limbic layer (meaning-based recall):
 *   const kin = await semanticSearch(brief.theme, { type: 'procedural', topK: 5 });   // similar past crafts
 *   const moodKin = await semanticSearch(brief.mood, { type: 'emotion', topK: 5 });   // similar emotional takes
 *
 * ── Example usage ────────────────────────────────────────────────────────────
 *   await addMemory('every step a promise that I build', { type: 'hook', score: 92 });
 *   const hits = await semanticSearch('a vow to keep climbing', { type: 'hook', topK: 3 });
 *   // hits[0].entry.text ≈ the hook above, hits[0].similarity ≈ 0.8+
 */
