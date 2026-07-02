import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { REGIONS, SUBREGIONS, subregionsOf, subregionPos, region } from '../brainMap';
import { buildTrace } from '../trace';
import { renderTraceHtml } from '../traceHtml';
import { runPipeline } from '../pipeline';
import type { SongInputs } from '../types';

const root = join(__dirname, '..', '..', '..');

// The atlas honesty rule: anatomy is the naming language, the codebase is the ground
// truth. Every subregion must point at a file that exists AND (when it names one) a
// function that appears in that file's source — no decorative brain parts.
describe('Deep Brain Atlas — structural integrity', () => {
  it('has unique ids and a valid parent hub for every subregion', () => {
    const ids = SUBREGIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of SUBREGIONS) {
      expect(region(s.parent), `${s.id} parent ${s.parent}`).toBeDefined();
    }
  });

  it('every hub has at least one subsection; the atlas covers all 11 hubs', () => {
    for (const r of REGIONS) {
      expect(subregionsOf(r.id).length, `hub ${r.id} has no subsections`).toBeGreaterThan(0);
    }
    expect(SUBREGIONS.length).toBe(37);
  });

  it('every doc routes to a real file, and its #function exists in that file', () => {
    for (const s of SUBREGIONS) {
      const [file, fragment] = s.doc.split('#');
      expect(existsSync(join(root, file)), `${s.id} → ${file} missing`).toBe(true);
      if (fragment) {
        const name = fragment.split(' ')[0]; // "runPipeline (hooksmith stage)" → runPipeline
        const src = readFileSync(join(root, file), 'utf8');
        expect(src.includes(name), `${s.id}: ${name} not found in ${file}`).toBe(true);
      }
    }
  });

  it('satellites stay inside the 440×300 brain with a margin', () => {
    for (const s of SUBREGIONS) {
      const p = subregionPos(s);
      expect(p.x).toBeGreaterThanOrEqual(8);
      expect(p.x).toBeLessThanOrEqual(432);
      expect(p.y).toBeGreaterThanOrEqual(8);
      expect(p.y).toBeLessThanOrEqual(292);
    }
  });

  it('only the two node-lane modules are unwired', () => {
    expect(SUBREGIONS.filter((s) => !s.wired).map((s) => s.id).sort()).toEqual(['ca3-recall', 'semantic-auditor']);
  });
});

describe('Deep Brain Atlas — the trace shows the subsections (deterministically)', () => {
  const INPUTS: SongInputs = {
    title: 'Atlas Test', theme: 'city lights after the storm', mood: 'hopeful grit',
    genre: 'melodic rap', tempoMin: 120, tempoMax: 140, voice: 'measured', audience: 'day-ones',
    doNotUse: [], references: '', structure: 'full-song', rhymeTemp: 'balanced',
  };
  const opts = { id: 'fixed', now: '2026-01-01T00:00:00Z', priorSongs: [], bannedWords: [] as string[] };

  it('every region trace carries non-empty subsection notes', async () => {
    const { pkg } = await runPipeline(INPUTS, { ...opts, seed: 11 });
    const t = buildTrace(pkg, pkg.inputs, 11);
    expect(t.regions.length).toBe(11);
    const subCount = t.regions.reduce((n, r) => n + (r.sub?.length ?? 0), 0);
    expect(subCount).toBe(37);
    for (const r of t.regions) {
      for (const s of r.sub ?? []) {
        expect(s.note.trim().length, `${r.region}/${s.id} empty note`).toBeGreaterThan(0);
      }
    }
  });

  it('sub notes are byte-identical across two same-seed runs (determinism contract)', async () => {
    const a = await runPipeline(INPUTS, { ...opts, seed: 22 });
    const b = await runPipeline(INPUTS, { ...opts, seed: 22 });
    const ta = buildTrace(a.pkg, a.pkg.inputs, 22);
    const tb = buildTrace(b.pkg, b.pkg.inputs, 22);
    expect(JSON.stringify(tb.regions)).toBe(JSON.stringify(ta.regions));
  });

  it('the trace explorer HTML renders the subsection lists (and keeps 11 cards)', async () => {
    const { pkg } = await runPipeline(INPUTS, { ...opts, seed: 33 });
    const html = renderTraceHtml(buildTrace(pkg, pkg.inputs, 33));
    expect((html.match(/<details class="card"/g) ?? []).length).toBe(11);
    expect((html.match(/<ul class="subs">/g) ?? []).length).toBe(11);
    expect(html).toContain('Wernicke’s area');
    expect(html).toContain('Basal ganglia');
    expect(html).toContain('class="dim"'); // the honest CLI-lane markers
  });
});
