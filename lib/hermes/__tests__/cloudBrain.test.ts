import { describe, it, expect } from 'vitest';
import { cloudConfig, cloudEnabled } from '../cloudBrain';

const GOOD = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefgh.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiInR5cCI6IkpXVCJ9.fake-anon-key-payload',
};

describe('cloudBrain config seam', () => {
  it('is the $0 default: unconfigured → null / disabled', () => {
    expect(cloudConfig({})).toBeNull();
    expect(cloudEnabled({})).toBe(false);
  });

  it('lights up only when BOTH the url and anon key are present', () => {
    expect(cloudConfig({ NEXT_PUBLIC_SUPABASE_URL: GOOD.NEXT_PUBLIC_SUPABASE_URL })).toBeNull();
    expect(cloudConfig({ NEXT_PUBLIC_SUPABASE_ANON_KEY: GOOD.NEXT_PUBLIC_SUPABASE_ANON_KEY })).toBeNull();
    expect(cloudEnabled(GOOD)).toBe(true);
  });

  it('accepts the new sb_publishable_ key format (not just legacy eyJ JWTs)', () => {
    // A fake key in the real format — never the project's actual key in committed source.
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefgh.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_FAKEfakeFAKEfakeFAKEfake0000',
    };
    expect(cloudEnabled(env)).toBe(true);
    expect(cloudConfig(env)?.anonKey).toMatch(/^sb_publishable_/);
  });

  it('parses a valid config and strips a trailing slash', () => {
    const cfg = cloudConfig({ ...GOOD, NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefgh.supabase.co/' });
    expect(cfg).toEqual({ url: 'https://abcdefgh.supabase.co', anonKey: GOOD.NEXT_PUBLIC_SUPABASE_ANON_KEY });
  });

  it('rejects a non-Supabase URL (avoids a broken half-live state)', () => {
    expect(cloudConfig({ ...GOOD, NEXT_PUBLIC_SUPABASE_URL: 'https://evil.example.com' })).toBeNull();
    expect(cloudConfig({ ...GOOD, NEXT_PUBLIC_SUPABASE_URL: 'http://abcdefgh.supabase.co' })).toBeNull(); // must be https
  });

  it('rejects a trivially-short key', () => {
    expect(cloudConfig({ ...GOOD, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'short' })).toBeNull();
  });
});
