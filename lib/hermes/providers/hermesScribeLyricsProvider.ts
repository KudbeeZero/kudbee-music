// HERMES/SCRIBE server line rewrites — default provider. Browser calls the local/deployed
// SCRIBE backend at NEXT_PUBLIC_SCRIBE_REWRITE_ENDPOINT (default: http://127.0.0.1:8000/scribe/rewrite).
// No keys needed — everyone gets rewrites by default.

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

export interface HermesScribeProviderOptions extends ProviderOptionsBase {
  /** SCRIBE server endpoint URL (defaults to NEXT_PUBLIC_SCRIBE_REWRITE_ENDPOINT) */
  endpoint?: string;
}

export type HermesScribeErrorCode = 'missing-endpoint' | 'http-error' | 'malformed-response';

// Re-export the error class with the correct name for backward compatibility
export { LineRewriteProviderError as HermesScribeProviderError };

// ---------------------------------------------------------------------------
// The rewrite call
// ---------------------------------------------------------------------------

export interface HermesScribeLineRewriteContext extends LineRewriteContext {}

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
    throw new LineRewriteProviderError('hermes-scribe', 'http-error', 'no fetch implementation available');
  }

  const body = {
    sectionLabel: ctx.sectionLabel,
    line: ctx.line,
    precedingLine: ctx.precedingLine,
    followingLine: ctx.followingLine,
    inputs: ctx.inputs,
    count,
  };

  const responseBody = await executeRewriteRequest(
    {
      providerPrefix: 'hermes-scribe',
      endpoint,
      headers: { 'Content-Type': 'application/json' },
      body,
    },
    doFetch,
  );

  return parseAlternatives(responseBody, 'hermes-scribe').slice(0, count);
}