// Lightning AI line rewrites — opt-in, visitor BYOK, talks to their own LitServe
// endpoint. Mirrors claudeLyricsProvider.ts's line-rewrite interface but routes
// to a Lightning Studio endpoint instead of api.anthropic.com.
//
// Security: visitor's endpoint + key lives only in localStorage (stored locally,
// their browser calls their endpoint directly) — never routes through our server.
// See docs/lightning-plan.md.

import type { SongInputs } from '../types';

export interface LightningProviderOptions {
  /** Visitor's Lightning Studio endpoint URL */
  endpoint?: string;
  /** Visitor's bearer token (if required) */
  apiKey?: string;
  /** Injectable fetch — tests use this to mock network */
  fetchImpl?: typeof fetch;
}

export type LightningErrorCode = 'missing-endpoint' | 'http-error' | 'malformed-response';

export class LightningProviderError extends Error {
  readonly code: LightningErrorCode;
  readonly status?: number;
  constructor(code: LightningErrorCode, message: string, status?: number) {
    super(`[lightning-lyrics:${code}] ${message}`);
    this.name = 'LightningProviderError';
    this.code = code;
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

/** Build a prompt for Lightning to rewrite a single line, matching the brief context. */
export function buildLightningLineRewritePrompt(
  sectionLabel: string,
  line: string,
  precedingLine: string | undefined,
  followingLine: string | undefined,
  inputs: SongInputs,
  count: number,
): string {
  return [
    `Rewrite ONE line from a song, offering ${count} alternative phrasings.`,
    '',
    `Title: ${inputs.title || 'Untitled'}`,
    `Theme: ${inputs.theme}`,
    `Mood: ${inputs.mood}`,
    `Genre: ${inputs.genre}`,
    '',
    `Section: [${sectionLabel}]`,
    precedingLine ? `Line before (context, do not rewrite): "${precedingLine}"` : '',
    `LINE TO REWRITE: "${line}"`,
    followingLine ? `Line after (context, do not rewrite): "${followingLine}"` : '',
    '',
    'Keep roughly the same meaning, syllable count, and rhyme role as the original line.',
    'Each alternative must be a single, complete, singable line (no bar numbers, no explanation).',
    '',
    `Output ONLY a JSON object in this exact format (no markdown, no extra text):`,
    `{"alternatives":["line 1","line 2","line 3",...]}`,
    `- exactly ${count} alternatives, each a string`,
  ].filter(Boolean).join('\n');
}

// ---------------------------------------------------------------------------
// Response extraction
// ---------------------------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Extract text from various response shapes (similar to lightning.mjs's extractText) */
function extractResponseText(body: unknown): string {
  if (body == null) return '';
  if (typeof body === 'string') return body;
  if (typeof body !== 'object') return String(body);
  // If the body directly has alternatives (our expected format), return it as JSON
  if (isRecord(body) && Array.isArray((body as Record<string, unknown>).alternatives)) {
    return JSON.stringify(body);
  }
  const direct = (body as Record<string, unknown>).output
    ?? (body as Record<string, unknown>).text
    ?? (body as Record<string, unknown>).generated_text
    ?? (body as Record<string, unknown>).completion
    ?? (body as Record<string, unknown>).lyrics
    ?? (body as Record<string, unknown>).response;
  if (typeof direct === 'string') return direct;
  const choices = (body as Record<string, unknown>).choices;
  if (Array.isArray(choices) && choices[0]) {
    const choice = choices[0] as Record<string, unknown>;
    if (typeof choice.text === 'string') return choice.text;
    if (isRecord(choice.message) && typeof choice.message.content === 'string') {
      return choice.message.content;
    }
  }
  if (isRecord(direct) && typeof direct.text === 'string') return direct.text;
  return '';
}

function parseJson(raw: string): unknown {
  try {
    let text = raw.trim();
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fence) text = fence[1].trim();
    if (!text.startsWith('{')) {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start >= 0 && end > start) text = text.slice(start, end + 1);
    }
    return JSON.parse(text);
  } catch {
    throw new LightningProviderError('malformed-response', `response is not valid JSON: ${raw.slice(0, 200)}`);
  }
}

export function parseLightningLineRewrites(raw: string): string[] {
  const data = parseJson(raw);
  if (!isRecord(data) || !Array.isArray(data.alternatives) || data.alternatives.length === 0) {
    throw new LightningProviderError('malformed-response', 'expected {"alternatives":[...]} with at least one entry');
  }
  const lines = data.alternatives
    .filter((l): l is string => typeof l === 'string')
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) {
    throw new LightningProviderError('malformed-response', 'alternatives contained no usable lines');
  }
  return lines;
}

// ---------------------------------------------------------------------------
// The rewrite call
// ---------------------------------------------------------------------------

export interface LightningLineRewriteContext {
  sectionLabel: string;
  line: string;
  precedingLine?: string;
  followingLine?: string;
  inputs: SongInputs;
}

/** Ask Lightning for alternate phrasings of a single line. */
export async function suggestLightningLineRewrites(
  opts: LightningProviderOptions,
  ctx: LightningLineRewriteContext,
  count = 3,
): Promise<string[]> {
  const endpoint = opts.endpoint ?? (typeof process !== 'undefined' ? process.env?.LIGHTNING_ENDPOINT : undefined);
  if (!endpoint) {
    throw new LightningProviderError(
      'missing-endpoint',
      'no Lightning endpoint configured — set it in the Engine Rack or via LIGHTNING_ENDPOINT',
    );
  }

  const doFetch = opts.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : undefined);
  if (!doFetch) {
    throw new LightningProviderError('http-error', 'no fetch implementation available');
  }

  const prompt = buildLightningLineRewritePrompt(
    ctx.sectionLabel,
    ctx.line,
    ctx.precedingLine,
    ctx.followingLine,
    ctx.inputs,
    count,
  );

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.apiKey) {
    headers.Authorization = `Bearer ${opts.apiKey}`;
  }

  try {
    const res = await doFetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ prompt }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new LightningProviderError(
        'http-error',
        `Lightning endpoint returned ${res.status}: ${body.slice(0, 300)}`,
        res.status,
      );
    }

    const raw = await res.text();
    const responseBody = extractResponseText((() => {
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    })());

    return parseLightningLineRewrites(responseBody).slice(0, count);
  } catch (e) {
    if (e instanceof LightningProviderError) throw e;
    throw new LightningProviderError('http-error', `request failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}
