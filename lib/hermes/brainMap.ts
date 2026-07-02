// The brain's anatomy — the single source of truth for what the brain is made of
// and how its parts connect. Each REGION is a functional area that maps to a real
// knowledge file (the file-system "vault"); each PATHWAY is a nerve along which the
// nervous system carries a signal. The Brain Scan renders this; the nervous system
// fires along it.
import type { AgentId, AgentOutput, AgentStatus } from './types';

export type RegionId =
  | 'intent' | 'language' | 'values' | 'generative' | 'analytical'
  | 'decision' | 'limbic' | 'default-mode' | 'reward' | 'short-term' | 'long-term';

export type RegionState = 'idle' | 'running' | 'done' | 'soon';

export interface Region {
  id: RegionId;
  label: string;
  doc: string;                  // the knowledge file this region IS
  side: 'left' | 'right' | 'center';
  agents: AgentId[];            // lights when any of these fire
  x: number; y: number;         // position on the 440×300 brain
  soon?: boolean;               // not wired yet
}

// Functional areas. Memory is split into short-term (the live session) and
// long-term (the persisted vault/profile) — the two memory systems.
export const REGIONS: Region[] = [
  { id: 'intent', label: 'Intent', doc: 'the brief', side: 'center', agents: ['conductor'], x: 220, y: 54 },
  { id: 'language', label: 'Language & Culture', doc: 'lib/hermes/language.ts', side: 'left', agents: ['lyric-chemist'], x: 146, y: 96 },
  { id: 'values', label: 'Values', doc: 'brain/beliefs.json', side: 'center', agents: ['conductor'], x: 256, y: 104 },
  { id: 'generative', label: 'Generative (right)', doc: 'brain/personas.json', side: 'right', agents: ['hooksmith', 'lyric-chemist', 'visual-director', 'viral-clip-scout'], x: 338, y: 150 },
  { id: 'analytical', label: 'Analytical (left)', doc: 'originality + scoring', side: 'left', agents: ['beat-oracle', 'originality-auditor'], x: 100, y: 150 },
  { id: 'decision', label: 'Decision', doc: 'the Writers-Room (process.ts)', side: 'center', agents: ['ar-judge', 'rights-release-guard'], x: 224, y: 150 },
  { id: 'limbic', label: 'Limbic (emotion)', doc: 'lib/hermes/emotion.ts', side: 'right', agents: ['emotion-scanner'], x: 316, y: 196 },
  { id: 'default-mode', label: 'Default Mode', doc: 'lib/hermes/defaultMode.ts', side: 'center', agents: ['hooksmith'], x: 72, y: 196 },
  { id: 'reward', label: 'Reward', doc: 'lib/hermes/reward.ts', side: 'right', agents: ['ar-judge'], x: 372, y: 108 },
  { id: 'short-term', label: 'Short-term', doc: 'working memory (this session)', side: 'center', agents: ['hooksmith', 'lyric-chemist'], x: 150, y: 222 },
  { id: 'long-term', label: 'Long-term', doc: 'brain/memory.json + the vault', side: 'center', agents: ['originality-auditor'], x: 272, y: 222 },
];

// The nerves — directed signal pathways between regions.
export const PATHWAYS: [RegionId, RegionId][] = [
  ['intent', 'values'], ['intent', 'decision'], ['language', 'analytical'],
  ['values', 'decision'], ['decision', 'generative'], ['decision', 'analytical'],
  ['generative', 'short-term'], ['analytical', 'short-term'], ['analytical', 'long-term'],
  ['short-term', 'long-term'],
  ['decision', 'limbic'], ['limbic', 'generative'], ['limbic', 'short-term'],
  ['default-mode', 'generative'], ['default-mode', 'decision'], ['default-mode', 'analytical'],
  ['reward', 'generative'], ['reward', 'decision'], ['limbic', 'reward'],
];

export function region(id: RegionId): Region | undefined {
  return REGIONS.find((r) => r.id === id);
}

/** Which region an agent belongs to (first match). */
export function agentRegion(agentId: AgentId): Region | undefined {
  return REGIONS.find((r) => r.agents.includes(agentId));
}

