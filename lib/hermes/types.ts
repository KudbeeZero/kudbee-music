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
}

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
  kind: 'repeated-hook' | 'overused-phrase' | 'banned-word' | 'too-similar' | 'cliche';
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
