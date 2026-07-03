// The eval harness — turns "the brain writes good lyrics" from a claim into a
// measurement. Given a finished SongPackage, it computes objective, local metrics
// (rhyme density, line diversity, thematic coherence, hook strength) against sane
// thresholds. Run over a fixed GOLDEN SET (examples/demos), it becomes a regression
// guard: if a change makes the songs worse, the numbers say so. $0, deterministic.
import type { SongPackage } from './types';
import { rhymeDensity } from './rhyme';
import { selfSimilarity, keywords, determinerAgreementViolations, maxContentWordShare } from './text';
import { imageryCoherence } from './providers/mockLyricsProvider';

export interface EvalMetric {
  name: string;
  value: number;      // normalized 0..1
  threshold: number;  // minimum acceptable
  pass: boolean;
  detail: string;
}

export interface EvalReport {
  title: string;
  metrics: EvalMetric[];
  pass: boolean;      // every metric passed
  bangerTotal: number; // the engine's own /100 score, for reference
}

const VERSE = (s: { label: string }) => !/hook|chorus|intro|outro/i.test(s.label);

/** Objective, local quality metrics for one finished song. */
export function evaluateSong(pkg: SongPackage): EvalReport {
  const verseLines = pkg.sections.filter(VERSE).flatMap((s) => s.lines);
  const verseSections = pkg.sections.filter(VERSE);
  const themeKw = keywords(pkg.inputs.theme);

  const density = verseLines.length > 1 ? rhymeDensity(verseLines) : 0;
  const diversity = 1 - selfSimilarity(verseLines);
  const coherent = verseSections.length
    ? verseSections.filter((s) => s.lines.some((l) => themeKw.some((k) => l.toLowerCase().includes(k)))).length / verseSections.length
    : 0;
  const imagery = imageryCoherence(verseLines, pkg.inputs);
  const hook = Math.min(1, pkg.score.hookStrength / 20);
  // grammaticality: "all this winters" shipped in the flagship demo for weeks because
  // no metric could see it — the most user-visible defect class is now measured.
  const allLines = pkg.sections.flatMap((s) => s.lines);
  const agreementViolations = determinerAgreementViolations(allLines.join('\n'));
  const agreement = allLines.length ? 1 - agreementViolations.length / allLines.length : 1;
  // repetition budget: 1 - (share of the single most-repeated content word). Chorus
  // repetition is intentional craft, so the threshold only guards against it getting
  // WORSE song-wide (the hook line repeating 9-15x was invisible before this).
  const repetition = 1 - maxContentWordShare(allLines.join('\n'));

  const metric = (name: string, value: number, threshold: number, detail: string): EvalMetric =>
    ({ name, value: +value.toFixed(2), threshold, pass: value >= threshold, detail });

  const metrics: EvalMetric[] = [
    metric('rhyme density', density, 0.4, 'fraction of verse lines that end-rhyme'),
    metric('line diversity', diversity, 0.7, 'inverse of repeated line shapes (anti-repetition)'),
    metric('thematic coherence', coherent, 0.5, 'verse sections that reference the theme'),
    metric('imagery coherence', imagery, 0.5, 'imagery-bank nouns that share the song\'s top visual register'),
    metric('hook strength', hook, 0.5, "A&R hook score (honest signals), normalized"),
    metric('determiner agreement', agreement, 1, agreementViolations.length
      ? `ungrammatical: ${agreementViolations.join(', ')}`
      : 'no singular-determiner + plural-noun clashes ("this winters")'),
    metric('repetition budget', repetition, 0.8, 'inverse share of the most-repeated content word (calibrated: golden set sits 0.83–0.90)'),
  ];

  return {
    title: pkg.title,
    metrics,
    pass: metrics.every((m) => m.pass),
    bangerTotal: pkg.score.total,
  };
}

/** Evaluate a whole golden set; returns per-song reports + an overall pass. */
export function evaluateGolden(songs: SongPackage[]): { reports: EvalReport[]; pass: boolean } {
  const reports = songs.map(evaluateSong);
  return { reports, pass: reports.every((r) => r.pass) };
}

/** Render an eval run as a readable table (for `npm run eval`). */
export function renderEvalTable(reports: EvalReport[]): string {
  const names = reports[0]?.metrics.map((m) => m.name) ?? [];
  const head = ['song', ...names, 'banger', ''].join(' | ');
  const rows = reports.map((r) => {
    const cells = r.metrics.map((m) => `${m.value}${m.pass ? '' : '✗'}`);
    return [r.title, ...cells, `${r.bangerTotal}`, r.pass ? 'PASS' : 'FAIL'].join(' | ');
  });
  return [head, ...rows].join('\n');
}