/** A region's live state from the per-agent outputs the pipeline emits. */
export function regionState(r: Region, outputs: Record<string, AgentOutput>): RegionState {
  if (r.soon) return 'soon';
  const states = r.agents.map((a) => outputs[a]?.status).filter(Boolean) as AgentStatus[];
  if (states.some((s) => s === 'running')) return 'running';
  if (states.length && states.every((s) => s === 'done' || s === 'warning')) return 'done';
  return 'idle';
}

/** The pathways currently carrying a signal — any nerve touching a running region. */
export function activePathways(outputs: Record<string, AgentOutput>): [RegionId, RegionId][] {
  const runningIds = new Set(
    REGIONS.filter((r) => regionState(r, outputs) === 'running').map((r) => r.id),
  );
  return PATHWAYS.filter(([a, b]) => runningIds.has(a) || runningIds.has(b));
}

// =====================================================================================
// The Deep Brain Atlas — subregions. Each hub REGION fans out into named subsections,
// like the constellations of a real cortex. The naming language is human neuroanatomy;
// the ground truth is the codebase: every subregion's `doc` points at a REAL module —
// and function — that runs (the same honesty rule as Region.doc, one level deeper).
// `wired:false` marks the two node/CLI-only modules that never ship to the browser —
// rendered dim rather than pretended.

export type SubregionId =
  | 'goal-encoding' | 'conductor-plan'
  | 'wernicke' | 'broca' | 'temporal-lexicon' | 'auditory-cortex' | 'angular-gyrus'
  | 'vmpfc' | 'constitution'
  | 'hook-furnace' | 'persona-overlay' | 'voice-mirror' | 'imagery-studio'
  | 'pattern-auditor' | 'scorekeeper' | 'safety-screen' | 'hook-council' | 'semantic-auditor'
  | 'writers-room' | 'acc' | 'corpus-callosum' | 'crossroads'
  | 'amygdala' | 'affective-arc' | 'insula' | 'affect-diction'
  | 'mpfc-drift' | 'thermal-signature'
  | 'vta-spark' | 'ofc-valuation'
  | 'working-buffer'
  | 'hippocampus' | 'semantic-store' | 'consolidation' | 'basal-ganglia' | 'procedural-memory' | 'ca3-recall';

export interface Subregion {
  id: SubregionId;
  parent: RegionId;
  label: string;   // the anatomical name
  role: string;    // what it does here, in plain language
  doc: string;     // the real code: "file#function" (function may be module-internal)
  dx: number;      // satellite offset from the parent hub, in brain (440×300) units
  dy: number;
  wired: boolean;  // false = node/CLI-only, rendered dim
}

