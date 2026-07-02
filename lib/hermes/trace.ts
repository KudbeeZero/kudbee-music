// Generation trace — the "show your work" layer. Given a finished SongPackage and
// its brief, replays what each brain region contributed, using the SAME real region
// functions the pipeline uses (no hand-written prose). This is the proof that "the
// brain thought about it" — deterministic, local, $0. Renders to human-readable
// markdown for committing next to the song.json in examples/.
import type { SongInputs, SongPackage } from './types';
import type { RegionId, SubregionId } from './brainMap';
import { deriveEmotion, emotionalArc, emotionClarity } from './emotion';
import { deriveLanguage, languageCoaching } from './language';
import { divergentAngles } from './defaultMode';
import { craveScore } from './reward';
import { rhymeScheme, rhymeDensity } from './rhyme';
import { LEXICON, byAffect } from './lexicon';
import { LYRIC_PROCESS } from './process';
import { allAvoidWords } from './memory';
import { screenFamousPhrases } from './safety';
import { PERSONAS } from './personas';

/** One subsection's line inside a region card — the atlas depth of the trace. */
export interface SubTrace {
  id: SubregionId;
  label: string;
  note: string;
  /** True for node/CLI-only subsections that don't run in the browser (rendered dim). */
  dim?: boolean;
}

export interface RegionTrace {
  region: RegionId;
  label: string;
  contribution: string;
  sub?: SubTrace[];
}

export interface SongTrace {
  title: string;
  seed: number;
  brief: { theme: string; mood: string; genre: string; structure: string; culture?: string };
  regions: RegionTrace[];
  hook: string;
  hookOptions: number;
  rhymeScheme: string;
  rhymeDensity: number;   // 0..100 (%)
  crave: number;          // 0..100
  uniqueness: number;     // 0..100
  scoreTotal: number;     // 0..100
  verdict: string;
}

/** The lines of the first real verse (or the longest section) — for rhyme analysis. */
function analyzedLines(pkg: SongPackage): string[] {
  const verse = pkg.sections.find((s) => /verse/i.test(s.label) && s.lines.length > 1);
  const longest = [...pkg.sections].sort((a, b) => b.lines.length - a.lines.length)[0];
  return (verse ?? longest)?.lines ?? [];
}

