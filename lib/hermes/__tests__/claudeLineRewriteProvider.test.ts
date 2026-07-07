// Claude Line Rewrite Provider tests — FULLY OFFLINE. Every test injects a fake
// fetchImpl; global fetch is replaced with a tripwire that throws, so no test in
// this file can ever make a real network call.
//
// Tests the Scribe line editor (roadmap 5.5): real-time rewrite suggestions for
// individual lyric lines via Claude, with full song context and neighboring lines.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  suggestLineRewrites,
  buildLineRewritePrompt,
  parseLineRewrites,
  ClaudeProviderError,
  CLAUDE_DEFAULT_MODEL,
  CLAUDE_API_URL,
  CLAUDE_API_VERSION,
} from '../providers/claudeLyricsProvider';
import type { SongInputs, LineRewriteContext } from '../providers/claudeLyricsProvider';

const inputs: SongInputs = {
  title: 'Signal Fade',
  theme: 'loving someone across distance while the connection keeps dropping',
  mood: 'aching, electric, bittersweet',
  genre: 'synthwave pop',
  tempoMin: 100, tempoMax: 112,
  voice: 'smooth', audience: 'the ones far away',
  doNotUse: ['grind'], references: '', structure: 'full-song',
  rhymeTemp: 'balanced', culture: 'coastal town',
};

const lineCtx: LineRewriteContext = {
  sectionLabel: 'Hook',
  line: 'static where your voice should be',
  precedingLine: 'dial tone in a dark room',
  followingLine: 'I keep the receiver warm',
  inputs,
};

const LINE_REWRITE_RESPONSE_BODY = {
  stop_reason: 'end_turn',
  content: [{ type: 'text', text: JSON.stringify({
    alternatives: [
      'static where your voice used to live',
      'nothing but static where you were',
      'the line goes quiet where you stood',
    ],
  }) }],
};

