// Runway task ID validation — rejects path-traversal attempts to prevent URL injection.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateTaskId } from '../studio/runway.mjs';

test('validateTaskId accepts alphanumeric IDs with underscores and dashes', () => {
  assert.equal(validateTaskId('task_123'), 'task_123');
  assert.equal(validateTaskId('task-456'), 'task-456');
  assert.equal(validateTaskId('abc123DEF'), 'abc123DEF');
  assert.equal(validateTaskId('a'), 'a');
});

test('validateTaskId rejects non-alphanumeric characters (path traversal protection)', () => {
  assert.throws(() => validateTaskId('task/../escape'), /non-alphanumeric/);
  assert.throws(() => validateTaskId('task/subpath'), /non-alphanumeric/);
  assert.throws(() => validateTaskId('task;inject'), /non-alphanumeric/);
  assert.throws(() => validateTaskId('task?query=1'), /non-alphanumeric/);
  assert.throws(() => validateTaskId('task#hash'), /non-alphanumeric/);
  assert.throws(() => validateTaskId('task%20space'), /non-alphanumeric/);
});

test('validateTaskId rejects non-string and empty values', () => {
  assert.throws(() => validateTaskId(''), /not a non-empty string/);
  assert.throws(() => validateTaskId(null), /not a non-empty string/);
  assert.throws(() => validateTaskId(undefined), /not a non-empty string/);
  assert.throws(() => validateTaskId(123), /not a non-empty string/);
});
