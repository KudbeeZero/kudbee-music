// A clean, portable Markdown export of a finished song package — for pasting into
// Notion, GitHub, a lyric sheet, anywhere the JSON export is overkill. Pure,
// deterministic given the same package; no generation logic, just formatting.
import type { SongPackage } from './types';

export function songMarkdown(pkg: SongPackage): string {
  const p = pkg.production;
  const lines: string[] = [
    `# ${pkg.title}`,
    '',
    '## Concept',
    pkg.conceptSummary,
    '',
    '## Creative Brief',
    pkg.brief,
    '',
  ];

  if (pkg.chosenHook) {
    lines.push('## Hook', `> "${pkg.chosenHook.text}"`, '');
  }

  lines.push('## Lyrics', '');
  for (const s of pkg.sections) {
    lines.push(`### [${s.label}]`, ...s.lines, '');
  }

  lines.push(
    '## Production Notes',
    `- **Tempo:** ${p.tempoBpm} BPM`,
    `- **Drums:** ${p.drums}`,
    `- **Bass:** ${p.bass}`,
    `- **Instrumentation:** ${p.instrumentation.join(', ')}`,
    `- **Genre blend:** ${p.genreBlend}`,
    `- **Mix:** ${p.mixVibe}`,
  );

  return lines.join('\n');
}
