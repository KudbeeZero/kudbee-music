import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderPersonasDoc } from '../personasDoc';
import { PERSONAS, SIGNALS } from '../personas';

describe('persona-map doc (generated from personas.ts)', () => {
  it('documents every archetype with its id, essence, and trigger words', () => {
    const doc = renderPersonasDoc();
    for (const p of PERSONAS) {
      expect(doc).toContain(p.name);
      expect(doc).toContain(`\`${p.id}\``);
      expect(doc).toContain(p.essence);
      // at least one trigger word shows up for each persona
      const sig = SIGNALS[p.id]?.[0];
      if (sig) expect(doc).toContain(`\`${sig}\``);
    }
  });

  it('states the original-only, never-name-an-artist stance', () => {
    const doc = renderPersonasDoc();
    expect(doc).toMatch(/never named|never a real artist|No real artist/i);
    expect(doc).toContain('original-only');
  });

  it('is deterministic', () => {
    expect(renderPersonasDoc()).toBe(renderPersonasDoc());
  });

  // The drift lock (un-gated): the COMMITTED doc must match the generator, every run.
  it('docs/personas.md on disk matches the generator (no drift)', () => {
    const committed = readFileSync(join(process.cwd(), 'docs', 'personas.md'), 'utf8');
    expect(committed).toBe(renderPersonasDoc());
  });

  // `GEN_DOCS=1 npx vitest run personasDoc` (re)mints the committed doc.
  const genIt = process.env.GEN_DOCS ? it : it.skip;
  genIt('mints docs/personas.md', () => {
    const dir = join(process.cwd(), 'docs');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'personas.md'), renderPersonasDoc());
    expect(true).toBe(true);
  });
});
