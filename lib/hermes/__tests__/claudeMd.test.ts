import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// CLAUDE.md is the memory spine — the saved conventions + the routing table to every
// memory layer. This guard keeps it honest the same way wiringDoc.test.ts keeps the
// brain-wiring doc honest: if a memory layer or a load-bearing rule disappears from the
// spine, the suite fails instead of the knowledge silently rotting.

const root = join(__dirname, '..', '..', '..');
const spinePath = join(root, 'CLAUDE.md');

describe('CLAUDE.md — the memory spine exists and routes everywhere', () => {
  it('exists at the repo root', () => {
    expect(existsSync(spinePath)).toBe(true);
  });

  const spine = existsSync(spinePath) ? readFileSync(spinePath, 'utf8') : '';

  it('routes to every brain/*.json memory file that exists on disk', () => {
    const files = readdirSync(join(root, 'brain')).filter((f) => f.endsWith('.json'));
    expect(files.length).toBeGreaterThanOrEqual(5);
    for (const f of files) {
      // vector-memory.json is generated (gitignored) but still named in the table.
      expect(spine, `CLAUDE.md must mention brain/${f}`).toContain(`brain/${f}`);
    }
    expect(spine).toContain('brain/lexicon/core.json');
  });

  it('routes to every localStorage key the storage + identity layers actually use', () => {
    const src =
      readFileSync(join(root, 'lib/hermes/storage.ts'), 'utf8') +
      readFileSync(join(root, 'lib/hermes/identity.ts'), 'utf8');
    const keys = [...new Set(src.match(/hermes\.[A-Za-z]+\.v\d+/g) ?? [])];
    expect(keys.length).toBeGreaterThanOrEqual(6);
    for (const k of keys) {
      expect(spine, `CLAUDE.md must mention localStorage key ${k}`).toContain(k);
    }
  });

  it('states the iron laws and the hard-won rules', () => {
    for (const phrase of [
      'deterministic', // the contract
      'opts.seed',
      '.env.local', // key hygiene
      'key_', // grep-the-diff rule
      'origin/main', // branch-basing rule
      'Green loop', // the workflow
      'playwright install', // the "never" rule
      'Workers Builds', // known non-blocking check
      'NEXT_PUBLIC_DEV_DOOR', // no public backdoors
      'OG_UNFURL', // founder-gated activation
      'wifi-dj-meme.pages.dev', // deploy + phone-testing facts
    ]) {
      expect(spine, `CLAUDE.md must state: ${phrase}`).toContain(phrase);
    }
  });

  it('routes to the living-state files and the brain anatomy source of truth', () => {
    for (const route of [
      'TODO.md', 'IDEAS.md', 'brain/roadmap.json',
      'lib/hermes/brainMap.ts', 'docs/mobile.md',
      '.claude/skills/resume/SKILL.md',
    ]) {
      expect(spine, `CLAUDE.md must route to ${route}`).toContain(route);
    }
  });

  it('carries the status-board system: the rule, the route, and the generated block', () => {
    expect(spine).toContain('STATUS.md');
    expect(spine).toContain('statusBoard');
    expect(spine).toContain('STATUS:BEGIN'); // the generated block lives here too
    expect(spine).toContain('GEN_DOCS=1 npx vitest run status');
  });
});
