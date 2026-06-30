// The HERMES pipeline. Runs the 10 agents in order, each emitting a typed
// AgentOutput, then assembles the SongPackage. Fully local/mock in V1 — pass a
// different ProviderBundle later to go live.
import type {
  SongInputs, SongPackage, AgentOutput, AgentId, PipelineResult, PipelineProgress,
  HookOption, SongSection, ViralClip, ReleaseChecklistItem,
} from './types';
import type { ProviderBundle } from './providers/providerTypes';
import { mockProviders } from './providers/mockProviders';
import { checkOriginality, fingerprintLyrics, type PriorSong } from './originality';
import { scoreSong } from './scoring';
import { DEFAULT_BANNED_WORDS } from './bannedWords';
import { keywords, titleCase } from './text';

export interface RunOptions {
  providers?: ProviderBundle;
  bannedWords?: string[];
  priorSongs?: PriorSong[];
  onProgress?: (p: PipelineProgress) => void;
  /** stable id + timestamp injection (tests pass fixed values) */
  id?: string;
  now?: string;
}

const ORDER: AgentId[] = [
  'conductor', 'hooksmith', 'lyric-chemist', 'beat-oracle', 'emotion-scanner',
  'originality-auditor', 'ar-judge', 'visual-director', 'viral-clip-scout',
  'rights-release-guard',
];

function lyricsText(sections: SongSection[]): string {
  return sections.map((s) => `[${s.label}]\n${s.lines.join('\n')}`).join('\n\n');
}

function emotionClarity(inputs: SongInputs, sections: SongSection[]): number {
  // heuristic: clear theme + audience + a bridge (turn) + reasonable length
  let c = 0.4;
  if (keywords(inputs.theme).length >= 2) c += 0.2;
  if (inputs.audience.trim()) c += 0.15;
  if (sections.some((s) => /bridge/i.test(s.label))) c += 0.15;
  const lines = sections.reduce((a, b) => a + b.lines.length, 0);
  if (lines >= 10) c += 0.1;
  return Math.min(1, c);
}

