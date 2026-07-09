// HERMES/SCRIBE server line rewrites — default provider. Browser calls the local/deployed
// SCRIBE backend at NEXT_PUBLIC_SCRIBE_REWRITE_ENDPOINT (default: http://127.0.0.1:8000/scribe/rewrite).
// No keys needed — everyone gets rewrites by default.

import type { SongInputs } from '../types';
import { isRecord, extractResponseText, parseJson } from './lineRewriteProviderCore';

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

function parseHermesScribeLineRewrites(raw: string): string[] {
  try {
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
  } catch (e) {
    if (e instanceof HermesScribeProviderError) throw e;
    throw new HermesScribeProviderError('malformed-response', e instanceof Error ? e.message : String(e));
  }
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
