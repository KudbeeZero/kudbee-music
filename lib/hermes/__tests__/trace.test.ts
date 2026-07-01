import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { runPipeline } from '../pipeline';
import { buildTrace, renderTraceMarkdown } from '../trace';
import { renderTraceHtml, esc } from '../traceHtml';
import { sunoStyle, sunoLyrics } from '../suno';
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

/** A self-contained index page linking each demo's interactive trace explorer. */
function renderGallery(cards: { title: string; genre: string; score: number; slug: string; hook: string }[]): string {
  const tiles = cards.map((c) => `
    <a class="tile" href="../examples/demos/${esc(c.slug)}/trace.html">
      <div class="score">${c.score}<small>/100</small></div>
      <h3>${esc(c.title)}</h3>
      <p class="genre">${esc(c.genre)}</p>
      <p class="hook">“${esc(c.hook)}”</p>
      <span class="cta">Explore the trace →</span>
    </a>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>HERMES — demo gallery</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;background:radial-gradient(1200px 600px at 50% -10%, #0d0d14, #07070b) fixed;color:#f3f1fb;
    font:15px/1.55 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}
  .wrap{max-width:960px;margin:0 auto;padding:40px 20px 64px}
  .eyebrow{color:#6f6d86;font-size:12px;letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px}
  h1{margin:0 0 8px;font-size:34px;letter-spacing:-.01em}
  .sub{color:#a8a6bd;margin:0 0 28px;max-width:640px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
  .tile{display:block;text-decoration:none;color:inherit;background:rgba(255,255,255,.03);
    border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:18px;transition:transform .15s,border-color .15s}
  .tile:hover{transform:translateY(-3px);border-color:#d24bff}
  .score{font-size:30px;font-weight:700;color:#36e0d4}
  .score small{font-size:13px;color:#6f6d86;font-weight:500}
  .tile h3{margin:6px 0 2px;font-size:18px}
  .genre{color:#a8a6bd;margin:0 0 10px;font-size:12.5px;text-transform:uppercase;letter-spacing:.04em}
  .hook{color:#f3f1fb;margin:0 0 14px;font-size:14px}
  .cta{color:#d24bff;font-size:13px;font-weight:600}
  footer{margin-top:34px;color:#6f6d86;font-size:12.5px}
  footer code{color:#a8a6bd}
</style></head>
<body><main class="wrap">
  <div class="eyebrow">HERMES · deterministic · $0 local · no API key</div>
  <h1>Demo gallery</h1>
  <p class="sub">Original songs minted by the real pipeline (<code>lib/hermes/pipeline.ts</code>). Open any card for an interactive trace: the brain heat-map, what each of the 11 regions contributed, and a copy-paste Suno prompt.</p>
  <div class="grid">${tiles}</div>
  <footer>Regenerate with <code>GEN_DEMOS=1 npx vitest run trace</code>. The brain metaphor is an inspired workflow model, not biological.</footer>
</main></body></html>
`;
}

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
    const cards: { title: string; genre: string; score: number; slug: string; hook: string }[] = [];
    for (const d of DEMOS) {
      const { pkg } = await runPipeline(d.inputs, { id: d.slug, now: NOW, seed: d.seed });
      const t = buildTrace(pkg, d.inputs, d.seed);
      const dir = join(process.cwd(), 'examples', 'demos', d.slug);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'song.json'), JSON.stringify(pkg, null, 2) + '\n');
      writeFileSync(join(dir, 'trace.md'), renderTraceMarkdown(t));
      // the interactive, self-contained explorer (with a copyable Suno prompt)
      writeFileSync(join(dir, 'trace.html'), renderTraceHtml(t, { sunoStyle: sunoStyle(pkg), sunoLyrics: sunoLyrics(pkg) }));
      rows.push(`| **${pkg.title}** | ${d.inputs.genre} | ${pkg.score.total}/100 | [explore](${d.slug}/trace.html) · [trace.md](${d.slug}/trace.md) · [song.json](${d.slug}/song.json) |`);
      cards.push({ title: pkg.title, genre: d.inputs.genre, score: pkg.score.total, slug: d.slug, hook: pkg.chosenHook?.text ?? '' });
    }
    writeFileSync(join(process.cwd(), 'docs', 'demo-gallery.html'), renderGallery(cards));
    const readme = `# Demo songs — with full generation traces

Five original songs, each **minted by the real pipeline** (\`lib/hermes/pipeline.ts\`,
deterministic seeds) — and each with a **generation trace** showing what every brain
region actually contributed. Proof the "brain" thinks, not just markets. All $0, local,
no API key. Regenerate with \`GEN_DEMOS=1 npx vitest run trace\`.

**▶ [Open the interactive demo gallery](../../docs/demo-gallery.html)** — or open any
\`trace.html\` below: a brain heat-map, collapsible per-region cards, and a copy-paste
Suno prompt, all in one self-contained file.

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
