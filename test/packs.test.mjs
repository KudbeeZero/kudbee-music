// Guard the scene-pack contract: a pack.json must be valid AND actually wired
// into the compositor. This catches the most common contributor mistake —
// adding scene-packs/<name>/pack.json without a gated branch in player.html.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packsDir = resolve(ROOT, 'scene-packs');
const player = readFileSync(resolve(ROOT, 'studio/player.html'), 'utf8');
const packs = readdirSync(packsDir).filter(d => existsSync(resolve(packsDir, d, 'pack.json')));

test('there are scene packs to validate', () => {
  assert.ok(packs.length >= 2, 'expected at least neo-noir + one more');
});

for (const name of packs) {
  test(`pack "${name}" has a valid manifest`, () => {
    const pack = JSON.parse(readFileSync(resolve(packsDir, name, 'pack.json'), 'utf8'));
    assert.equal(pack.name, name, 'pack.name must match its folder');
    for (const field of ['title', 'description', 'palette']) {
      assert.ok(pack[field], `pack "${name}" missing "${field}"`);
    }
  });

  test(`pack "${name}" is wired into the compositor`, () => {
    // neo-noir is the built-in default scene path (not a gated branch).
    if (name === 'neo-noir') return;
    assert.ok(player.includes(`PACK==='${name}'`) || player.includes(`PACK === '${name}'`),
      `player.html has no "PACK==='${name}'" branch — pack.json exists but isn't rendered`);
    assert.ok(player.includes(`payload.pack==='${name}'`) || player.includes(`payload.pack === '${name}'`),
      `__setup doesn't select pack "${name}"`);
  });
}
