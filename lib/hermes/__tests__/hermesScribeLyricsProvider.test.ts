import { describe, it, expect } from 'vitest';
import {
  suggestHermesScribeLineRewrites,
  HermesScribeProviderError,
} from '../providers/hermesScribeLyricsProvider';
import type { SongInputs } from '../types';

const mockInputs: SongInputs = {
  title: 'Test Song',
  theme: 'love',
  mood: 'hopeful',
  genre: 'pop',
  tempoMin: 100,
  tempoMax: 120,
  voice: 'narrative',
  audience: 'general',
  structure: 'standard',
  rhymeTemp: 'balanced',
};

describe('HERMES SCRIBE lyrics provider', () => {
  it('parses valid rewrite response', async () => {
    const mockFetch = (async () => new Response(JSON.stringify({ alternatives: ['line one', 'line two', 'line three'] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof fetch;

    const result = await suggestHermesScribeLineRewrites(
      { endpoint: 'http://localhost:8000/scribe/rewrite', fetchImpl: mockFetch },
      {
        sectionLabel: 'Verse 1',
        line: 'test line',
        inputs: mockInputs,
      },
      3,
    );
    expect(result).toEqual(['line one', 'line two', 'line three']);
  });

  it('throws http-error on non-2xx response', async () => {
    const mockFetch = (async () => new Response('error', { status: 500 })) as unknown as typeof fetch;
    try {
      await suggestHermesScribeLineRewrites(
        { endpoint: 'http://localhost:8000/scribe/rewrite', fetchImpl: mockFetch },
        {
          sectionLabel: 'Verse 1',
          line: 'test line',
          inputs: mockInputs,
        },
      );
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(HermesScribeProviderError);
      expect((e as HermesScribeProviderError).code).toBe('http-error');
      expect((e as HermesScribeProviderError).status).toBe(500);
    }
  });

  it('throws malformed-response on invalid JSON', async () => {
    const mockFetch = (async () => new Response('not json', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof fetch;

    try {
      await suggestHermesScribeLineRewrites(
        { endpoint: 'http://localhost:8000/scribe/rewrite', fetchImpl: mockFetch },
        {
          sectionLabel: 'Verse 1',
          line: 'test line',
          inputs: mockInputs,
        },
      );
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(HermesScribeProviderError);
      expect((e as HermesScribeProviderError).code).toBe('malformed-response');
    }
  });

  it('throws on missing alternatives field', async () => {
    const mockFetch = (async () => new Response(JSON.stringify({ wrong_field: ['line one'] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof fetch;

    try {
      await suggestHermesScribeLineRewrites(
        { endpoint: 'http://localhost:8000/scribe/rewrite', fetchImpl: mockFetch },
        {
          sectionLabel: 'Verse 1',
          line: 'test line',
          inputs: mockInputs,
        },
      );
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(HermesScribeProviderError);
      expect((e as HermesScribeProviderError).code).toBe('malformed-response');
    }
  });
});
