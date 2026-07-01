import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { runPipeline } from '../pipeline';
import { buildTrace, renderTraceMarkdown } from '../trace';
import type { SongInputs } from '../types';

// Five diverse, fully original briefs — no artist/lyric mimicry, just craft parameters.
// Each is minted deterministically (fixed id/now/seed) so the committed artifacts are
// reproducible from `GEN_DEMOS=1 npx vitest run trace`.
const DEMOS: { slug: string; seed: number; inputs: SongInputs }[] = [
  { slug: 'midnight-shift', seed: 36, inputs: {
    title: 'Midnight Shift', theme: 'working the graveyard shift to build a future nobody sees yet',
    mood: 'tired but relentless, quietly proud', genre: 'lo-fi soul hip-hop', tempoMin: 78, tempoMax: 86,
    voice: 'weathered', audience: 'everyone grinding in the dark', doNotUse: [], references: '', structure: 'full-song' } },
  { slug: 'concrete-garden', seed: 2, inputs: {
    title: 'Concrete Garden', theme: 'growing something beautiful out of a place that was supposed to break you',
    mood: 'defiant, hopeful, hard-earned', genre: 'boom-bap hip-hop', tempoMin: 88, tempoMax: 96,
    voice: 'gritty', audience: 'the block', doNotUse: [], references: '', structure: 'hook-first' } },
  { slug: 'signal-fade', seed: 22, inputs: {
    title: 'Signal Fade', theme: 'loving someone across distance while the connection keeps dropping',
    mood: 'aching, electric, bittersweet', genre: 'synthwave pop', tempoMin: 100, tempoMax: 112,
    voice: 'smooth', audience: 'the ones far away', doNotUse: [], references: '', structure: 'full-song' } },
  { slug: 'paper-crowns', seed: 26, inputs: {
    title: 'Paper Crowns', theme: 'refusing the fake status games and crowning yourself on your own terms',
    mood: 'cold, confident, sharp', genre: 'drill-influenced trap', tempoMin: 140, tempoMax: 146,
    voice: 'hard', audience: 'the doubters', doNotUse: [], references: '', structure: 'hook-first' } },
  { slug: 'hometown-ghosts', seed: 14, inputs: {
    title: 'Hometown Ghosts', theme: 'coming back to the town that raised you and made you leave',
    mood: 'nostalgic, heavy, warm', genre: 'acoustic folk-rap', tempoMin: 82, tempoMax: 90,
    voice: 'plain, honest', audience: 'the people back home', doNotUse: [], references: '',
    structure: 'full-song', culture: 'small industrial town' } },
];

const NOW = '2026-01-01T00:00:00Z';

describe('generation trace (demo proof)', () => {
  it('replays all 11 brain regions for a generated song', async () => {
    const d = DEMOS[0];
    const { pkg } = await runPipeline(d.inputs, { id: d.slug, now: NOW, seed: d.seed });
    const t = buildTrace(pkg, d.inputs, d.seed);
    expect(t.regions).toHaveLength(11);
    expect(new Set(t.regions.map((r) => r.region)).size).toBe(11);
    expect(t.scoreTotal).toBeGreaterThan(0);
    expect(t.hook.length).toBeGreaterThan(0);
    // every region says something concrete
    expect(t.regions.every((r) => r.contribution.length > 10)).toBe(true);
  });

  it('renders a markdown trace that names the hook and every region', async () => {
    const d = DEMOS[1];
    const { pkg } = await runPipeline(d.inputs, { id: d.slug, now: NOW, seed: d.seed });
    const t = buildTrace(pkg, d.inputs, d.seed);
    const md = renderTraceMarkdown(t);
    expect(md).toContain('What each region contributed');
    expect(md).toContain(t.hook);
    expect(md).toContain('Banger score');
    for (const r of t.regions) expect(md).toContain(r.label);
  });

  it('is deterministic for a fixed seed', async () => {
    const d = DEMOS[2];
    const a = await runPipeline(d.inputs, { id: d.slug, now: NOW, seed: d.seed });
    const b = await runPipeline(d.inputs, { id: d.slug, now: NOW, seed: d.seed });
    expect(a.pkg.finalLyrics).toBe(b.pkg.finalLyrics);
    expect(a.pkg.chosenHook?.text).toBe(b.pkg.chosenHook?.text);
  });

  // Env-gated generator: `GEN_DEMOS=1 npx vitest run trace` (re)mints the committed
  // demo artifacts under examples/demos/. Skipped in normal CI so tests never write files.
  const genIt = process.env.GEN_DEMOS ? it : it.skip;
  genIt('mints committed demo songs + traces + index', async () => {
    const rows: string[] = [];
    for (const d of DEMOS) {
      const { pkg } = await runPipeline(d.inputs, { id: d.slug, now: NOW, seed: d.seed });
      const t = buildTrace(pkg, d.inputs, d.seed);
      const dir = join(process.cwd(), 'examples', 'demos', d.slug);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'song.json'), JSON.stringify(pkg, null, 2) + '\n');
      writeFileSync(join(dir, 'trace.md'), renderTraceMarkdown(t));
      rows.push(`| **${pkg.title}** | ${d.inputs.genre} | ${pkg.score.total}/100 | [trace](${d.slug}/trace.md) · [song.json](${d.slug}/song.json) |`);
    }
    const readme = `# Demo songs — with full generation traces

Five original songs, each **minted by the real pipeline** (\`lib/hermes/pipeline.ts\`,
deterministic seeds) — and each with a **generation trace** showing what every brain
region actually contributed. Proof the "brain" thinks, not just markets. All $0, local,
no API key. Regenerate with \`GEN_DEMOS=1 npx vitest run trace\`.

> The brain anatomy is an [inspired workflow model](../brain/hemispheres.md), not
> biological. The traces are generated from real code in \`lib/hermes/\`.

| Song | Genre | Banger score | Trace |
|------|-------|--------------|-------|
${rows.join('\n')}

Load any \`song.json\` into the app at \`/hermes\` (Vault → Import) to see the full deck.
`;
    writeFileSync(join(process.cwd(), 'examples', 'demos', 'README.md'), readme);
    expect(rows.length).toBe(DEMOS.length);
  });
});
