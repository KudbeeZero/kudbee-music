// Verifies the song->video bridge (studio/from-song.mjs) scaffolds a valid,
// buildable video project from a Hit Factory song export.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FROM_SONG = resolve(ROOT, 'studio/from-song.mjs');

const SONG = {
  id: 's1', title: 'Cold Hard Gold', version: 1,
  inputs: { genre: 'aggressive boom-bap hip-hop', mood: 'dark, aggressive', aspect: '16:9' },
  production: { tempoBpm: 90, drums: 'dusty snares', bass: '808' },
  visuals: { musicVideoPrompt: 'Cinematic 16:9 — cold streets at dawn.' },
  sections: [
    { label: 'Hook', lines: ['line one', 'line two'] },
    { label: 'Verse 1', lines: ['verse line a', 'verse line b'] },
  ],
};

test('from-song scaffolds a video project from a Hit Factory song', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 'hermes-bridge-'));
  try {
    const songFile = resolve(dir, 'song.json');
    writeFileSync(songFile, JSON.stringify(SONG));
    const r = spawnSync('node', [FROM_SONG, songFile, '--name', resolve(dir, 'proj')], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);

    const proj = resolve(dir, 'proj');
    assert.ok(existsSync(resolve(proj, 'hermes.json')), 'hermes.json created');
    assert.ok(existsSync(resolve(proj, 'song/lyrics.md')), 'lyrics.md created');
    assert.ok(existsSync(resolve(proj, 'README.md')), 'README created');

    const cfg = JSON.parse(readFileSync(resolve(proj, 'hermes.json'), 'utf8'));
    assert.equal(cfg.pack, 'vhs-lofi');      // boom-bap -> vhs-lofi
    assert.equal(cfg.brain, 'left');         // dark/aggressive -> left
    assert.equal(cfg.aspect, '16:9');

    const lyrics = readFileSync(resolve(proj, 'song/lyrics.md'), 'utf8');
    assert.match(lyrics, /\[Hook\]/);
    assert.match(lyrics, /line one/);
    assert.match(lyrics, /\[Verse 1\]/);

    const readme = readFileSync(resolve(proj, 'README.md'), 'utf8');
    assert.match(readme, /Suno style/);      // carries the production/style reference
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