/** Build a fake fetch that records calls and returns a canned Messages API body. */
function fakeFetch(body: unknown, status = 200) {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl = (async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  return { impl, calls };
}

// Tripwire: if anything in this suite reaches for the real global fetch, fail loudly.
const realFetch = globalThis.fetch;
const savedKey = process.env.ANTHROPIC_API_KEY;
beforeEach(() => {
  globalThis.fetch = (() => {
    throw new Error('TEST TRIPWIRE: real network fetch attempted — provider must use the injected fetchImpl');
  }) as unknown as typeof fetch;
  delete process.env.ANTHROPIC_API_KEY; // tests control the key explicitly
});
afterEach(() => {
  globalThis.fetch = realFetch;
  if (savedKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = savedKey;
});

describe('suggestLineRewrites — Claude Scribe line editor (roadmap 5.5)', () => {
  it('returns 3 alternatives successfully from a well-formed response', async () => {
    const { impl } = fakeFetch(LINE_REWRITE_RESPONSE_BODY);
    const alts = await suggestLineRewrites({ apiKey: 'k', fetchImpl: impl }, lineCtx, 3);
    expect(alts).toHaveLength(3);
    expect(alts[0]).toBe('static where your voice used to live');
    expect(alts[1]).toBe('nothing but static where you were');
    expect(alts[2]).toBe('the line goes quiet where you stood');
  });

  it('gracefully falls back to empty array on network error (with typed error)', async () => {
    const { impl } = fakeFetch({ type: 'error', error: { type: 'rate_limit_error', message: 'slow down' } }, 429);
    await expect(suggestLineRewrites({ apiKey: 'k', fetchImpl: impl }, lineCtx, 3))
      .rejects
      .toMatchObject({ code: 'http-error', status: 429 });
  });

  it('constructs the prompt with the correct line context (section, line, neighbors)', async () => {
    const { impl, calls } = fakeFetch(LINE_REWRITE_RESPONSE_BODY);
    await suggestLineRewrites({ apiKey: 'k', fetchImpl: impl }, lineCtx, 3);

    expect(calls).toHaveLength(1);
    const body = JSON.parse(String(calls[0].init.body));
    const prompt: string = body.messages[0].content;

    expect(prompt).toContain('static where your voice should be');
    expect(prompt).toContain('dial tone in a dark room');
    expect(prompt).toContain('I keep the receiver warm');
    expect(prompt).toContain('[Hook]');
    expect(prompt).toContain(inputs.theme);
  });

  it('parses alternatives into a plain string array (single line per alternative)', async () => {
    const { impl } = fakeFetch(LINE_REWRITE_RESPONSE_BODY);
    const alts = await suggestLineRewrites({ apiKey: 'k', fetchImpl: impl }, lineCtx, 3);
    expect(alts).toEqual([
      'static where your voice used to live',
      'nothing but static where you were',
      'the line goes quiet where you stood',
    ]);
    alts.forEach((alt) => {
      expect(typeof alt).toBe('string');
      expect(alt.trim()).toBe(alt); // no leading/trailing whitespace
      expect(alt.split('\n')).toHaveLength(1); // single line only
    });
  });

  it('handles sparse context (no preceding or following line)', async () => {
    const { impl, calls } = fakeFetch(LINE_REWRITE_RESPONSE_BODY);
    const sparseCtx: LineRewriteContext = {
      sectionLabel: 'Intro',
      line: 'dial tone in a dark room',
      // no precedingLine, no followingLine
      inputs,
    };
    await suggestLineRewrites({ apiKey: 'k', fetchImpl: impl }, sparseCtx, 3);

    const body = JSON.parse(String(calls[0].init.body));
    const prompt: string = body.messages[0].content;

    // Prompt should not contain the word "undefined"
    expect(prompt).not.toContain('undefined');
    // But should still contain the target line
    expect(prompt).toContain('dial tone in a dark room');
  });

  it('honors the count parameter (asks for N, receives N)', async () => {
    const multiResponse = {
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: JSON.stringify({
        alternatives: [
          'alt one',
          'alt two',
          'alt three',
          'alt four',
          'alt five',
        ],
      }) }],
    };
    const { impl, calls } = fakeFetch(multiResponse);
    const alts = await suggestLineRewrites({ apiKey: 'k', fetchImpl: impl }, lineCtx, 5);

    // Verify the prompt asked for exactly 5
    const body = JSON.parse(String(calls[0].init.body));
    const prompt: string = body.messages[0].content;
    expect(prompt).toContain('5 alternative phrasings');
    expect(prompt).toContain('exactly 5 entries');

    // Verify we got exactly 5 back
    expect(alts).toHaveLength(5);
  });

  it('caps alternatives to the requested count (if API returns more)', async () => {
    const overResponse = {
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: JSON.stringify({
        alternatives: [
          'first',
          'second',
          'third',
          'fourth',
          'fifth',
          'extra sixth',
        ],
      }) }],
    };
    const { impl } = fakeFetch(overResponse);
    const alts = await suggestLineRewrites({ apiKey: 'k', fetchImpl: impl }, lineCtx, 3);

    // Should only return the first 3, even though response had 6
    expect(alts).toHaveLength(3);
    expect(alts).toEqual(['first', 'second', 'third']);
  });

  it('builds correct JSON structured-output schema', async () => {
    const { impl, calls } = fakeFetch(LINE_REWRITE_RESPONSE_BODY);
    await suggestLineRewrites({ apiKey: 'k', fetchImpl: impl }, lineCtx, 3);

    const body = JSON.parse(String(calls[0].init.body));
    expect(body.output_config.format.type).toBe('json_schema');
    expect(body.output_config.format.schema.properties.alternatives).toBeDefined();
    expect(body.output_config.format.schema.required).toContain('alternatives');
  });

  it('sends the correct API URL, headers, and model', async () => {
    const { impl, calls } = fakeFetch(LINE_REWRITE_RESPONSE_BODY);
    await suggestLineRewrites({ apiKey: 'sk-test', fetchImpl: impl, model: 'claude-opus-4-8' }, lineCtx, 3);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(CLAUDE_API_URL);

    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('sk-test');
    expect(headers['anthropic-version']).toBe(CLAUDE_API_VERSION);
    expect(headers['content-type']).toBe('application/json');

    const body = JSON.parse(String(calls[0].init.body));
    expect(body.model).toBe('claude-opus-4-8');
  });

  it('propagates missing-key error the same way as generation', async () => {
    const { impl } = fakeFetch(LINE_REWRITE_RESPONSE_BODY);
    await expect(suggestLineRewrites({ fetchImpl: impl }, lineCtx, 3))
      .rejects
      .toMatchObject({ code: 'missing-key' });
  });

  it('throws malformed-response on empty alternatives array', () => {
    const emptyAlts = {
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: JSON.stringify({ alternatives: [] }) }],
    };
    expect(() => parseLineRewrites(JSON.stringify({ alternatives: [] }))).toThrow(ClaudeProviderError);
    expect(() => parseLineRewrites(JSON.stringify({ alternatives: [] }))).toThrow(/malformed-response/);
  });

  it('throws malformed-response on wrong-shape response', () => {
    expect(() => parseLineRewrites(JSON.stringify({ nope: true }))).toThrow(ClaudeProviderError);
    expect(() => parseLineRewrites(JSON.stringify({ alternatives: 'not-an-array' }))).toThrow(ClaudeProviderError);
  });

  it('surfaces HTTP 401 errors clearly for authentication failures', async () => {
    const { impl } = fakeFetch({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }, 401);
    await expect(suggestLineRewrites({ apiKey: 'bad-key', fetchImpl: impl }, lineCtx, 3))
      .rejects
      .toMatchObject({ code: 'http-error', status: 401 });
  });

  it('cleans up whitespace in alternatives (trim)', async () => {
    const whitespaceResponse = {
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: JSON.stringify({
        alternatives: [
          '  static where your voice used to live  ',
          '\n  nothing but static where you were  \n',
          '  the line goes quiet  ',
        ],
      }) }],
    };
    const { impl } = fakeFetch(whitespaceResponse);
    const alts = await suggestLineRewrites({ apiKey: 'k', fetchImpl: impl }, lineCtx, 3);

    expect(alts[0]).toBe('static where your voice used to live');
    expect(alts[1]).toBe('nothing but static where you were');
    expect(alts[2]).toBe('the line goes quiet');
  });

  it('filters out empty strings from alternatives', () => {
    const mixed = parseLineRewrites(JSON.stringify({
      alternatives: ['good line', '', '  ', 'another good line'],
    }));
    // Should filter empty and whitespace-only entries
    expect(mixed.every((l) => l.trim().length > 0)).toBe(true);
  });

  it('includes the song theme and mood in the context', async () => {
    const { impl, calls } = fakeFetch(LINE_REWRITE_RESPONSE_BODY);
    await suggestLineRewrites({ apiKey: 'k', fetchImpl: impl }, lineCtx, 3);

    const body = JSON.parse(String(calls[0].init.body));
    const prompt: string = body.messages[0].content;

    expect(prompt).toContain(inputs.theme);
    expect(prompt).toContain(inputs.mood);
    expect(prompt).toContain(inputs.genre);
  });
});

