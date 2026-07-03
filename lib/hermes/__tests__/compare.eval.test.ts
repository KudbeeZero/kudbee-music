// Provider comparison — orchestration unit tests (always run, fully offline) plus
// the founder-triggered LIVE runner. The live block is double-gated, mirroring the
// GEN_DEMOS pattern in trace.test.ts: it runs ONLY when BOTH RUN_LIVE_EVAL=1 and
// ANTHROPIC_API_KEY are set. In CI / `npm run eval:compare` without env vars it
// skips cleanly and makes zero network calls.
//
// Founder trigger: RUN_LIVE_EVAL=1 ANTHROPIC_API_KEY=sk-... npm run eval:compare
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { compareProviders, renderComparison, type CompareBrief } from '../evalCompare';
import { mockProviders } from '../providers/mockProviders';
import { createClaudeLyricsProvider } from '../providers/claudeLyricsProvider';
import type { LyricsProvider, ProviderBundle } from '../providers/providerTypes';
import type { SongPackage } from '../types';

/** The golden briefs — reuse the committed demo songs' inputs (the fixed brief set). */
function loadGoldenBriefs(): CompareBrief[] {
  const root = join(process.cwd(), 'examples', 'demos');
  return readdirSync(root)
    .filter((d) => !d.endsWith('.md'))
    .map((slug) => {
      const pkg = JSON.parse(readFileSync(join(root, slug, 'song.json'), 'utf8')) as SongPackage;
      return { slug, inputs: pkg.inputs, seed: 1 };
    });
}

/** A deterministic stand-in for a live engine — offline, no key, no network. */
const fakeLiveLyrics: LyricsProvider = {
  id: 'fake-live',
  live: true,
  async generateHooks(inputs, count) {
    return Array.from({ length: count }, (_, i) => ({
      text: `porch light ${i} for ${inputs.title.toLowerCase()}`,
      angle: 'fake live angle',
      cadence: 'even',
      score: 60 + i,
    }));
  },
  async generateSections(_inputs, hook) {
    return [
      { label: 'Hook', lines: [hook.text, 'keys on the counter, coat on the chair'] },
      { label: 'Verse 1', lines: ['bus fare counted out in dimes', 'clock hands dragging through the shift', 'letters stacked beside the stove', 'one more mile before the lift'] },
    ];
  },
};

const fakeLiveBundle: ProviderBundle = { ...mockProviders, lyrics: fakeLiveLyrics };

describe('compareProviders (offline orchestration)', () => {
  const briefs = loadGoldenBriefs();

  it('loads the golden briefs from examples/demos', () => {
    expect(briefs.length).toBeGreaterThanOrEqual(5);
    expect(briefs.every((b) => !!b.inputs.theme)).toBe(true);
  });

  it('runs every brief through every provider and scores each result', async () => {
    const result = await compareProviders(briefs.slice(0, 2), [
      { name: 'mock', bundle: mockProviders },
      { name: 'fake-live', bundle: fakeLiveBundle },
    ]);
    expect(result.runs).toHaveLength(2);
    expect(result.runs.map((r) => r.name)).toEqual(['mock', 'fake-live']);
    for (const run of result.runs) {
      expect(run.reports).toHaveLength(2);
      for (const rep of run.reports) {
        expect(rep.metrics.map((m) => m.name)).toEqual([
          'rhyme density', 'line diversity', 'thematic coherence', 'imagery coherence', 'hook strength',
          'determiner agreement', 'repetition budget',
        ]);
      }
    }
  });

  it('renders a readable side-by-side comparison with a summary table', async () => {
    const { rendered } = await compareProviders(briefs.slice(0, 1), [
      { name: 'mock', bundle: mockProviders },
      { name: 'fake-live', bundle: fakeLiveBundle },
    ]);
    expect(rendered).toContain('== mock');
    expect(rendered).toContain('== fake-live');
    expect(rendered).toContain('summary (mean metric per provider)');
    expect(rendered).toContain('rhyme density');
  });

  it('is deterministic for deterministic providers', async () => {
    const one = briefs.slice(0, 1);
    const providers = [{ name: 'mock', bundle: mockProviders }];
    const a = await compareProviders(one, providers);
    const b = await compareProviders(one, providers);
    expect(a.rendered).toBe(b.rendered);
  });

  it('accepts an injected pipeline runner (pure orchestration seam)', async () => {
    const goldenPkg = JSON.parse(
      readFileSync(join(process.cwd(), 'examples', 'demos', briefs[0].slug, 'song.json'), 'utf8'),
    ) as SongPackage;
    const calls: string[] = [];
    const fakeRun = (async (_inputs, opts) => {
      calls.push(String(opts?.id));
      return { pkg: goldenPkg, agentOutputs: [] };
    }) as typeof import('../pipeline').runPipeline;

    const result = await compareProviders(
      briefs.slice(0, 2),
      [{ name: 'a', bundle: mockProviders }, { name: 'b', bundle: fakeLiveBundle }],
      fakeRun,
    );
    expect(calls).toHaveLength(4); // 2 briefs × 2 providers
    expect(calls[0]).toBe(`${briefs[0].slug}--a`);
    expect(result.runs[0].reports[0].title).toBe(goldenPkg.title);
  });

  it('renderComparison handles an empty run list without crashing', () => {
    expect(renderComparison([])).toContain('summary');
  });
});

// ---------------------------------------------------------------------------
// LIVE comparison — founder-triggered, opt-in, costs real money.
// Double gate (mirrors the GEN_DEMOS pattern): BOTH env vars must be set or the
// test is skipped and nothing can reach the network. CI never sets these.
// ---------------------------------------------------------------------------
const LIVE_ENABLED = process.env.RUN_LIVE_EVAL === '1' && !!process.env.ANTHROPIC_API_KEY;
const liveIt = LIVE_ENABLED ? it : it.skip;

describe('live provider comparison (RUN_LIVE_EVAL=1 + ANTHROPIC_API_KEY)', () => {
  if (!LIVE_ENABLED) {
    // Make the skip loud and self-explanatory in `npm run eval:compare` output.
    console.log(
      '[eval:compare] live run skipped — set RUN_LIVE_EVAL=1 and ANTHROPIC_API_KEY to compare mock vs claude (costs money; see docs/claude-engine.md).',
    );
  }

  liveIt('mock vs claude on the golden briefs', async () => {
    const briefs = loadGoldenBriefs();
    // CLAUDE_MODEL lets the Actions lane (and local runs) pick a cheaper model without a code change.
    const claudeBundle: ProviderBundle = {
      ...mockProviders,
      lyrics: createClaudeLyricsProvider(process.env.CLAUDE_MODEL ? { model: process.env.CLAUDE_MODEL } : {}),
    };
    const { rendered, runs } = await compareProviders(briefs, [
      { name: 'mock', bundle: mockProviders },
      { name: 'claude', bundle: claudeBundle },
    ]);
    console.log('\n' + rendered + '\n');
    expect(runs).toHaveLength(2);
    expect(runs[1].reports).toHaveLength(briefs.length);
  }, 600_000); // live LLM turns are slow; generous timeout
});