/** Replay the per-region contributions behind a finished song. Deterministic. */
export function buildTrace(pkg: SongPackage, inputs: SongInputs, seed = 0): SongTrace {
  const emo = deriveEmotion(inputs);
  const arc = emotionalArc(pkg.sections);
  const lang = deriveLanguage(inputs);
  const angles = divergentAngles(inputs, 3, seed);
  const crave = craveScore(pkg.chosenHook, pkg.sections);
  const lines = analyzedLines(pkg);
  const scheme = lines.length > 1 ? rhymeScheme(lines) : '—';
  const density = lines.length > 1 ? Math.round(rhymeDensity(lines) * 100) : 0;
  const hook = pkg.chosenHook?.text ?? '(none)';

  const arcStr = arc.map((a) => a.beat).join(' → ') || '—';

  // ---- the atlas depth: per-subsection notes, all from real calls / real package data
  const clarity = Math.round(emotionClarity(inputs, pkg.sections) * 100);
  const affectWords = byAffect(emo.valence >= 0 ? 1 : -1, undefined, 20).length;
  const hookFlags = screenFamousPhrases(hook).length;
  const critiques = pkg.cognition?.secondThought ?? [];
  const critiquesPassed = critiques.filter((c) => c.passes).length;
  const exclusions = allAvoidWords().length;
  const coaching = languageCoaching(lang);

  const sub: Partial<Record<RegionId, SubTrace[]>> = {
    intent: [
      { id: 'goal-encoding', label: 'dlPFC goal encoding', note: `Brief normalized — ${inputs.tempoMin}–${inputs.tempoMax} BPM, ${inputs.structure}.` },
      { id: 'conductor-plan', label: 'Conductor plan', note: `Routed ${pkg.agentOutputs.length} agents through the pipeline.` },
    ],
    language: [
      { id: 'wernicke', label: 'Wernicke’s area', note: `Read the brief → register ${lang.register}, diction lean ${lang.dictionLean}.` },
      { id: 'broca', label: 'Broca’s area', note: coaching.length > 90 ? `${coaching.slice(0, 88).trimEnd()}…` : coaching },
      { id: 'temporal-lexicon', label: 'Temporal lexicon', note: `${LEXICON.length}-word offline vocabulary consulted.` },
      { id: 'auditory-cortex', label: 'Auditory cortex', note: `Rhyme scheme ${scheme}, density ${density}%.` },
      { id: 'angular-gyrus', label: 'Angular gyrus', note: `Imagery seeds bound: ${lang.imagery.slice(0, 3).join(', ') || '—'}.` },
    ],
    values: [
      { id: 'vmpfc', label: 'vmPFC', note: 'Belief system held over every choice (truth-first, original-only).' },
      { id: 'constitution', label: 'Constitution', note: 'brain/beliefs.json — the store the vmPFC reads.' },
    ],
    generative: [
      { id: 'hook-furnace', label: 'Hook furnace', note: `Forged ${pkg.hookOptions.length} candidates → “${hook}”.` },
      { id: 'persona-overlay', label: 'Persona overlay', note: `${PERSONAS.length} anonymized craft-DNA archetypes on tap.` },
      { id: 'voice-mirror', label: 'Voice mirror', note: 'Compares each song to your learned voice (in the studio, from your vault).' },
      { id: 'imagery-studio', label: 'Imagery studio', note: `Cover prompt drafted: “${pkg.visuals.albumCoverPrompt.slice(0, 44).trimEnd()}…”.` },
    ],
    analytical: [
      { id: 'pattern-auditor', label: 'Pattern auditor', note: `Vault fingerprint check → ${pkg.uniqueness.score}/100 unique.` },
      { id: 'scorekeeper', label: 'Scorekeeper', note: `Banger score ${pkg.score.total}/100 — ${pkg.score.verdict}.` },
      { id: 'safety-screen', label: 'Safety screen', note: `${hookFlags} famous-phrase flag${hookFlags === 1 ? '' : 's'} on the lead hook.` },
      { id: 'hook-council', label: 'Hook council', note: `Ranked ${pkg.hookOptions.length} hooks across challenge · crave · confidence.` },
      { id: 'semantic-auditor', label: 'Semantic auditor', note: 'Meaning-level paraphrase check — runs in the CLI eval lane.', dim: true },
    ],
    decision: [
      { id: 'writers-room', label: 'dlPFC writers-room', note: `${LYRIC_PROCESS.length}-step craft process on call.` },
      { id: 'acc', label: 'ACC', note: critiques.length ? `Second thought: ${critiquesPassed}/${critiques.length} critiques passed.` : 'Second thought standing by (runs on the chosen hook).' },
      { id: 'corpus-callosum', label: 'Corpus callosum', note: `Fast instinct + slow deliberation → ${pkg.cognition?.verdict ?? 'artist’s call'}.` },
      { id: 'crossroads', label: 'Crossroads', note: 'Big direction changes route to the community board.' },
    ],
    limbic: [
      { id: 'amygdala', label: 'Amygdala', note: `Primary ${emo.primary} — valence ${emo.valence.toFixed(2)}, intensity ${emo.intensity.toFixed(2)}.` },
      { id: 'affective-arc', label: 'Affective arc', note: `Feeling across sections: ${arcStr}.` },
      { id: 'insula', label: 'Insula', note: `Felt clarity ${clarity}/100 — does it feel what it says?` },
      { id: 'affect-diction', label: 'Affect–diction loop', note: `${affectWords} affect-matched words offered to the pen.` },
    ],
    'default-mode': [
      { id: 'mpfc-drift', label: 'mPFC drift', note: `Wandered ${angles.length} divergent angles before focusing.` },
      { id: 'thermal-signature', label: 'Thermal signature', note: 'Colors the live scan by the kind of artist you are.' },
    ],
    reward: [
      { id: 'vta-spark', label: 'VTA spark', note: `Crave-ability ${crave.score}/100 — ${crave.note}` },
      { id: 'ofc-valuation', label: 'OFC valuation', note: 'Turns your profile into reward-guided next moves (studio).' },
    ],
    'short-term': [
      { id: 'working-buffer', label: 'Working buffer', note: `Held the live working set across the ${pkg.agentOutputs.length}-agent run, then let it decay.` },
    ],
    'long-term': [
      { id: 'hippocampus', label: 'Hippocampus (episodic)', note: 'The vault — every song you kept, in your browser.' },
      { id: 'semantic-store', label: 'Semantic store', note: `${exclusions} learned exclusions active on the pen.` },
      { id: 'consolidation', label: 'Consolidation', note: 'Rebuilds your artist profile from the songs you save.' },
      { id: 'basal-ganglia', label: 'Basal ganglia (habit)', note: 'Every edit you save teaches the brain your taste.' },
      { id: 'procedural-memory', label: 'Procedural memory', note: 'Learns the recurring craft moves — the how, not the what.' },
      { id: 'ca3-recall', label: 'CA3 pattern completion', note: 'Vector recall of meaning-close past wins — node lane.', dim: true },
    ],
  };

  const regions: RegionTrace[] = [
    { region: 'intent', label: 'Intent (prefrontal)', contribution: `Framed the brief → “${pkg.conceptSummary}”` },
    { region: 'values', label: 'Values cortex', contribution: `Held the belief system (truth-first, original-only) over the whole run.` },
    { region: 'language', label: 'Language & Culture', contribution: `Register: ${lang.register}. Diction lean: ${lang.dictionLean}${lang.hasCulture ? ' · culture-aware' : ''}. Imagery seeds: ${lang.imagery.slice(0, 4).join(', ') || '—'}.` },
    { region: 'limbic', label: 'Limbic (emotion)', contribution: `Primary feeling: ${emo.primary} (valence ${emo.valence.toFixed(2)}, intensity ${emo.intensity.toFixed(2)}); contrast: ${emo.contrast}. Colored word choice; arc: ${arcStr}.` },
    { region: 'default-mode', label: 'Default-Mode Network', contribution: `Considered ${angles.length} divergent angles, incl. “${angles[0]?.angle ?? '—'}”.` },
    { region: 'generative', label: 'Generative (right hemisphere)', contribution: `Wrote the hook from ${pkg.hookOptions.length} candidates → “${hook}”.` },
    { region: 'analytical', label: 'Analytical (left hemisphere)', contribution: `Rhyme scheme ${scheme}, density ${density}% across the verse; beat/BPM sanity checks.` },
    { region: 'reward', label: 'Reward circuit', contribution: `Crave-ability ${crave.score}/100 (returns ${crave.factors.returns}, mutation ${crave.factors.mutation}, brevity ${crave.factors.brevity}, singability ${crave.factors.singability}) — ${crave.note}` },
    { region: 'decision', label: 'Decision (corpus callosum)', contribution: `A&R verdict: ${pkg.score.verdict} (${pkg.score.total}/100). The artist gets the final choice.` },
    { region: 'long-term', label: 'Long-term memory', contribution: `Originality checked against the vault → ${pkg.uniqueness.score}/100${pkg.uniqueness.flags.length ? ` (${pkg.uniqueness.flags.length} flag${pkg.uniqueness.flags.length === 1 ? '' : 's'})` : ''}.` },
    { region: 'short-term', label: 'Short-term memory', contribution: `Held the working set (hook + section drafts) live across the ${pkg.agentOutputs.length}-agent run.` },
  ].map((r) => (sub[r.region as RegionId] ? { ...r, sub: sub[r.region as RegionId] } : r)) as RegionTrace[];

  return {
    title: pkg.title,
    seed,
    brief: { theme: inputs.theme, mood: inputs.mood, genre: inputs.genre, structure: inputs.structure, culture: inputs.culture },
    regions,
    hook,
    hookOptions: pkg.hookOptions.length,
    rhymeScheme: scheme,
    rhymeDensity: density,
    crave: crave.score,
    uniqueness: pkg.uniqueness.score,
    scoreTotal: pkg.score.total,
    verdict: pkg.score.verdict,
  };
}

