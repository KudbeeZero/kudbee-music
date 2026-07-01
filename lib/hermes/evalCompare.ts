// Provider comparison scaffold — runs the same golden briefs through the pipeline
// once per provider bundle and scores every result with the local eval harness
// (eval.ts). Pure orchestration: no network, no env reads, no file writes here.
// The live gating (RUN_LIVE_EVAL + ANTHROPIC_API_KEY) lives in the vitest runner
// (`__tests__/compare.eval.test.ts`, `npm run eval:compare`), never in this module,
// so this stays deterministic and offline-testable with any injected fake provider.
import type { SongInputs } from './types';
import type { ProviderBundle } from './providers/providerTypes';
import { evaluateSong, renderEvalTable, type EvalReport } from './eval';
import { runPipeline } from './pipeline';

export interface CompareBrief {
  slug: string;
  inputs: SongInputs;
  /** For the mock this reproduces a draft; for a live engine it's a take hint only. */
  seed?: number;
}

export interface CompareProvider {
  name: string;
  bundle: ProviderBundle;
}

export interface ProviderRunReport {
  name: string;
  reports: EvalReport[];
  /** every song from this provider cleared every eval threshold */
  pass: boolean;
}

export interface CompareResult {
  runs: ProviderRunReport[];
  /** readable side-by-side report (renderEvalTable per provider + summary) */
  rendered: string;
}

/** Injectable pipeline seam — tests pass a fake; the default is the real thing. */
export type PipelineRunner = typeof runPipeline;

const FIXED_NOW = '2026-01-01T00:00:00Z'; // stable timestamps → diffable output

/**
 * Run every brief through the pipeline once per provider and score each result.
 * Deterministic given deterministic providers (the mock is; a live engine is not —
 * see docs/claude-engine.md for the non-determinism caveat).
 */
export async function compareProviders(
  briefs: CompareBrief[],
  providers: CompareProvider[],
  run: PipelineRunner = runPipeline,
): Promise<CompareResult> {
  const runs: ProviderRunReport[] = [];
  for (const provider of providers) {
    const reports: EvalReport[] = [];
    for (const brief of briefs) {
      const { pkg } = await run(brief.inputs, {
        providers: provider.bundle,
        id: `${brief.slug}--${provider.name}`,
        now: FIXED_NOW,
        seed: brief.seed,
      });
      reports.push(evaluateSong(pkg));
    }
    runs.push({ name: provider.name, reports, pass: reports.every((r) => r.pass) });
  }
  return { runs, rendered: renderComparison(runs) };
}

/** Render per-provider eval tables plus a summary line-up (mirrors `npm run eval`). */
export function renderComparison(runs: ProviderRunReport[]): string {
  const sections = runs.map((r) =>
    [`== ${r.name} ${r.pass ? '(all pass)' : '(has failures)'} ==`, renderEvalTable(r.reports)].join('\n'),
  );
  const summary = ['== summary (mean metric per provider) ==', summaryTable(runs)];
  return [...sections, ...summary].join('\n\n');
}

function summaryTable(runs: ProviderRunReport[]): string {
  const names = runs[0]?.reports[0]?.metrics.map((m) => m.name) ?? [];
  const head = ['provider', ...names, 'banger', 'pass'].join(' | ');
  const rows = runs.map((r) => {
    const means = names.map((_, i) => mean(r.reports.map((rep) => rep.metrics[i].value)).toFixed(2));
    const banger = mean(r.reports.map((rep) => rep.bangerTotal)).toFixed(1);
    const passed = r.reports.filter((rep) => rep.pass).length;
    return [r.name, ...means, banger, `${passed}/${r.reports.length}`].join(' | ');
  });
  return [head, ...rows].join('\n');
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
