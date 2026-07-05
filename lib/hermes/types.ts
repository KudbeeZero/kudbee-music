// HERMES HIT FACTORY — core type contracts.
// The whole studio is typed against these. Everything is local/mock-friendly in
// V1: no field here requires a paid provider.

export type AgentId =
  | 'conductor'
  | 'hooksmith'
  | 'lyric-chemist'
  | 'beat-oracle'
  | 'ar-judge'
  | 'originality-auditor'
  | 'emotion-scanner'
  | 'visual-director'
  | 'viral-clip-scout'
  | 'rights-release-guard';

export type AgentStatus = 'idle' | 'running' | 'done' | 'warning' | 'error';

export type SongStructure =
  | 'hook-first'
  | 'verse-first'
  | 'radio-edit'
  | 'short-form'
  | 'full-song';

/**
 * Rhyme-scheme dial for verse generation (roadmap 5.6 — pattern packs). Standard
 * poetic rhyme-scheme patterns, applied per 4-line verse (a 2-line unit like the
 * Bridge always resolves as a single rhymed couplet — a scheme needs at least two
 * pairs to read as distinct from AABB):
 *   AABB — sequential couplets (the original/default combinator behavior)
 *   ABAB — alternating (lines 1&3 rhyme, 2&4 rhyme)
 *   ABBA — enclosed/mirrored (lines 1&4 rhyme, 2&3 rhyme)
 *   AAAA — monorhyme (all four lines share one rhyme family)
 *   XAXA — ballad/common-meter convention (only lines 2&4 rhyme; 1&3 are free)
 * See docs/pattern-packs.md for the research this is grounded in.
 */
export type RhymeSchemeId = 'AABB' | 'ABAB' | 'ABBA' | 'AAAA' | 'XAXA';

/** Canonical runtime list of valid rhyme schemes — the single source of truth every
 *  untrusted-input boundary (pipeline normalize, share decode, vault import) validates
 *  against, so an out-of-enum string can never reach the generation path. */
export const RHYME_SCHEME_IDS: readonly RhymeSchemeId[] = ['AABB', 'ABAB', 'ABBA', 'AAAA', 'XAXA'];

/** What the user types into the Song Lab. */
export interface SongInputs {
  title: string;
  theme: string;
  mood: string;
  genre: string;
  tempoMin: number;
  tempoMax: number;
  voice: string;       // voice / persona
  audience: string;
  doNotUse: string[];  // extra avoid-words for this song (merged with the global list)
  references: string;  // inspirations, described — never copied
  structure: SongStructure;
  culture?: string;    // where you're from / what shaped you — your OWN background, as craft
  rhymeTemp?: 'tight' | 'balanced' | 'loose';  // rhyme strictness dial (perfect ↔ slant); default balanced
  rhymeScheme?: RhymeSchemeId;  // verse rhyme-pattern dial (AABB/ABAB/ABBA/AAAA/XAXA); default AABB
  /** Occasion Pack id (brain/occasionPacks.json) — genuinely NEW vocabulary (stocking,
   *  sleigh, mistletoe…) that mood/genre/references text alone can't express, unlike
   *  pattern packs which just recombine existing dials. Validated against
   *  occasionPacks.ts's OCCASION_PACKS at every untrusted-input boundary (pipeline
   *  normalize, share decode, vault import) — same discipline as rhymeScheme. */
  occasion?: string;
  /** Singability dial (docs/pattern-packs.md's "Meter/stress" backlog item, now shipped
   *  in scoped form): a `[min,max]` syllable-per-line target. Verse lines prefer the
   *  best-fitting of a few deterministic candidates instead of the first draw — a
   *  scoped slice of MCFlow's "speed" dial (Condit-Schultz), not full metric-position
   *  flow (still out of scope — see lib/hermes/meter.ts). Undefined = today's behavior,
   *  byte-identical (Iron Law #1). */
  deliveryPreferences?: { syllableTarget?: [number, number] };
}

/** The 10 Agent Network display codenames — kept in sync with AGENT_DEFINITIONS
 *  by the agents.test.ts completeness guard. Used by AgentAvatar.tsx to type
 *  its glyph map. */
export type AgentCodename =
  | 'Nexus'
  | 'Synapse'
  | 'Vylo'
  | 'Rhythmix'
  | 'Echo'
  | 'Sentinel'
  | 'Harmony'
  | 'Lumi'
  | 'Drifter'
  | 'Beacon';