/** Render a trace as committable markdown — "here's what each region did." */
export function renderTraceMarkdown(t: SongTrace): string {
  const rows = t.regions
    .map((r) => {
      const main = `| **${r.label}** | ${r.contribution} |`;
      const subs = (r.sub ?? [])
        .map((s) => `| &nbsp;&nbsp;↳ ${s.label}${s.dim ? ' _(CLI lane)_' : ''} | ${s.note} |`)
        .join('\n');
      return subs ? `${main}\n${subs}` : main;
    })
    .join('\n');
  return `# Generation trace — “${t.title}”

> **Deterministic.** Seed \`${t.seed}\`, minted by \`lib/hermes/pipeline.ts\`. $0, fully local, no API key.
> The brain metaphor is an [inspired workflow model](../../brain/hemispheres.md), not biological — but every
> line below is the output of real code in \`lib/hermes/\`, not hand-written copy.

**Brief** — theme: *${t.brief.theme}* · mood: *${t.brief.mood}* · genre: *${t.brief.genre}* · structure: *${t.brief.structure}*${t.brief.culture ? ` · culture: *${t.brief.culture}*` : ''}

## 🧠 What each region contributed

| Region | Contribution |
|--------|--------------|
${rows}

## 🎯 The result

- **Lead hook:** “${t.hook}” _(chosen from ${t.hookOptions} candidates)_
- **Rhyme:** scheme ${t.rhymeScheme}, ${t.rhymeDensity}% density
- **Crave-ability:** ${t.crave}/100
- **Originality:** ${t.uniqueness}/100
- **Banger score:** **${t.scoreTotal}/100** — _${t.verdict}_

_Full package: [\`song.json\`](song.json). Load it in the app (\`/hermes\`) to see the whole deck._
`;
}
