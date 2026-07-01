import { describe, it, expect } from 'vitest';
import { runPipeline } from '../pipeline';
import { buildTrace, renderTraceMarkdown } from '../trace';
import type { SongInputs } from '../types';

// `npm run demo` — the 30-second "see it work" moment: generate a full, original song
// end-to-end from one brief, print the lyrics + scores + what each brain region did.
// Deterministic (fixed seed) so it's reproducible and CI-safe. $0, local, no API key.
const BRIEF: SongInputs = {
  title: 'Long Way Up',
  theme: 'turning cold winters and empty pockets into gold records for my family',
  mood: 'hungry, warm, defiant',
  genre: 'soulful boom-bap hip-hop',
  tempoMin: 86, tempoMax: 94,
  voice: 'grounded, real',
  audience: 'my family',
  doNotUse: [], references: '', structure: 'full-song', rhymeTemp: 'balanced',
};
const SEED = 8;

function render(pkg: Awaited<ReturnType<typeof runPipeline>>['pkg']): string {
  const lines: string[] = [];
  lines.push('\n╔══════════════════════════════════════════════════════════╗');
  lines.push(`  🎤 HERMES — "${pkg.title}"  ·  ${pkg.inputs.genre}`);
  lines.push('╚══════════════════════════════════════════════════════════╝');
  lines.push(`\nConcept: ${pkg.conceptSummary}`);
  lines.push(`Lead hook: “${pkg.chosenHook?.text ?? ''}”\n`);
  for (const s of pkg.sections) {
    lines.push(`[${s.label}]`);
    lines.push(s.lines.join('\n'));
    lines.push('');
  }
  lines.push(`Banger score: ${pkg.score.total}/100 — ${pkg.score.verdict}`);
  lines.push(`Uniqueness: ${pkg.uniqueness.score}/100`);
  return lines.join('\n');
}

describe('npm run demo (one-command, end-to-end)', () => {
  it('generates a full original song and prints it + the brain trace', async () => {
    const { pkg } = await runPipeline(BRIEF, { id: 'demo', now: '2026-01-01T00:00:00Z', seed: SEED });
    const trace = buildTrace(pkg, BRIEF, SEED);

    // print the song, then "what each region did"
    console.log(render(pkg));
    console.log('\n' + renderTraceMarkdown(trace));
    console.log('\n▶ Make your own: npm run web:dev → http://localhost:3000/hermes\n');

    // sanity: it really produced a complete song
    expect(pkg.chosenHook?.text?.length ?? 0).toBeGreaterThan(0);
    expect(pkg.sections.length).toBeGreaterThan(3);
    expect(pkg.finalLyrics.length).toBeGreaterThan(80);
    expect(pkg.score.total).toBeGreaterThan(0);
    expect(trace.regions).toHaveLength(11);
  });
});
