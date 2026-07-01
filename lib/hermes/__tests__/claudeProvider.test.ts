// Claude Engine provider tests — FULLY OFFLINE. Every test injects a fake
// fetchImpl; global fetch is replaced with a tripwire that throws, so no test in
// this file can ever make a real network call (and therefore never spends money).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createClaudeLyricsProvider,
  ClaudeProviderError,
  repairJsonText,
  CLAUDE_DEFAULT_MODEL,
  CLAUDE_API_URL,
  CLAUDE_API_VERSION,
} from '../providers/claudeLyricsProvider';
import type { SongInputs, HookOption } from '../types';

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

const hook: HookOption = { text: 'static where your voice should be', angle: 'distance as noise', cadence: 'held, floating', score: 80 };

const HOOKS_BODY = {
  stop_reason: 'end_turn',
  content: [{ type: 'text', text: JSON.stringify({
    hooks: [
      { text: 'static where your voice should be', angle: 'distance as noise', cadence: 'held', score: 82 },
      { text: 'call me when the towers sleep', angle: 'night connection', cadence: 'clipped', score: 74 },
    ],
  }) }],
};

const SECTIONS_BODY = {
  stop_reason: 'end_turn',
  content: [{ type: 'text', text: JSON.stringify({
    sections: [
      { label: 'Intro', lines: ['dial tone in a dark room'] },
      { label: 'Hook', lines: ['static where your voice should be', 'I keep the receiver warm'] },
      { label: 'Verse 1', lines: ['two time zones, one lamplight', 'your name glows then goes quiet'] },
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

describe('claudeLyricsProvider — identity and key handling', () => {
  it('exposes the seam contract: id claude-lyrics, live true', () => {
    const p = createClaudeLyricsProvider({ apiKey: 'k', fetchImpl: fakeFetch(HOOKS_BODY).impl });
    expect(p.id).toBe('claude-lyrics');
    expect(p.live).toBe(true);
  });

  it('creating the provider without a key does NOT throw (call-time check, not import/construct time)', () => {
    expect(() => createClaudeLyricsProvider()).not.toThrow();
  });

  it('throws a clear missing-key error at call time and never touches fetch', async () => {
    const { impl, calls } = fakeFetch(HOOKS_BODY);
    const p = createClaudeLyricsProvider({ fetchImpl: impl }); // no key anywhere
    await expect(p.generateHooks(inputs, 3)).rejects.toMatchObject({
      name: 'ClaudeProviderError',
      code: 'missing-key',
    });
    expect(calls).toHaveLength(0); // failed before any request was attempted
  });

  it('falls back to ANTHROPIC_API_KEY from the environment', async () => {
    process.env.ANTHROPIC_API_KEY = 'env-key';
    const { impl, calls } = fakeFetch(HOOKS_BODY);
    const p = createClaudeLyricsProvider({ fetchImpl: impl });
    await p.generateHooks(inputs, 2);
    expect((calls[0].init.headers as Record<string, string>)['x-api-key']).toBe('env-key');
  });
});

describe('claudeLyricsProvider — request shape (per the claude-api skill)', () => {
  it('sends the right URL, headers, model, max_tokens, and structured-output format', async () => {
    const { impl, calls } = fakeFetch(HOOKS_BODY);
    const p = createClaudeLyricsProvider({ apiKey: 'sk-test', fetchImpl: impl, maxTokens: 1234 });
    await p.generateHooks(inputs, 5, 7, ['midnight']);

    expect(calls).toHaveLength(1); // the fake was called INSTEAD of any real network
    expect(calls[0].url).toBe(CLAUDE_API_URL);
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('sk-test');
    expect(headers['anthropic-version']).toBe(CLAUDE_API_VERSION);
    expect(headers['content-type']).toBe('application/json');

    const body = JSON.parse(String(calls[0].init.body));
    expect(body.model).toBe(CLAUDE_DEFAULT_MODEL);
    expect(body.max_tokens).toBe(1234);
    expect(body.output_config.format.type).toBe('json_schema');
    expect(typeof body.system).toBe('string');
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe('user');
    // no sampling params — removed on current models (would 400)
    expect(body.temperature).toBeUndefined();
    expect(body.top_p).toBeUndefined();
  });

  it('carries the full brief, the banned words, and the seed as a take hint in the prompt', async () => {
    const { impl, calls } = fakeFetch(HOOKS_BODY);
    const p = createClaudeLyricsProvider({ apiKey: 'k', fetchImpl: impl });
    await p.generateHooks(inputs, 5, 42, ['midnight', 'hustle']);

    const body = JSON.parse(String(calls[0].init.body));
    const prompt: string = body.messages[0].content;
    expect(prompt).toContain(inputs.theme);
    expect(prompt).toContain(inputs.mood);
    expect(prompt).toContain(inputs.genre);
    expect(prompt).toContain(inputs.voice);
    expect(prompt).toContain(inputs.audience);
    expect(prompt).toContain('full-song');
    expect(prompt).toContain('balanced');
    expect(prompt).toContain('coastal town');
    expect(prompt).toContain('midnight');
    expect(prompt).toContain('hustle');
    expect(prompt).toContain('grind'); // doNotUse merged into the avoid list
    expect(prompt).toContain('take #42'); // seed threaded honestly as a variation hint
    // craft rules live in the system prompt
    expect(body.system).toMatch(/ORIGINAL/);
    expect(body.system).toMatch(/8 words or fewer/);
  });

  it('overrides the model when asked', async () => {
    const { impl, calls } = fakeFetch(HOOKS_BODY);
    const p = createClaudeLyricsProvider({ apiKey: 'k', fetchImpl: impl, model: 'claude-haiku-4-5' });
    await p.generateHooks(inputs, 2);
    expect(JSON.parse(String(calls[0].init.body)).model).toBe('claude-haiku-4-5');
  });
});

describe('claudeLyricsProvider — parsing', () => {
  it('parses a happy-path hooks response into HookOption[]', async () => {
    const p = createClaudeLyricsProvider({ apiKey: 'k', fetchImpl: fakeFetch(HOOKS_BODY).impl });
    const hooks = await p.generateHooks(inputs, 2);
    expect(hooks).toHaveLength(2);
    expect(hooks[0]).toEqual({
      text: 'static where your voice should be',
      angle: 'distance as noise',
      cadence: 'held',
      score: 82,
    });
    expect(hooks.every((h) => h.score >= 0 && h.score <= 100)).toBe(true);
  });

  it('parses a happy-path sections response into SongSection[]', async () => {
    const p = createClaudeLyricsProvider({ apiKey: 'k', fetchImpl: fakeFetch(SECTIONS_BODY).impl });
    const sections = await p.generateSections(inputs, hook);
    expect(sections.map((s) => s.label)).toEqual(['Intro', 'Hook', 'Verse 1']);
    expect(sections[1].lines[0]).toBe('static where your voice should be');
  });

  it('repairs markdown-fenced JSON', async () => {
    const fenced = {
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Here you go:\n```json\n' + JSON.stringify({
        hooks: [{ text: 'paper moon over the port', angle: 'a', cadence: 'c', score: 70 }],
      }) + '\n```' }],
    };
    const p = createClaudeLyricsProvider({ apiKey: 'k', fetchImpl: fakeFetch(fenced).impl });
    const hooks = await p.generateHooks(inputs, 1);
    expect(hooks[0].text).toBe('paper moon over the port');
  });

  it('repairJsonText also recovers a bare object wrapped in prose', () => {
    expect(repairJsonText('sure! {"a":1} hope that helps')).toBe('{"a":1}');
    expect(repairJsonText('```json\n{"a":1}\n```')).toBe('{"a":1}');
    expect(repairJsonText('{"a":1}')).toBe('{"a":1}');
  });

  it('throws a typed malformed-response error on non-JSON output', async () => {
    const bad = { stop_reason: 'end_turn', content: [{ type: 'text', text: 'I would love to help but here are some thoughts...' }] };
    const p = createClaudeLyricsProvider({ apiKey: 'k', fetchImpl: fakeFetch(bad).impl });
    await expect(p.generateHooks(inputs, 3)).rejects.toMatchObject({ code: 'malformed-response' });
  });

  it('throws a typed malformed-response error on wrong-shape JSON', async () => {
    const wrong = { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({ hooks: [{ nope: true }] }) }] };
    const p = createClaudeLyricsProvider({ apiKey: 'k', fetchImpl: fakeFetch(wrong).impl });
    await expect(p.generateHooks(inputs, 3)).rejects.toMatchObject({ code: 'malformed-response' });

    const wrongSections = { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({ sections: [{ label: 'Hook', lines: [1, 2] }] }) }] };
    const p2 = createClaudeLyricsProvider({ apiKey: 'k', fetchImpl: fakeFetch(wrongSections).impl });
    await expect(p2.generateSections(inputs, hook)).rejects.toMatchObject({ code: 'malformed-response' });
  });

  it('surfaces HTTP errors with the status code', async () => {
    const p = createClaudeLyricsProvider({
      apiKey: 'k',
      fetchImpl: fakeFetch({ type: 'error', error: { type: 'rate_limit_error', message: 'slow down' } }, 429).impl,
    });
    await expect(p.generateHooks(inputs, 3)).rejects.toMatchObject({ code: 'http-error', status: 429 });
  });

  it('surfaces a refusal stop_reason as a typed error', async () => {
    const refusal = { stop_reason: 'refusal', content: [] };
    const p = createClaudeLyricsProvider({ apiKey: 'k', fetchImpl: fakeFetch(refusal).impl });
    await expect(p.generateHooks(inputs, 3)).rejects.toMatchObject({ code: 'refusal' });
  });

  it('errors are instances of ClaudeProviderError with a greppable prefix', async () => {
    const p = createClaudeLyricsProvider({ fetchImpl: fakeFetch(HOOKS_BODY).impl });
    const err = await p.generateHooks(inputs, 1).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ClaudeProviderError);
    expect((err as Error).message).toContain('[claude-lyrics:missing-key]');
  });
});
