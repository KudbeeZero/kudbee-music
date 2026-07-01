import { describe, it, expect } from 'vitest';
import { runPipeline } from '../pipeline';
import { buildTrace } from '../trace';
import { renderTraceHtml, regionHeat, esc } from '../traceHtml';
import { sunoStyle, sunoLyrics } from '../suno';
import type { SongInputs } from '../types';

const BRIEF: SongInputs = {
  title: 'Long Way Up', theme: 'turning cold winters into gold records for my family',
  mood: 'hungry, warm, defiant', genre: 'soulful boom-bap hip-hop', tempoMin: 86, tempoMax: 94,
  voice: 'grounded, real', audience: 'my family', doNotUse: [], references: '',
  structure: 'full-song', rhymeTemp: 'balanced',
};
const SEED = 8;

async function trace() {
  const { pkg } = await runPipeline(BRIEF, { id: 'demo', now: '2026-01-01T00:00:00Z', seed: SEED });
  return { t: buildTrace(pkg, BRIEF, SEED), pkg };
}

describe('traceHtml — interactive trace explorer', () => {
  it('esc() neutralizes HTML-significant characters', () => {
    expect(esc('<script>"&\'')).toBe('&lt;script&gt;&quot;&amp;&#39;');
    // ampersand must be escaped first (no double-escaping)
    expect(esc('a & b < c')).toBe('a &amp; b &lt; c');
  });

  it('regionHeat gives every region a temperature in [0,1], hotter for the creative core', () => {
    return trace().then(({ t }) => {
      const heat = regionHeat(t);
      expect(Object.keys(heat)).toHaveLength(11);
      for (const v of Object.values(heat)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
      // the generative region should run at least as hot as a peripheral one
      expect(heat.generative).toBeGreaterThan(heat.values);
    });
  });

  it('renders a self-contained document naming the hook and all 11 regions', async () => {
    const { t } = await trace();
    const html = renderTraceHtml(t);
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('</html>');
    expect(html).toContain(esc(t.title));
    expect(html).toContain(esc(t.hook));
    for (const r of t.regions) expect(html).toContain(esc(r.label));
    // brain heat-map + collapsible cards are present
    expect(html).toContain('<svg');
    expect((html.match(/<details class="card"/g) ?? []).length).toBe(11);
  });

  it('embeds a copyable Suno prompt when style/lyrics are provided', async () => {
    const { t, pkg } = await trace();
    const html = renderTraceHtml(t, { sunoStyle: sunoStyle(pkg), sunoLyrics: sunoLyrics(pkg) });
    expect(html).toContain('Suno prompt');
    expect(html).toContain('id="copySuno"');
    expect(html).toContain('Style of Music:');
  });

  it('is deterministic — same trace renders byte-identical HTML', async () => {
    const { t } = await trace();
    expect(renderTraceHtml(t)).toBe(renderTraceHtml(t));
  });

  it('standalone:false returns an embeddable fragment (no doctype)', async () => {
    const { t } = await trace();
    const frag = renderTraceHtml(t, { standalone: false });
    expect(frag).not.toContain('<!doctype');
    expect(frag).toContain('class="wrap"');
  });
});