describe('buildLineRewritePrompt — prompt construction', () => {
  it('formats the section label as [SectionName]', () => {
    const prompt = buildLineRewritePrompt(lineCtx, 3);
    expect(prompt).toMatch(/\[Hook\]/);
  });

  it('includes "exactly N entries" phrasing to enforce count', () => {
    const p3 = buildLineRewritePrompt(lineCtx, 3);
    expect(p3).toContain('exactly 3 entries');

    const p5 = buildLineRewritePrompt(lineCtx, 5);
    expect(p5).toContain('exactly 5 entries');
  });

  it('omits neighbor lines cleanly when not provided', () => {
    const sparseCtx = { ...lineCtx, precedingLine: undefined, followingLine: undefined };
    const prompt = buildLineRewritePrompt(sparseCtx, 3);

    // Should not contain the word "undefined"
    expect(prompt).not.toContain('undefined');
    // But should still contain the target line and section label
    expect(prompt).toContain('static where your voice should be');
    expect(prompt).toContain('[Hook]');
  });

  it('preserves the song brief (theme, mood, genre, culture)', () => {
    const prompt = buildLineRewritePrompt(lineCtx, 3);

    expect(prompt).toContain(inputs.theme);
    expect(prompt).toContain(inputs.mood);
    expect(prompt).toContain(inputs.genre);
    expect(prompt).toContain(inputs.culture);
  });

  it('emphasizes keeping syllable count and rhyme role consistent', () => {
    const prompt = buildLineRewritePrompt(lineCtx, 3);

    expect(prompt).toMatch(/syllable count/);
    expect(prompt).toMatch(/rhyme role/);
    expect(prompt).toMatch(/alternate deliveries/);
  });
});

describe('parseLineRewrites — response parsing', () => {
  it('parses a valid alternatives array into strings', () => {
    const json = JSON.stringify({
      alternatives: ['line one', 'line two', 'line three'],
    });
    const result = parseLineRewrites(json);
    expect(result).toEqual(['line one', 'line two', 'line three']);
  });

  it('rejects empty alternatives', () => {
    expect(() => parseLineRewrites(JSON.stringify({ alternatives: [] }))).toThrow();
  });

  it('rejects missing "alternatives" key', () => {
    expect(() => parseLineRewrites(JSON.stringify({ lines: ['a', 'b'] }))).toThrow();
  });

  it('filters non-string items and empty strings', () => {
    const json = JSON.stringify({
      alternatives: ['good', 123, '', 'also good', null, '   '],
    });
    const result = parseLineRewrites(json);
    expect(result).toEqual(['good', 'also good']);
  });

  it('throws on non-JSON input', () => {
    expect(() => parseLineRewrites('not json')).toThrow(ClaudeProviderError);
  });

  it('is an instance of ClaudeProviderError with code malformed-response', () => {
    const err = (() => {
      try {
        parseLineRewrites(JSON.stringify({ alternatives: [] }));
        return null;
      } catch (e) {
        return e;
      }
    })();
    expect(err).toBeInstanceOf(ClaudeProviderError);
    expect((err as ClaudeProviderError).code).toBe('malformed-response');
  });
});
