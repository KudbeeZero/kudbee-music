// The dominance dial is the psychological model in code — assert its logic holds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BRAINS, resolveBrain } from '../studio/brain.mjs';

test('balanced is the default and survives unknown names', () => {
  assert.equal(resolveBrain().name, 'balanced');
  assert.equal(resolveBrain('nonsense').name, 'balanced');
  assert.equal(resolveBrain('RIGHT').name, 'right');   // case-insensitive
});

test('balanced presets are unchanged (flagship stays byte-identical)', () => {
  const b = BRAINS.balanced;
  assert.equal(b.maxhold, 4.6);
  assert.equal(b.jump, 90);
  assert.equal(b.mingap, 0.75);
  assert.equal(b.lyricLead, 0.12);
  assert.equal(b.grade, 1.0);
});

test('lateralization is monotonic: left is tighter, right is looser', () => {
  const { left, balanced, right } = BRAINS;
  // right = longer, bolder holds; left = shorter, more legible cuts
  assert.ok(left.maxhold < balanced.maxhold && balanced.maxhold < right.maxhold);
  assert.ok(left.jump < balanced.jump && balanced.jump < right.jump);
  // left guarantees more on-screen time per line; right lets lines crowd
  assert.ok(left.mingap > balanced.mingap && balanced.mingap > right.mingap);
  // left grades calmer, right richer
  assert.ok(left.grade < balanced.grade && balanced.grade < right.grade);
  // the QA gate is strict on the left, lenient on the right
  assert.ok(left.qa.syncDriftMs < balanced.qa.syncDriftMs && balanced.qa.syncDriftMs < right.qa.syncDriftMs);
});

test('every brain carries the full knob set', () => {
  for (const name of Object.keys(BRAINS)) {
    const b = resolveBrain(name);
    for (const k of ['maxhold', 'jump', 'mingap', 'lead', 'lyricLead', 'grade']) {
      assert.equal(typeof b[k], 'number', `${name}.${k}`);
    }
    assert.equal(typeof b.qa.minHoldS, 'number', `${name}.qa.minHoldS`);
  }
});