export const SUBREGIONS: Subregion[] = [
  // intent — prefrontal goal setting
  { id: 'goal-encoding', parent: 'intent', label: 'dlPFC goal encoding', role: 'normalize the brief (tempo clamps, text caps)', doc: 'lib/hermes/pipeline.ts#normalizeInputs', dx: -32, dy: -18, wired: true },
  { id: 'conductor-plan', parent: 'intent', label: 'Conductor plan', role: 'route the job across the agent pipeline', doc: 'lib/hermes/agents.ts#getAgent', dx: 32, dy: -18, wired: true },

  // language — the language cortex
  { id: 'wernicke', parent: 'language', label: "Wernicke's area", role: "comprehend the artist's meaning → register + diction", doc: 'lib/hermes/language.ts#deriveLanguage', dx: -36, dy: -10, wired: true },
  { id: 'broca', parent: 'language', label: "Broca's area", role: "produce guidance in the artist's own register", doc: 'lib/hermes/language.ts#languageCoaching', dx: -26, dy: -30, wired: true },
  { id: 'temporal-lexicon', parent: 'language', label: 'Temporal lexicon', role: 'the vocabulary store (syllables, affect, imagery)', doc: 'lib/hermes/lexicon.ts#wordInfo', dx: -2, dy: -38, wired: true },
  { id: 'auditory-cortex', parent: 'language', label: 'Auditory cortex', role: 'rhyme + sound patterning (scheme, density, slant)', doc: 'lib/hermes/rhyme.ts#rhymeScheme', dx: 22, dy: -30, wired: true },
  { id: 'angular-gyrus', parent: 'language', label: 'Angular gyrus', role: 'bind imagery + metaphor to the theme', doc: 'lib/hermes/lexicon.ts#byImagery', dx: 34, dy: -10, wired: true },

  // values — the constitution
  { id: 'vmpfc', parent: 'values', label: 'vmPFC', role: 'integrate the belief system into every decision', doc: 'lib/hermes/beliefs.ts#beliefsFor', dx: -18, dy: -26, wired: true },
  { id: 'constitution', parent: 'values', label: 'Constitution', role: 'the belief store itself (truth-first, original-only)', doc: 'brain/beliefs.json', dx: 16, dy: -28, wired: true },

  // generative — the right hemisphere at work
  { id: 'hook-furnace', parent: 'generative', label: 'Hook furnace (right STG)', role: 'forge hook candidates from angle + lexicon', doc: 'lib/hermes/pipeline.ts#runPipeline (hooksmith stage)', dx: 38, dy: -16, wired: true },
  { id: 'persona-overlay', parent: 'generative', label: 'Persona overlay', role: 'craft-DNA archetypes lend their moves', doc: 'lib/hermes/personas.ts#personaOverlay', dx: 44, dy: 8, wired: true },
  { id: 'voice-mirror', parent: 'generative', label: 'Voice mirror', role: "how much of the song is already the artist's own voice", doc: 'lib/hermes/becomingYou.ts#voiceMirror', dx: 30, dy: 30, wired: true },
  { id: 'imagery-studio', parent: 'generative', label: 'Imagery studio', role: 'album-cover + visual direction from the concept', doc: 'lib/hermes/pipeline.ts#runPipeline (visual-director stage)', dx: 10, dy: 38, wired: true },

  // analytical — the left hemisphere audit chain
  { id: 'pattern-auditor', parent: 'analytical', label: 'Pattern auditor', role: 'fingerprint originality against the vault', doc: 'lib/hermes/originality.ts#checkOriginality', dx: -38, dy: -14, wired: true },
  { id: 'scorekeeper', parent: 'analytical', label: 'Scorekeeper', role: 'the 7-category banger score /100', doc: 'lib/hermes/scoring.ts#scoreSong', dx: -42, dy: 8, wired: true },
  { id: 'safety-screen', parent: 'analytical', label: 'Safety screen', role: 'famous-phrase check — original-only stays true', doc: 'lib/hermes/safety.ts#screenFamousPhrases', dx: -28, dy: -32, wired: true },
  { id: 'hook-council', parent: 'analytical', label: 'Hook council', role: 'rank hooks across challenge · crave · confidence', doc: 'lib/hermes/council.ts#rankHooksByCouncil', dx: -6, dy: -38, wired: true },
  { id: 'semantic-auditor', parent: 'analytical', label: 'Semantic auditor', role: 'meaning-level paraphrase check (CLI lane)', doc: 'lib/hermes/semanticOriginality.ts#mergeSemanticFlags', dx: -14, dy: 34, wired: false },

  // decision — executive control
  { id: 'writers-room', parent: 'decision', label: 'dlPFC writers-room', role: 'the step-by-step craft process, guided', doc: 'lib/hermes/process.ts#guideStep', dx: -24, dy: 24, wired: true },
  { id: 'acc', parent: 'decision', label: 'ACC', role: 'conflict monitoring — the second-thought critiques', doc: 'lib/hermes/cognition.ts#deliberate', dx: -2, dy: 34, wired: true },
  { id: 'corpus-callosum', parent: 'decision', label: 'Corpus callosum', role: 'integrate fast instinct with slow deliberation', doc: 'lib/hermes/cognition.ts#selectHookByCognition', dx: 22, dy: 26, wired: true },
  { id: 'crossroads', parent: 'decision', label: 'Crossroads', role: 'the decision made social — community steering', doc: 'lib/hermes/crossroads.ts#decide', dx: 2, dy: -30, wired: true },

  // limbic — the emotional core
  { id: 'amygdala', parent: 'limbic', label: 'Amygdala', role: 'the raw affect read (valence, intensity, contrast)', doc: 'lib/hermes/emotion.ts#deriveEmotion', dx: -28, dy: 22, wired: true },
  { id: 'affective-arc', parent: 'limbic', label: 'Affective arc', role: 'the feeling traced across sections', doc: 'lib/hermes/emotion.ts#emotionalArc', dx: -4, dy: 36, wired: true },
  { id: 'insula', parent: 'limbic', label: 'Insula', role: 'felt clarity — does the song feel what it says?', doc: 'lib/hermes/emotion.ts#emotionClarity', dx: 22, dy: 30, wired: true },
  { id: 'affect-diction', parent: 'limbic', label: 'Affect–diction loop', role: 'emotion colors word choice from the lexicon', doc: 'lib/hermes/lexicon.ts#byAffect', dx: 40, dy: 12, wired: true },

  // default-mode — creativity at rest
  { id: 'mpfc-drift', parent: 'default-mode', label: 'mPFC drift', role: 'divergent angles surfaced before focus narrows', doc: 'lib/hermes/defaultMode.ts#divergentAngles', dx: -28, dy: 16, wired: true },
  { id: 'thermal-signature', parent: 'default-mode', label: 'Thermal signature', role: 'whole-brain temperature — where this artist runs hot', doc: 'lib/hermes/heat.ts#brainHeat', dx: -6, dy: 34, wired: true },

  // reward — the dopamine circuit
  { id: 'vta-spark', parent: 'reward', label: 'VTA spark', role: 'crave-ability — will the hook pull a replay?', doc: 'lib/hermes/reward.ts#craveScore', dx: 30, dy: -16, wired: true },
  { id: 'ofc-valuation', parent: 'reward', label: 'OFC valuation', role: 'reward-guided next moves for this artist', doc: 'lib/hermes/recommend.ts#recommend', dx: 34, dy: 10, wired: true },

  // short-term — the session
  { id: 'working-buffer', parent: 'short-term', label: 'Working buffer', role: 'session RAM — holds, decays, consolidates', doc: 'lib/hermes/workingMemory.ts#createWorkingMemory', dx: 0, dy: 36, wired: true },

  // long-term — the memory systems
  { id: 'hippocampus', parent: 'long-term', label: 'Hippocampus (episodic)', role: 'the vault — every song you kept', doc: 'lib/hermes/storage.ts#listSongs', dx: -34, dy: 14, wired: true },
  { id: 'semantic-store', parent: 'long-term', label: 'Semantic store', role: 'learned exclusions + preferences', doc: 'lib/hermes/memory.ts#allAvoidWords', dx: -16, dy: 32, wired: true },
  { id: 'consolidation', parent: 'long-term', label: 'Consolidation', role: 'episodic → semantic: the artist profile', doc: 'lib/hermes/learn.ts#learnProfile', dx: 6, dy: 36, wired: true },
  { id: 'basal-ganglia', parent: 'long-term', label: 'Basal ganglia (habit)', role: 'taste learned from your edits', doc: 'lib/hermes/edits.ts#diffEdit', dx: 28, dy: 28, wired: true },
  { id: 'procedural-memory', parent: 'long-term', label: 'Procedural memory', role: 'the recurring craft moves — the how, not the what', doc: 'lib/hermes/procedural.ts#proceduralMemory', dx: 42, dy: 8, wired: true },
  { id: 'ca3-recall', parent: 'long-term', label: 'CA3 pattern completion', role: 'vector recall of meaning-close past wins (node lane)', doc: 'lib/hermes/vectorRecall.ts#recallSimilarCraft', dx: 38, dy: -14, wired: false },
];

/** The satellites of one hub. */
export function subregionsOf(parent: RegionId): Subregion[] {
  return SUBREGIONS.filter((s) => s.parent === parent);
}

/** A subregion's absolute position on the 440×300 brain (hub + offset, clamped). */
export function subregionPos(s: Subregion): { x: number; y: number } {
  const hub = region(s.parent);
  const x = (hub?.x ?? 220) + s.dx;
  const y = (hub?.y ?? 150) + s.dy;
  return { x: Math.max(8, Math.min(432, x)), y: Math.max(8, Math.min(292, y)) };
}