export async function runPipeline(inputs: SongInputs, opts: RunOptions = {}): Promise<PipelineResult> {
  const providers = opts.providers ?? mockProviders;
  const banned = (opts.bannedWords ?? DEFAULT_BANNED_WORDS).concat(inputs.doNotUse ?? []);
  const outputs: AgentOutput[] = [];
  const emit = (o: AgentOutput) => {
    outputs.push(o);
    const index = ORDER.indexOf(o.id);
    opts.onProgress?.({ agentId: o.id, index, total: ORDER.length, status: o.status, output: o });
  };
  const announce = (id: AgentId) =>
    opts.onProgress?.({ agentId: id, index: ORDER.indexOf(id), total: ORDER.length, status: 'running' });

  // 1) Conductor — brief
  announce('conductor');
  const ks = keywords([inputs.theme, inputs.mood, inputs.references].join(' '));
  const concept =
    `${titleCase(inputs.genre)} record for ${inputs.audience || 'a personal audience'}: ` +
    `${inputs.theme.trim() || 'an untitled idea'} — delivered ${inputs.mood || 'with feeling'}, ` +
    `voiced as ${inputs.voice || 'the artist'}.`;
  const brief =
    `Make a ${inputs.structure.replace('-', ' ')} ${inputs.genre} song titled "${inputs.title || 'Untitled'}". ` +
    `Center it on: ${ks.join(', ') || 'the core feeling'}. Keep it grounded and specific — not corny. ` +
    `Tempo ${inputs.tempoMin}-${inputs.tempoMax} BPM. References (feel, never copied): ${inputs.references || 'none given'}.`;
  emit({
    id: 'conductor', name: 'HERMES Conductor', status: 'done',
    finding: `Brief locked: ${inputs.structure} ${inputs.genre} for ${inputs.audience || 'you'}.`,
    confidence: 88, warnings: inputs.title ? [] : ['No title yet — using "Untitled".'],
    suggestedNextAction: 'Hand the brief to Hooksmith.',
    data: { brief, concept },
  });

  // 2) Hooksmith — hooks
  announce('hooksmith');
  const hookOptions: HookOption[] = await providers.lyrics.generateHooks(inputs, 5);
  const chosenHook = hookOptions.slice().sort((a, b) => b.score - a.score)[0] ?? null;
  emit({
    id: 'hooksmith', name: 'Hooksmith', status: hookOptions.length ? 'done' : 'warning',
    finding: chosenHook ? `Lead hook: "${chosenHook.text}"` : 'No hook generated.',
    confidence: chosenHook ? Math.min(95, chosenHook.score + 10) : 30,
    warnings: hookOptions.length < 3 ? ['Fewer than 3 hooks — widen the theme.'] : [],
    suggestedNextAction: 'Build verses from the lead hook.',
    data: { hookOptions, chosenHook },
  });

  // 3) Lyric Chemist — sections + lyrics
  announce('lyric-chemist');
  const sections: SongSection[] = chosenHook
    ? await providers.lyrics.generateSections(inputs, chosenHook)
    : [];
  const finalLyrics = lyricsText(sections);
  emit({
    id: 'lyric-chemist', name: 'Lyric Chemist', status: sections.length ? 'done' : 'error',
    finding: `${sections.length} sections, ${sections.reduce((a, b) => a + b.lines.length, 0)} lines.`,
    confidence: 84, warnings: [],
    suggestedNextAction: 'Send lyrics to Emotion Scanner + Originality Auditor.',
    data: { sections },
  });

  // 4) Beat Oracle — production
  announce('beat-oracle');
  const production = await providers.audio.suggestProduction(inputs);
  emit({
    id: 'beat-oracle', name: 'Beat Oracle', status: 'done',
    finding: `${production.tempoBpm} BPM · ${production.drums}`,
    confidence: 80, warnings: [],
    suggestedNextAction: 'Lock arrangement to the hook placement.',
    data: { production },
  });

  // 5) Emotion Scanner
  announce('emotion-scanner');
  const clarity = emotionClarity(inputs, sections);
  const emoWarn = clarity < 0.6 ? ['Emotional arc is thin — add a clear turn/payoff.'] : [];
  emit({
    id: 'emotion-scanner', name: 'Emotion Scanner', status: clarity < 0.5 ? 'warning' : 'done',
    finding: `Emotional clarity ${(clarity * 100) | 0}/100 (problem → tension → payoff).`,
    confidence: 76, warnings: emoWarn,
    suggestedNextAction: clarity < 0.6 ? 'Strengthen the bridge turn.' : 'Proceed to scoring.',
    data: { clarity, arc: ['problem', 'tension', 'payoff'] },
  });

  // 6) Originality Auditor
  announce('originality-auditor');
  const uniqueness = checkOriginality(finalLyrics, {
    bannedWords: banned, priorSongs: opts.priorSongs ?? [],
  });
  emit({
    id: 'originality-auditor', name: 'Originality Auditor',
    status: uniqueness.flags.some((f) => f.kind === 'too-similar') ? 'warning' : 'done',
    finding: `Uniqueness ${uniqueness.score}/100 · ${uniqueness.flags.length} flag(s).`,
    confidence: 90,
    warnings: uniqueness.flags.slice(0, 4).map((f) => f.detail),
    suggestedNextAction: uniqueness.rewriteSuggestions.length
      ? 'Apply suggested rewrites before release.' : 'Clean — proceed.',
    data: { uniqueness },
  });

  // 7) Visual Director (needed by A&R score)
  announce('visual-director');
  const albumCoverPrompt = await providers.image.albumCoverPrompt(inputs, concept);
  const video = await providers.video.musicVideoPrompt(inputs, concept);
  const visuals = {
    albumCoverPrompt,
    musicVideoPrompt: video.prompt,
    sceneIdeas: video.scenes,
    shortFormClipIdeas: [
      'Hook punch-in with on-screen lyric',
      'Behind-the-scenes studio reaction to the drop',
      'Single-take walk synced to the bridge',
    ],
  };
  emit({
    id: 'visual-director', name: 'Visual Director', status: 'done',
    finding: 'Album cover + cinematic 16:9 video direction ready.',
    confidence: 78, warnings: [],
    suggestedNextAction: 'Pass scenes to Viral Clip Scout.',
    data: { visuals },
  });

  // 8) Viral Clip Scout
  announce('viral-clip-scout');
  const viralClips: ViralClip[] = buildClips(sections, chosenHook);
  emit({
    id: 'viral-clip-scout', name: 'Viral Clip Scout', status: 'done',
    finding: `${viralClips.length} short-form moments identified.`,
    confidence: 74, warnings: [],
    suggestedNextAction: 'Schedule the strongest clip first.',
    data: { viralClips },
  });

  // 9) A&R Judge — banger score
  announce('ar-judge');
  const score = scoreSong({ inputs, chosenHook, sections, uniqueness, visuals, viralClips, emotionClarity: clarity });
  emit({
    id: 'ar-judge', name: 'A&R Judge', status: 'done',
    finding: `Banger score ${score.total}/100 — ${score.verdict}`,
    confidence: 82, warnings: score.total < 55 ? ['Below release bar — rework hook/emotion.'] : [],
    suggestedNextAction: score.total >= 70 ? 'Green-light.' : 'Iterate on the weakest category.',
    data: { score },
  });

  // 10) Rights & Release Guard
  announce('rights-release-guard');
  const release = buildRelease(inputs, uniqueness);
  const guardWarnings = release.filter((r) => !r.ok).map((r) => r.label);
  emit({
    id: 'rights-release-guard', name: 'Rights & Release Guard',
    status: guardWarnings.length ? 'warning' : 'done',
    finding: `${release.filter((r) => r.ok).length}/${release.length} release checks passing.`,
    confidence: 86, warnings: guardWarnings,
    suggestedNextAction: guardWarnings.length ? 'Resolve open items before publishing.' : 'Clear to release.',
    data: { release },
  });

  const promoCaption = buildPromo(inputs, chosenHook);

  const pkg: SongPackage = {
    id: opts.id ?? genId(),
    title: inputs.title || 'Untitled',
    createdAt: opts.now ?? new Date().toISOString(),
    version: 1,
    inputs,
    brief,
    conceptSummary: concept,
    hookOptions,
    chosenHook,
    sections,
    finalLyrics,
    production,
    vocals: {
      delivery: `${inputs.mood || 'measured'} delivery, conversational on verses, lifted on the hook`,
      adlibs: ['(yeah)', '(uh)', '(for you)', '(no cap)'],
      doublesAndStacks: 'Double the hook, stack harmonies on the last line of each chorus.',
    },
    visuals,
    viralClips,
    promoCaption,
    uniqueness,
    score,
    release,
    agentOutputs: outputs,
  };

  return { pkg, agentOutputs: outputs };
}

