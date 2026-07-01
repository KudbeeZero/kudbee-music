import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateSong, evaluateGolden, renderEvalTable } from '../eval';
import type { SongPackage } from '../types';

// The GOLDEN SET — the committed demo songs + the flagship. If a change regresses
// lyric quality below the thresholds in eval.ts, this fails. `npm run eval` runs it
// and prints the table.
function loadGolden(): SongPackage[] {
  const root = join(process.cwd(), 'examples');
  const paths = [
    join(root, 'cold-hard-gold', 'song.json'),
    ...readdirSync(join(root, 'demos'))
      .filter((d) => !d.endsWith('.md'))
      .map((d) => join(root, 'demos', d, 'song.json')),
  ];
  return paths.map((p) => JSON.parse(readFileSync(p, 'utf8')) as SongPackage);
}

describe('eval harness (golden regression guard)', () => {
  const golden = loadGolden();

  it('loads the golden set', () => {
    expect(golden.length).toBeGreaterThanOrEqual(6);
  });

  it('every golden song clears the quality thresholds', () => {
    const { reports, pass } = evaluateGolden(golden);
    // print the table so `npm run eval` is a readable report
    console.log('\n' + renderEvalTable(reports) + '\n');
    for (const r of reports) {
      const failed = r.metrics.filter((m) => !m.pass).map((m) => `${m.name}=${m.value}<${m.threshold}`);
      expect(failed, `${r.title} failed: ${failed.join(', ')}`).toHaveLength(0);
    }
    expect(pass).toBe(true);
  });

  it('reports all four metrics per song', () => {
    const r = evaluateSong(golden[0]);
    expect(r.metrics.map((m) => m.name)).toEqual(['rhyme density', 'line diversity', 'thematic coherence', 'hook strength']);
    expect(r.bangerTotal).toBeGreaterThan(0);
  });

  it('flags a deliberately bad song (all-identical verse lines)', () => {
    const bad: SongPackage = {
      ...golden[0],
      sections: [{ label: 'Verse 1', lines: ['the same flat line here', 'the same flat line here', 'the same flat line here', 'the same flat line here'] }],
    };
    expect(evaluateSong(bad).pass).toBe(false);
  });
});
