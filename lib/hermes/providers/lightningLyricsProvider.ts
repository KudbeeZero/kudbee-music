// Lightning AI line rewrites — opt-in, visitor BYOK, talks to their own LitServe
// endpoint. Mirrors the line-rewrite interface but routes to a Lightning Studio
// endpoint instead of api.anthropic.com.
//
// Security: visitor's endpoint + key lives only in localStorage (stored locally,
// their browser calls their endpoint directly) — never routes through our server.
// See docs/lightning-plan.md.

import type { SongInputs } from '../types';
import {
  LineRewriteContext,
  ProviderOptionsBase,
  LineRewriteProviderError,
  extractResponseText,
  parseAlternatives,
  buildLineRewritePrompt,
  executeRewriteRequest,
} from './lineRewriteCore';

export interface LightningProviderOptions extends ProviderOptionsBase {
  /** Visitor's Lightning Studio endpoint URL */
  endpoint?: string;
  /** Visitor's bearer token (if required) */
  apiKey?: string;
}

export type LightningErrorCode = 'missing-endpoint' | 'http-error' | 'malformed-response';

// Re-export the error class with the correct name for backward compatibility
export { LineRewriteProviderError as LightningProviderError };

// Backward-compatible re-exports for tests and existing consumers
export { buildLineRewritePrompt as buildLightningLineRewritePrompt } from './lineRewriteCore';
export { parseAlternatives } from './lineRewriteCore';

// Wrapper for backward compatibility with the old parseLightningLineRewrites signature
export function parseLightningLineRewrites(raw: string): string[] {
  return parseAlternatives(raw, 'lightning-lyrics');
}

// ---------------------------------------------------------------------------
// The rewrite call
// ---------------------------------------------------------------------------

/** Ask Lightning for alternate phrasings of a single line. */
export async function suggestLightningLineRewrites(
  opts: LightningProviderOptions,
  ctx: LineRewriteContext,
  count = 3,
): Promise<string[]> {
  const endpoint = opts.endpoint ?? (typeof process !== 'undefined' ? process.env?.LIGHTNING_ENDPOINT : undefined);
  if (!endpoint) {
    throw new LineRewriteProviderError('lightning-lyrics', 'missing-endpoint', 'no Lightning endpoint configured — set it in the Engine Rack or via LIGHTNING_ENDPOINT');
  }

  const doFetch = opts.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : undefined);
  if (!doFetch) {
    throw new LineRewriteProviderError('lightning-lyrics', 'http-error', 'no fetch implementation available');
  }

  const prompt = buildLineRewritePrompt(
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

  const responseBody = await executeRewriteRequest(
    {
      providerPrefix: 'lightning-lyrics',
      endpoint,
      headers,
      body: { prompt },
    },
    doFetch,
  );

  return parseAlternatives(responseBody, 'lightning-lyrics').slice(0, count);
}