function buildClips(sections: SongSection[], hook: HookOption | null): ViralClip[] {
  const clips: ViralClip[] = [];
  if (hook) {
    clips.push({ label: 'Hook hit', startHint: 'first chorus', durationSec: 15, caption: `“${hook.text}” 🎧 #newmusic`, hookLine: hook.text });
  }
  const v1 = sections.find((s) => /verse 1/i.test(s.label));
  if (v1 && v1.lines[0]) clips.push({ label: 'Verse opener', startHint: 'verse 1, bar 1', durationSec: 12, caption: 'the story starts here 👀', hookLine: v1.lines[0] });
  const bridge = sections.find((s) => /bridge/i.test(s.label));
  if (bridge && bridge.lines[0]) clips.push({ label: 'Bridge turn', startHint: 'bridge', durationSec: 18, caption: 'wait for it…', hookLine: bridge.lines[0] });
  return clips;
}

function buildRelease(inputs: SongInputs, uniqueness: { flags: { kind: string }[]; bannedWordsHit: string[] }): ReleaseChecklistItem[] {
  return [
    { label: 'Title set', ok: !!inputs.title.trim(), note: inputs.title ? undefined : 'add a title' },
    { label: 'Genre + audience defined', ok: !!inputs.genre.trim() && !!inputs.audience.trim() },
    { label: 'No high-similarity matches', ok: !uniqueness.flags.some((f) => f.kind === 'too-similar'), note: 'rephrase flagged lines' },
    { label: 'Original — no copyrighted references', ok: !/sample|interpolat|cover of|lyrics from/i.test(inputs.references), note: 'describe inspiration, don\'t reuse material' },
    { label: 'Avoid-words reviewed', ok: uniqueness.bannedWordsHit.length === 0, note: uniqueness.bannedWordsHit.length ? `${uniqueness.bannedWordsHit.length} avoid-word(s) present (warning only)` : undefined },
    { label: 'Ownership clear', ok: true, note: 'original generated content — you own this draft' },
  ];
}

function buildPromo(inputs: SongInputs, hook: HookOption | null): string {
  const tag = keywords(inputs.theme).slice(0, 2).map((k) => '#' + k).join(' ');
  return `${hook ? `“${hook.text}”` : inputs.title} — new one for ${inputs.audience || 'the day ones'}. ${tag} #${inputs.genre.replace(/\s+/g, '')}`.trim();
}

function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'song_' + Math.random().toString(36).slice(2, 10);
}
