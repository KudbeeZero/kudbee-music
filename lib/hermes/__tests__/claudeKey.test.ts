import { describe, it, expect, beforeEach } from 'vitest';
import {
  getClaudeKey,
  setClaudeKey,
  clearClaudeKey,
  isClaudeEngineActive,
  setClaudeEngineActive,
  claudeEngineReady,
  __clearClaudeKeyState,
} from '../claudeKey';

describe('claudeKey — bring-your-own-key storage (this browser only)', () => {
  beforeEach(() => __clearClaudeKeyState());

  it('starts with no key and the engine off', () => {
    expect(getClaudeKey()).toBeNull();
    expect(isClaudeEngineActive()).toBe(false);
    expect(claudeEngineReady()).toBe(false);
  });

  it('stores and round-trips a key, trimmed', () => {
    setClaudeKey('  sk-ant-abc123  ');
    expect(getClaudeKey()).toBe('sk-ant-abc123');
  });

  it('an empty/whitespace stored value reads back as null', () => {
    setClaudeKey('   ');
    expect(getClaudeKey()).toBeNull();
  });

  it('the active flag is independent of whether a key is stored', () => {
    setClaudeEngineActive(true);
    expect(isClaudeEngineActive()).toBe(true);
    expect(getClaudeKey()).toBeNull(); // no key yet — still not "ready"
    expect(claudeEngineReady()).toBe(false);
  });

  it('ready only when BOTH a key is stored AND active is on', () => {
    setClaudeKey('sk-ant-abc123');
    expect(claudeEngineReady()).toBe(false); // key but not active
    setClaudeEngineActive(true);
    expect(claudeEngineReady()).toBe(true);
    setClaudeEngineActive(false);
    expect(claudeEngineReady()).toBe(false); // active but off again
  });

  it('clearClaudeKey forgets both the key and the active flag', () => {
    setClaudeKey('sk-ant-abc123');
    setClaudeEngineActive(true);
    clearClaudeKey();
    expect(getClaudeKey()).toBeNull();
    expect(isClaudeEngineActive()).toBe(false);
    expect(claudeEngineReady()).toBe(false);
  });

  it('setClaudeEngineActive(false) removes the stored flag rather than storing a falsy string', () => {
    setClaudeEngineActive(true);
    setClaudeEngineActive(false);
    expect(isClaudeEngineActive()).toBe(false);
  });
});
