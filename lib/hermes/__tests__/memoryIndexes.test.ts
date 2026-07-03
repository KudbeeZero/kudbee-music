// Folder-level memory indexes — brain/README.md (the vault head page) and
// docs/index.md (the docs head page) — must list every file in their folder, the
// same discipline claudeMd.test.ts already holds CLAUDE.md's memory-layers table to.
// If a file is added to brain/ or docs/ and the index isn't updated, this fails
// instead of the index silently going stale.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..', '..', '..');

describe('brain/README.md — the vault head page routes to every file in brain/', () => {
  const readmePath = join(root, 'brain', 'README.md');
  it('exists', () => {
    expect(existsSync(readmePath)).toBe(true);
  });

  const readme = existsSync(readmePath) ? readFileSync(readmePath, 'utf8') : '';

  it('mentions every top-level brain/ file (json + md, excluding itself)', () => {
    const files = readdirSync(join(root, 'brain')).filter((f) => {
      const full = join(root, 'brain', f);
      return (f.endsWith('.json') || f.endsWith('.md')) && f !== 'README.md' && !statSync(full).isDirectory();
    });
    expect(files.length).toBeGreaterThanOrEqual(8);
    for (const f of files) {
      expect(readme, `brain/README.md must mention ${f}`).toContain(f);
    }
  });

  it('mentions the lexicon subfolder', () => {
    expect(readme).toContain('lexicon/core.json');
  });
});

describe('docs/index.md — the docs head page routes to every doc', () => {
  const indexPath = join(root, 'docs', 'index.md');
  it('exists', () => {
    expect(existsSync(indexPath)).toBe(true);
  });

  const index = existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : '';

  it('mentions every docs/*.md file (excluding itself)', () => {
    const files = readdirSync(join(root, 'docs')).filter((f) => f.endsWith('.md') && f !== 'index.md');
    expect(files.length).toBeGreaterThanOrEqual(15);
    for (const f of files) {
      expect(index, `docs/index.md must mention ${f}`).toContain(f);
    }
  });
});
