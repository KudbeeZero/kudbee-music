import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderWiringMermaid, renderWiringDoc } from '../wiringDoc';
import { REGIONS, PATHWAYS } from '../brainMap';

describe('brain-wiring doc (generated from brainMap)', () => {
  it('renders a Mermaid graph with every region as a node', () => {
    const m = renderWiringMermaid();
    expect(m.startsWith('graph TD')).toBe(true);
    for (const r of REGIONS) expect(m).toContain(`"${r.label}"`);
    // hyphenated ids are sanitized for Mermaid (e.g. default-mode → default_mode)
    expect(m).toContain('default_mode');
    expect(m).not.toMatch(/default-mode --/);
  });

  it('renders one edge per pathway', () => {
    const m = renderWiringMermaid();
    const edgeCount = (m.match(/-->/g) ?? []).length;
    expect(edgeCount).toBe(PATHWAYS.length);
  });

  it('renders a full doc with the region reference table', () => {
    const doc = renderWiringDoc();
    expect(doc).toContain('```mermaid');
    expect(doc).toContain('| id | Region | Hemisphere | Backing file |');
    for (const r of REGIONS) {
      expect(doc).toContain(`\`${r.id}\``);
      expect(doc).toContain(`\`${r.doc}\``);
    }
  });

  it('is deterministic', () => {
    expect(renderWiringDoc()).toBe(renderWiringDoc());
  });

  // `GEN_DOCS=1 npx vitest run wiring` (re)mints the committed doc.
  const genIt = process.env.GEN_DOCS ? it : it.skip;
  genIt('mints docs/brain-wiring.md', () => {
    const dir = join(process.cwd(), 'docs');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'brain-wiring.md'), renderWiringDoc());
    expect(true).toBe(true);
  });
});