/** Static metadata describing an agent (its job), independent of any run. */
export interface AgentDefinition {
  id: AgentId;
  name: string;
  role: string;
  mission: string;
  hemisphere: 'right' | 'left';   // generative vs analytical (the HERMES brain)
  inputRequirements: string[];
  /** human-readable description of what this agent emits */
  outputSchema: string;
  /** Display-only stage name ("Agent Network" branding, e.g. Council.tsx) — cosmetic
   *  alias layered over `name`/`id`. Never read by pipeline.ts, scoring, or any
   *  generated SongPackage text, so it carries zero determinism-contract risk and
   *  the committed example/golden fixtures (which embed `name`, e.g. "Hooksmith")
   *  stay byte-identical. */
  codename?: AgentCodename;
}

/** The result of running one agent in the pipeline. */
export interface AgentOutput {
  id: AgentId;
  name: string;
  status: AgentStatus;
  /** one-line headline of what the agent concluded */
  finding: string;
  /** 0–100 self-reported confidence */
  confidence: number;
  warnings: string[];
  suggestedNextAction: string;
  /** the agent's structured payload, shape depends on the agent */
  data: Record<string, unknown>;
}

export interface HookOption {
  text: string;
  angle: string;        // why it works
  cadence: string;      // delivery feel
  score: number;        // 0–100 stickiness (Hooksmith's own estimate)
}

export interface SongSection {
  label: string;        // Intro / Verse 1 / Hook / Bridge ...
  lines: string[];
}

export interface ProductionNotes {
  tempoBpm: number;
  drums: string;
  bass: string;
  instrumentation: string[];
  arrangement: string[];   // energy curve, section-by-section
  genreBlend: string;
  mixVibe: string;
}

export interface VocalNotes {
  delivery: string;
  adlibs: string[];
  doublesAndStacks: string;
}

export interface VisualPackage {
  albumCoverPrompt: string;
  musicVideoPrompt: string;     // cinematic 16:9
  sceneIdeas: string[];
  shortFormClipIdeas: string[];
}

export interface ViralClip {
  label: string;
  startHint: string;   // which section / approx position
  durationSec: number;
  caption: string;
  hookLine: string;
}

export interface BangerScore {
  hookStrength: number;       // 0–20
  emotionalClarity: number;   // 0–20
  originality: number;        // 0–20
  replayValue: number;        // 0–15
  visualIdentity: number;     // 0–10
  shortFormPotential: number; // 0–10
  releaseReadiness: number;   // 0–5
  total: number;              // 0–100
  verdict: string;
}

export interface UniquenessFlag {
  kind: 'repeated-hook' | 'overused-phrase' | 'banned-word' | 'too-similar' | 'cliche' | 'famous-phrase';
  detail: string;
  line?: string;
  suggestion?: string;
}

export interface UniquenessReport {
  score: number;               // 0–100
  flags: UniquenessFlag[];
  /** stable fingerprints for vault comparison */
  fingerprints: string[];
  bannedWordsHit: string[];
  rewriteSuggestions: { line: string; suggestion: string }[];
}

export interface ReleaseChecklistItem {
  label: string;
  ok: boolean;
  note?: string;
}

/** The full deliverable shown in the UI and stored in the vault. */
export interface SongPackage {
  id: string;
  title: string;
  createdAt: string;           // ISO
  version: number;
  inputs: SongInputs;
  brief: string;               // Conductor's creative brief
  conceptSummary: string;
  hookOptions: HookOption[];
  chosenHook: HookOption | null;
  sections: SongSection[];
  finalLyrics: string;
  production: ProductionNotes;
  vocals: VocalNotes;
  visuals: VisualPackage;
  viralClips: ViralClip[];
  promoCaption: string;
  uniqueness: UniquenessReport;
  score: BangerScore;
  release: ReleaseChecklistItem[];
  agentOutputs: AgentOutput[];
  /** The dual-process decision behind the chosen hook (first→second thought→verdict). */
  cognition?: Deliberation | null;
  /** The regeneration nonce this package was minted with — lets the trace replay honestly. */
  seed?: number;
}

/** A key naming which reflective challenge a critique represents — stable across runs. */
export type CritiqueKey = 'true' | 'original' | 'earns-it';

/** One reflective challenge (second thought) against a proposal. */
export interface Critique {
  key: CritiqueKey;
  question: string;
  passes: boolean;
  note: string;
}

/** First thought → second thought → decision on a proposal (usually the lead hook). */
export interface Deliberation {
  firstThought: string;       // the fast, generative proposal (right hemisphere)
  secondThought: Critique[];  // the reflective challenges (left hemisphere)
  verdict: 'keep' | 'revise';
  decision: string;           // the integrated call (the artist gets the final say)
  confidence: number;         // 0..1 — share of challenges the proposal survives
}

/** Returned by the pipeline runner. */
export interface PipelineResult {
  pkg: SongPackage;
  agentOutputs: AgentOutput[];
}

export interface PipelineProgress {
  agentId: AgentId;
  index: number;        // 0-based step
  total: number;
  status: AgentStatus;
  output?: AgentOutput;
}
