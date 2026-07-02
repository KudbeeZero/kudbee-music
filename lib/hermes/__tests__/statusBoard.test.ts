import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  renderStatusMd, renderStatusBlock, injectStatusBlock, extractStatusBlock,
  tracks, ecosystemRows, scoreboard, statusEmoji, ITEM_STATUSES,
  STATUS_BEGIN, STATUS_END, type BlockKind,
} from '../statusBoard';

// The "don't let this happen again" lock. The founder once opened BUILD_LOG.md and
// found a checklist nothing had updated. Status now lives ONLY in brain/roadmap.json;
// every table is generated; these tests fail CI the moment any committed table (or a
// hand-added checkbox) disagrees with the spine. Unlike the old wiringDoc tests, the
// drift assertions here are UN-gated — they read the committed files every run.

const root = join(__dirname, '..', '..', '..');
const HOSTS: { kind: BlockKind; path: string }[] = [
  { kind: 'claude', path: 'CLAUDE.md' },
  { kind: 'readme', path: 'README.md' },
  { kind: 'buildlog', path: 'BUILD_LOG.md' },
];

describe('statusBoard — spine shape', () => {
  it('every governed item has a unique id, a known status, and a title', () => {
    const all = tracks().flatMap((t) => t.items);
    expect(all.length).toBeGreaterThanOrEqual(30);
    const ids = all.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const i of all) {
      expect(ITEM_STATUSES, `${i.id} has unknown status "${i.status}"`).toContain(i.status);
      expect(i.title.trim().length).toBeGreaterThan(0);
    }
  });

  it('every shipped item carries its receipt (a PR or a note)', () => {
    for (const i of tracks().flatMap((t) => t.items).filter((i) => i.status === 'shipped')) {
      expect(Boolean(i.pr || i.note), `${i.id} "${i.title}" shipped without a pr/note receipt`).toBe(true);
    }
  });

  it('the video-studio track is governed (the checklist that once rotted)', () => {
    const video = tracks().find((t) => t.name === 'Video studio');
    expect(video).toBeDefined();
    expect(video!.items.length).toBeGreaterThanOrEqual(8);
  });

  it('ecosystem rows render with an honest emoji (no ❔ escapes)', () => {
    for (const e of ecosystemRows()) {
      expect(statusEmoji(e.status), `ecosystem.${e.key} status "${e.status}" needs an emoji mapping`).not.toBe('❔');
    }
  });

  it('the scoreboard adds up', () => {
    const sb = scoreboard();
    expect(sb.shipped + sb.inBuild + sb.queued).toBe(sb.total);
    expect(sb.shipped).toBeGreaterThan(0);
  });
});

describe('statusBoard — drift lock (committed tables must match the spine)', () => {
  it('STATUS.md is byte-identical to the generator output', () => {
    expect(readFileSync(join(root, 'STATUS.md'), 'utf8')).toBe(renderStatusMd());
  });

  it.each(HOSTS)('$path STATUS block matches the generator', ({ kind, path }) => {
    const committed = extractStatusBlock(readFileSync(join(root, path), 'utf8'));
    expect(committed, `${path} is missing its STATUS markers`).not.toBeNull();
    expect(committed).toBe(renderStatusBlock(kind));
  });

  it('renderStatusMd is deterministic', () => {
    expect(renderStatusMd()).toBe(renderStatusMd());
  });

  it('injectStatusBlock throws on missing markers (no silent misplacement)', () => {
    expect(() => injectStatusBlock('no markers here', 'claude')).toThrow(/markers/i);
  });
});

describe('statusBoard — checkbox lint (pending work belongs in the spine, not prose)', () => {
  // Unchecked boxes are allowed only where a human is the checker-offer:
  // TODO.md (the working list), LAUNCH.md (founder's launch-day gate), .github templates.
  const ALLOW = new Set(['TODO.md', 'LAUNCH.md']);

  const mdFiles = (dir: string, out: string[] = []): string[] => {
    for (const name of readdirSync(dir)) {
      if (['node_modules', 'out', '.next', '.git', '.claude', '.github'].includes(name)) continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) mdFiles(p, out);
      else if (name.endsWith('.md')) out.push(p);
    }
    return out;
  };

  it('no unchecked "- [ ]" checkbox outside the allowlist', () => {
    const offenders: string[] = [];
    for (const file of mdFiles(root)) {
      const rel = file.slice(root.length + 1);
      if (ALLOW.has(rel)) continue;
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, idx) => {
        if (/^\s*[-*] \[ \]/.test(line)) offenders.push(`${rel}:${idx + 1}`);
      });
    }
    expect(offenders, `hand checklists found — move them into brain/roadmap.json:\n${offenders.join('\n')}`).toEqual([]);
  });
});

// ---- regeneration (the only writer) ------------------------------------------------
const genIt = process.env.GEN_DOCS ? it : it.skip;
describe('statusBoard — regenerate (GEN_DOCS=1)', () => {
  genIt('mints STATUS.md + injects every host block', () => {
    writeFileSync(join(root, 'STATUS.md'), renderStatusMd());
    for (const { kind, path } of HOSTS) {
      const p = join(root, path);
      writeFileSync(p, injectStatusBlock(readFileSync(p, 'utf8'), kind));
    }
    expect(STATUS_BEGIN.length + STATUS_END.length).toBeGreaterThan(0);
  });
});
