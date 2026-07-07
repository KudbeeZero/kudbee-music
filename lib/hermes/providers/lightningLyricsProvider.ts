// Lightning AI line rewrites — opt-in, visitor BYOK, talks to their own LitServe
// endpoint. Mirrors claudeLyricsProvider.ts's line-rewrite interface but routes
// to a Lightning Studio endpoint instead of api.anthropic.com.
//
// Security: visitor's endpoint + key lives only in localStorage (stored locally,
// their browser calls their endpoint directly) — never routes through our server.
// See docs/lightning-plan.md.

import type { SongInputs } from '../types';
import { isRecord, extractResponseText, parseJson } from './lineRewriteProviderCore';

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

export function parseLightningLineRewrites(raw: string): string[] {
  try {
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
  } catch (e) {
    if (e instanceof LightningProviderError) throw e;
    throw new LightningProviderError('malformed-response', e instanceof Error ? e.message : String(e));
  }
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
