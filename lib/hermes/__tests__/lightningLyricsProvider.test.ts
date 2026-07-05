import { describe, it, expect } from 'vitest';
import {
  buildLightningLineRewritePrompt,
  parseLightningLineRewrites,
  LightningProviderError,
  suggestLightningLineRewrites,
} from '../providers/lightningLyricsProvider';
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

describe('Lightning lyrics provider', () => {
  it('builds a rewrite prompt with context', () => {
    const prompt = buildLightningLineRewritePrompt(
      'Verse 1',
      'I walked the lonely streets at night',
      undefined,
      'Looking for a sign',
      mockInputs,
      3,
    );
    expect(prompt).toContain('Rewrite ONE line');
    expect(prompt).toContain('Verse 1');
    expect(prompt).toContain('I walked the lonely streets at night');
    expect(prompt).toContain('Looking for a sign');
    expect(prompt).toContain('"alternatives"');
    expect(prompt).toContain('3');
  });

  it('parses valid line rewrite response', () => {
    const response = '{"alternatives":["line one","line two","line three"]}';
    const result = parseLightningLineRewrites(response);
    expect(result).toEqual(['line one', 'line two', 'line three']);
  });

  it('parses response with markdown fences', () => {
    const response = '```json\n{"alternatives":["line one","line two"]}\n```';
    const result = parseLightningLineRewrites(response);
    expect(result).toEqual(['line one', 'line two']);
  });

  it('filters out empty alternatives', () => {
    const response = '{"alternatives":["line one","","line three"]}';
    const result = parseLightningLineRewrites(response);
    expect(result).toEqual(['line one', 'line three']);
  });

  it('throws on malformed JSON', () => {
    const response = 'not json at all';
    expect(() => parseLightningLineRewrites(response)).toThrow(LightningProviderError);
  });

  it('throws on missing alternatives field', () => {
    const response = '{"wrong_field":["line one"]}';
    expect(() => parseLightningLineRewrites(response)).toThrow(LightningProviderError);
  });

  it('throws on empty alternatives array', () => {
    const response = '{"alternatives":[]}';
    expect(() => parseLightningLineRewrites(response)).toThrow(LightningProviderError);
  });

  it('throws missing-endpoint error when endpoint is not provided', async () => {
    const mockFetch = async () => new Response('ok');
    try {
      await suggestLightningLineRewrites(
        { endpoint: undefined, fetchImpl: mockFetch as any },
        {
          sectionLabel: 'Verse 1',
          line: 'test line',
          inputs: mockInputs,
        },
      );
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(LightningProviderError);
      expect((e as LightningProviderError).code).toBe('missing-endpoint');
    }
  });

  it('throws http-error on non-2xx response', async () => {
    const mockFetch = async () => new Response('error', { status: 500 });
    try {
      await suggestLightningLineRewrites(
        { endpoint: 'https://example.com/predict', fetchImpl: mockFetch as any },
        {
          sectionLabel: 'Verse 1',
          line: 'test line',
          inputs: mockInputs,
        },
      );
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(LightningProviderError);
      expect((e as LightningProviderError).code).toBe('http-error');
      expect((e as LightningProviderError).status).toBe(500);
    }
  });

  it('extracts text from various response shapes', async () => {
    const testCases = [
      { response: '{"output":"{\\"alternatives\\":[\\"line one\\"]}"}' },
      { response: '{"text":"{\\"alternatives\\":[\\"line two\\"]}"}' },
      { response: '{"generated_text":"{\\"alternatives\\":[\\"line three\\"]}"}' },
    ];

    for (const testCase of testCases) {
      const mockFetch = async () => new Response(testCase.response);
      const result = await suggestLightningLineRewrites(
        { endpoint: 'https://example.com/predict', fetchImpl: mockFetch as any },
        {
          sectionLabel: 'Verse 1',
          line: 'test line',
          inputs: mockInputs,
        },
        1,
      );
      expect(result.length).toBe(1);
    }
  });

  it('sends bearer token when apiKey is provided', async () => {
    let capturedHeaders: Record<string, string> = {};
    const mockFetch = async (url: string, init: any) => {
      capturedHeaders = init.headers;
      return new Response('{"alternatives":["line one"]}');
    };

    await suggestLightningLineRewrites(
      {
        endpoint: 'https://example.com/predict',
        apiKey: 'test-token-123',
        fetchImpl: mockFetch as any,
      },
      {
        sectionLabel: 'Verse 1',
        line: 'test line',
        inputs: mockInputs,
      },
      1,
    );

    expect(capturedHeaders.Authorization).toBe('Bearer test-token-123');
  });

  it('omits Authorization header when apiKey is not provided', async () => {
    let capturedHeaders: Record<string, string> = {};
    const mockFetch = async (url: string, init: any) => {
      capturedHeaders = init.headers;
      return new Response('{"alternatives":["line one"]}');
    };

    await suggestLightningLineRewrites(
      {
        endpoint: 'https://example.com/predict',
        apiKey: undefined,
        fetchImpl: mockFetch as any,
      },
      {
        sectionLabel: 'Verse 1',
        line: 'test line',
        inputs: mockInputs,
      },
      1,
    );

    expect(capturedHeaders.Authorization).toBeUndefined();
  });
});
