import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  currentProfile,
  signInGuest,
  signInDev,
  signOut,
  authProviders,
  beginOAuth,
  isDevEntryAllowed,
  isDevBuild,
  __clearIdentity,
} from '../identity';

describe('identity — local-first profiles', () => {
  beforeEach(() => __clearIdentity());

  it('starts with no profile', () => {
    expect(currentProfile()).toBeNull();
  });

  it('guest sign-in persists and round-trips through the KV', () => {
    const p = signInGuest('Dom');
    expect(p.kind).toBe('guest');
    expect(p.name).toBe('Dom');
    expect(p.id).toBeTruthy();
    expect(p.createdAt).toBeTruthy();
    const read = currentProfile();
    expect(read).toEqual(p);
  });

  it('guest sign-in without a name defaults to "Guest" (name is optional)', () => {
    expect(signInGuest().name).toBe('Guest');
    expect(signInGuest('   ').name).toBe('Guest');
  });

  it('dev sign-in creates a dev profile', () => {
    const p = signInDev();
    expect(p.kind).toBe('dev');
    expect(currentProfile()?.kind).toBe('dev');
  });

  it('sign-out forgets the profile', () => {
    signInGuest('Dom');
    signOut();
    expect(currentProfile()).toBeNull();
  });

  it('a new sign-in replaces the old profile', () => {
    const a = signInGuest('A');
    const b = signInGuest('B');
    expect(a.id).not.toBe(b.id);
    expect(currentProfile()?.name).toBe('B');
  });
});

describe('identity — the developer door (?dev=1)', () => {
  beforeEach(() => __clearIdentity());

  it('is closed by default', () => {
    expect(isDevEntryAllowed('')).toBe(false);
    expect(isDevEntryAllowed('?dev=0')).toBe(false);
    expect(isDevEntryAllowed('?foo=bar')).toBe(false);
  });

  it('opens with ?dev=1 and persists the flag for later visits', () => {
    expect(isDevEntryAllowed('?dev=1')).toBe(true);
    // later visit, no query string — the door stays open in this browser
    expect(isDevEntryAllowed('')).toBe(true);
  });

  it('the flag does not leak across a cleared store', () => {
    isDevEntryAllowed('?dev=1');
    __clearIdentity();
    expect(isDevEntryAllowed('')).toBe(false);
  });
});

describe('identity — the dev door is NEVER a production backdoor', () => {
  const prevNodeEnv = process.env.NODE_ENV;
  const prevFlag = process.env.NEXT_PUBLIC_DEV_DOOR;
  beforeEach(() => __clearIdentity());
  afterEach(() => {
    // vitest runs with NODE_ENV=test; restore whatever it was so other suites see it
    (process.env as Record<string, string | undefined>).NODE_ENV = prevNodeEnv;
    if (prevFlag === undefined) delete process.env.NEXT_PUBLIC_DEV_DOOR;
    else process.env.NEXT_PUBLIC_DEV_DOOR = prevFlag;
    __clearIdentity();
  });

  it('is inert on a production build even with ?dev=1 (the live-deploy backdoor is closed)', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    delete process.env.NEXT_PUBLIC_DEV_DOOR;
    expect(isDevBuild()).toBe(false);
    expect(isDevEntryAllowed('?dev=1')).toBe(false);
    // a stale flag carried over from a prior dev build must NOT reopen it in prod
    expect(isDevEntryAllowed('')).toBe(false);
  });

  it('is available in a non-production (dev) build', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
    delete process.env.NEXT_PUBLIC_DEV_DOOR;
    expect(isDevBuild()).toBe(true);
    expect(isDevEntryAllowed('?dev=1')).toBe(true);
  });

  it('can be deliberately opted into a production build via NEXT_PUBLIC_DEV_DOOR', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_DEV_DOOR = '1';
    expect(isDevBuild()).toBe(true);
    expect(isDevEntryAllowed('?dev=1')).toBe(true);
    // and NOT opened by a falsy flag value
    process.env.NEXT_PUBLIC_DEV_DOOR = '0';
    __clearIdentity();
    expect(isDevBuild()).toBe(false);
    expect(isDevEntryAllowed('?dev=1')).toBe(false);
  });
});

describe('identity — OAuth seam (honest, not fake)', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('reports no providers when none are configured (today\'s reality)', () => {
    vi.stubEnv('NEXT_PUBLIC_AUTH_GOOGLE', '');
    vi.stubEnv('NEXT_PUBLIC_AUTH_GITHUB', '');
    expect(authProviders()).toEqual([]);
  });

  it('reports providers flagged on via NEXT_PUBLIC_ env', () => {
    vi.stubEnv('NEXT_PUBLIC_AUTH_GOOGLE', '1');
    expect(authProviders()).toEqual(['google']);
    vi.stubEnv('NEXT_PUBLIC_AUTH_GITHUB', 'true');
    expect(authProviders()).toEqual(['google', 'github']);
  });

  it('ignores explicit "0"/"false" values', () => {
    vi.stubEnv('NEXT_PUBLIC_AUTH_GOOGLE', '0');
    vi.stubEnv('NEXT_PUBLIC_AUTH_GITHUB', 'false');
    expect(authProviders()).toEqual([]);
  });

  it('beginOAuth throws a clear "not configured" error instead of faking a flow', () => {
    vi.stubEnv('NEXT_PUBLIC_AUTH_GOOGLE', '');
    expect(() => beginOAuth('google')).toThrow(/isn't configured yet/);
    expect(() => beginOAuth('github')).toThrow(/isn't configured yet/);
  });

  it('beginOAuth still refuses when flagged on but unimplemented (no fake sign-in)', () => {
    vi.stubEnv('NEXT_PUBLIC_AUTH_GOOGLE', '1');
    expect(() => beginOAuth('google')).toThrow(/isn't implemented yet/);
  });
});
