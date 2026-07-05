// Lightning AI line rewrites adapter — bring-your-own-endpoint variant of
// the Claude Scribe (roadmap 5.5). POSTs a prompt to a Lightning inference
// endpoint and extracts alternative line phrasings. Graceful degradation: any
// error returns an empty array, never throws.
//
// SECURITY: mirrors studio/lightning.mjs exactly — the endpoint lives in
// process.env.LIGHTNING_ENDPOINT (set at call time, no key check at import),
// and is never bundled into the client (server/CLI-only, or visitor's own
// endpoint in localStorage via a future BYOK lane).

import type { LineRewriteContext } from './claudeLyricsProvider';
import type { SongInputs } from '../types';

export interface LightningLineRewriteOptions {
  /** Lightning endpoint URL. Falls back to process.env.LIGHTNING_ENDPOINT. */
  endpoint?: string;
  /** Optional API key for the endpoint (Bearer token). Falls back to process.env.LIGHTNING_API_KEY. */
  apiKey?: string;
  /** Injectable fetch — tests pass a fake so no real network is ever possible. */
  fetchImpl?: typeof fetch;
  /** Field name the endpoint expects for the prompt (default: 'prompt'). */
  field?: string;
}

// ---- Prompt construction ----

/**
 * Lightning-optimized prompt for line rewrites. Simpler than Claude's
 * structured-output approach — we parse the response manually, so the prompt
 * just asks for newline-separated alternatives and counts on the model
 * to be sensible about it.
 */
export function buildLightningLineRewritePrompt(ctx: LineRewriteContext, count: number): string {
  const briefLines = [
    `title: ${ctx.inputs.title || 'Untitled'}`,
    `theme: ${ctx.inputs.theme}`,
    `mood: ${ctx.inputs.mood}`,
    `genre: ${ctx.inputs.genre}`,
    `rhyme temperature: ${ctx.inputs.rhymeTemp ?? 'balanced'}`,
    `voice/persona: ${ctx.inputs.voice}`,
  ];

  const contextLines = [
    ctx.precedingLine ? `Line before: "${ctx.precedingLine}"` : '',
    `LINE TO REWRITE: "${ctx.line}"`,
    ctx.followingLine ? `Line after: "${ctx.followingLine}"` : '',
  ].filter(Boolean);

  return [
    `Rewrite this one song line, offering ${count} natural alternative phrasings.`,
    `Keep the same meaning, syllable count, and rhyme role — these are different deliveries of the same moment.`,
    '',
    'Song context:',
    ...briefLines,
    `Section: [${ctx.sectionLabel}]`,
    '',
    ...contextLines,
    '',
    `Reply with exactly ${count} lines, one per line (newline-separated), nothing else — no numbering, no explanation, no JSON.`,
    'Each line must be a single, complete, singable lyric.',
  ].join('\n');
}

/**
 * Parse newline-separated lines from the response. Filters blank lines,
 * trims whitespace, and returns non-empty results.
 */
export function parseLightningLineRewrites(raw: string): string[] {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.match(/^[\d.)\-*]/)); // skip numbering artifacts

  if (!lines.length) {
    console.warn('lightning line rewrite: no usable lines in response');
    return [];
  }

  return lines;
}

// ---- Core request builder (mirrored from lightning.mjs) ----

/**
 * Build a Lightning POST request. This is the core logic from
 * studio/lightning.mjs#buildRequest, inlined so the provider can work
 * server-side without importing the CLI module.
 */
function buildLightningRequest(
  endpoint: string,
  prompt: string,
  apiKey?: string,
  field: string = 'prompt',
): { url: string; init: RequestInit } {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const body = JSON.stringify({ [field]: prompt });

  return {
    url: endpoint,
    init: { method: 'POST', headers, body },
  };
}

/**
 * Extract text from a Lightning response. Handles the common shapes:
 * direct string, .output, .text, .generated_text, .completion, .lyrics,
 * .response, or OpenAI-style .choices[0].text. Returns '' if the shape
 * is unrecognized (the caller decides what that means).
 */
function extractLightningText(body: unknown): string {
  if (body == null) return '';
  if (typeof body === 'string') return body;
  if (typeof body !== 'object') return String(body);

  const obj = body as Record<string, unknown>;
  const direct =
    obj.output ?? obj.text ?? obj.generated_text ?? obj.completion ?? obj.lyrics ?? obj.response;
  if (typeof direct === 'string') return direct;

  const choice = Array.isArray(obj.choices) ? obj.choices[0] : undefined;
  if (choice && typeof choice === 'object') {
    const c = choice as Record<string, unknown>;
    if (typeof c.text === 'string') return c.text;
    if (c.message && typeof c.message === 'object') {
      const msg = c.message as Record<string, unknown>;
      if (typeof msg.content === 'string') return msg.content;
    }
  }

  if (direct && typeof direct === 'object') {
    const d = direct as Record<string, unknown>;
    if (typeof d.text === 'string') return d.text;
  }

  return '';
}

// ---- Main API ----

/**
 * Ask Lightning for `count` alternate phrasings of a single lyric line.
 * On any error (missing endpoint, network failure, bad response), returns
 * an empty array and logs a warning — graceful degradation, never throws.
 */
export async function suggestLightningLineRewrites(
  ctx: LineRewriteContext,
  count = 3,
  opts: LightningLineRewriteOptions = {},
): Promise<string[]> {
  try {
    const endpoint =
      opts.endpoint ?? (typeof process !== 'undefined' ? process.env?.LIGHTNING_ENDPOINT : undefined);
    const apiKey = typeof process !== 'undefined' ? process.env?.LIGHTNING_API_KEY : undefined;
    const doFetch = opts.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : undefined);

    if (!endpoint) {
      console.warn('suggestLightningLineRewrites: LIGHTNING_ENDPOINT not configured');
      return [];
    }

    if (!doFetch) {
      console.warn('suggestLightningLineRewrites: no fetch implementation available');
      return [];
    }

    const prompt = buildLightningLineRewritePrompt(ctx, count);
    const { url, init } = buildLightningRequest(endpoint, prompt, apiKey, opts.field);

    const res = await doFetch(url, init);
    const raw = await res.text();

    if (!res.ok) {
      console.warn(`suggestLightningLineRewrites: endpoint returned ${res.status}: ${raw.slice(0, 200)}`);
      return [];
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Not JSON — treat as plain text response.
      parsed = raw;
    }

    const text = extractLightningText(parsed);
    if (!text.trim()) {
      console.warn('suggestLightningLineRewrites: endpoint returned empty response');
      return [];
    }

    return parseLightningLineRewrites(text).slice(0, count);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    console.warn(`suggestLightningLineRewrites: ${msg}`);
    return [];
  }
}
