// HERMES/SCRIBE server line rewrites — default provider. Browser calls the local/deployed
// SCRIBE backend at NEXT_PUBLIC_SCRIBE_REWRITE_ENDPOINT (default: http://127.0.0.1:8000/scribe/rewrite).
// No keys needed — everyone gets rewrites by default.

import type { SongInputs } from '../types';

export interface HermesScribeProviderOptions {
  /** SCRIBE server endpoint URL (defaults to NEXT_PUBLIC_SCRIBE_REWRITE_ENDPOINT) */
  endpoint?: string;
  /** Injectable fetch — tests use this to mock network */
  fetchImpl?: typeof fetch;
}

export type HermesScribeErrorCode = 'missing-endpoint' | 'http-error' | 'malformed-response';

export class HermesScribeProviderError extends Error {
  readonly code: HermesScribeErrorCode;
  readonly status?: number;
  constructor(code: HermesScribeErrorCode, message: string, status?: number) {
    super(`[hermes-scribe:${code}] ${message}`);
    this.name = 'HermesScribeProviderError';
    this.code = code;
    this.status = status;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function extractResponseText(body: unknown): string {
  if (body == null) return '';
  if (typeof body === 'string') return body;
  if (typeof body !== 'object') return String(body);
  // If the body directly has alternatives, return it as JSON
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
    throw new HermesScribeProviderError('malformed-response', `response is not valid JSON: ${raw.slice(0, 200)}`);
  }
}

function parseHermesScribeLineRewrites(raw: string): string[] {
  const data = parseJson(raw);
  if (!isRecord(data) || !Array.isArray(data.alternatives) || data.alternatives.length === 0) {
    throw new HermesScribeProviderError('malformed-response', 'expected {"alternatives":[...]} with at least one entry');
  }
  const lines = data.alternatives
    .filter((l): l is string => typeof l === 'string')
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) {
    throw new HermesScribeProviderError('malformed-response', 'alternatives contained no usable lines');
  }
  return lines;
}

export interface HermesScribeLineRewriteContext {
  sectionLabel: string;
  line: string;
  precedingLine?: string;
  followingLine?: string;
  inputs: SongInputs;
}

export async function suggestHermesScribeLineRewrites(
  opts: HermesScribeProviderOptions,
  ctx: HermesScribeLineRewriteContext,
  count = 3,
): Promise<string[]> {
  const endpoint = opts.endpoint ?? (typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_SCRIBE_REWRITE_ENDPOINT : undefined) ?? 'http://127.0.0.1:8000/scribe/rewrite';
  if (!endpoint || endpoint === 'http://127.0.0.1:8000/scribe/rewrite') {
    // Default is fine, don't error on it
  }

  const doFetch = opts.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : undefined);
  if (!doFetch) {
    throw new HermesScribeProviderError('http-error', 'no fetch implementation available');
  }

  const body = {
    sectionLabel: ctx.sectionLabel,
    line: ctx.line,
    precedingLine: ctx.precedingLine,
    followingLine: ctx.followingLine,
    inputs: ctx.inputs,
    count,
  };

  try {
    const res = await doFetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new HermesScribeProviderError(
        'http-error',
        `SCRIBE endpoint returned ${res.status}: ${text.slice(0, 300)}`,
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

    return parseHermesScribeLineRewrites(responseBody).slice(0, count);
  } catch (e) {
    if (e instanceof HermesScribeProviderError) throw e;
    throw new HermesScribeProviderError('http-error', `request failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}
