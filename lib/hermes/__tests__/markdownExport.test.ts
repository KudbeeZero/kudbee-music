import { describe, it, expect } from 'vitest';
import { songMarkdown } from '../markdownExport';
import { runPipeline } from '../pipeline';
import type { SongInputs } from '../types';

const idea: SongInputs = {
  title: 'Markdown Test', theme: 'building something lasting', mood: 'hopeful',
  genre: 'trap', tempoMin: 130, tempoMax: 150, voice: 'me', audience: 'the team',
  doNotUse: [], references: '', structure: 'full-song',
};

describe('songMarkdown — a clean Markdown export (tiny-feature cadence, #11)', () => {
  it('opens with an H1 title and includes the concept + brief', async () => {
    const { pkg } = await runPipeline(idea, { id: 'a', now: '2026-01-01T00:00:00Z' });
    const md = songMarkdown(pkg);
    expect(md.startsWith(`# ${pkg.title}`)).toBe(true);
    expect(md).toContain('## Concept');
    expect(md).toContain(pkg.conceptSummary);
    expect(md).toContain('## Creative Brief');
    expect(md).toContain(pkg.brief);
  });

  it('quotes the chosen hook when one exists', async () => {
    const { pkg } = await runPipeline(idea, { id: 'a', now: '2026-01-01T00:00:00Z' });
    const md = songMarkdown(pkg);
    if (pkg.chosenHook) {
      expect(md).toContain('## Hook');
      expect(md).toContain(`> "${pkg.chosenHook.text}"`);
    }
  });

  it('renders every section as an H3 with its lines', async () => {
    const { pkg } = await runPipeline(idea, { id: 'a', now: '2026-01-01T00:00:00Z' });
    const md = songMarkdown(pkg);
    for (const s of pkg.sections) {
      expect(md).toContain(`### [${s.label}]`);
      for (const line of s.lines) expect(md).toContain(line);
    }
  });

  it('includes production notes', async () => {
    const { pkg } = await runPipeline(idea, { id: 'a', now: '2026-01-01T00:00:00Z' });
    const md = songMarkdown(pkg);
    expect(md).toContain('## Production Notes');
    expect(md).toContain(`${pkg.production.tempoBpm} BPM`);
    expect(md).toContain(pkg.production.drums);
  });

  it('is deterministic for the same package', async () => {
    const { pkg } = await runPipeline(idea, { id: 'a', now: '2026-01-01T00:00:00Z' });
    expect(songMarkdown(pkg)).toBe(songMarkdown(pkg));
  });
});
