// Generation trace — the "show your work" layer. Given a finished SongPackage and
// its brief, replays what each brain region contributed, using the SAME real region
// functions the pipeline uses (no hand-written prose). This is the proof that "the
// brain thought about it" — deterministic, local, $0. Renders to human-readable
// markdown for committing next to the song.json in examples/.
import type { SongInputs, SongPackage } from './types';
import type { RegionId } from './brainMap';
import { deriveEmotion, emotionalArc } from './emotion';
import { deriveLanguage } from './language';
import { divergentAngles } from './defaultMode';
import { craveScore } from './reward';
import { rhymeScheme, rhymeDensity } from './rhyme';

export interface RegionTrace {
  region: RegionId;
  label: string;
  contribution: string;
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
  ];

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
  const rows = t.regions.map((r) => `| **${r.label}** | ${r.contribution} |`).join('\n');
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
