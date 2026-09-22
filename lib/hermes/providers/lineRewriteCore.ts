// Shared core for line-rewrite providers (Lightning + HERMES/SCRIBE).
// Eliminates ~90% duplication between lightningLyricsProvider.ts and
// hermesScribeLyricsProvider.ts. Both providers import and configure this core.

import type { SongInputs } from '../types';

// ---------------------------------------------------------------------------
// Common types
// ---------------------------------------------------------------------------

export interface LineRewriteContext {
  sectionLabel: string;
  line: string;
  precedingLine?: string;
  followingLine?: string;
  inputs: SongInputs;
}

export interface ProviderOptionsBase {
  /** Endpoint URL (required at call time) */
  endpoint?: string;
  /** Injectable fetch — tests use this to mock network */
  fetchImpl?: typeof fetch;
}

export type CoreErrorCode = 'missing-endpoint' | 'http-error' | 'malformed-response';

export class LineRewriteProviderError extends Error {
  readonly code: CoreErrorCode;
  readonly status?: number;
  readonly providerPrefix: string;
  constructor(providerPrefix: string, code: CoreErrorCode, message: string, status?: number) {
    super(`[${providerPrefix}:${code}] ${message}`);
    this.name = `${providerPrefix.charAt(0).toUpperCase() + providerPrefix.slice(1)}ProviderError`;
    this.code = code;
    this.status = status;
    this.providerPrefix = providerPrefix;
  }
}

// ---------------------------------------------------------------------------
// Shared response extraction & parsing
// ---------------------------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function extractResponseText(body: unknown): string {
  if (body == null) return '';
  if (typeof body === 'string') return body;
  if (typeof body !== 'object') return String(body);
  const record = body as Record<string, unknown>;
  if (Array.isArray(record.alternatives)) {
    return JSON.stringify(record);
  }
  const direct = record.output ?? record.text ?? record.generated_text ?? record.completion ?? record.lyrics ?? record.response;
  if (typeof direct === 'string') return direct;
  const choices = record.choices;
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

export function parseJson(raw: string): unknown {
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
    throw new LineRewriteProviderError('shared', 'malformed-response', `response is not valid JSON: ${raw.slice(0, 200)}`);
  }
}

export function parseAlternatives(raw: string, providerPrefix: string): string[] {
  const data = parseJson(raw);
  if (!isRecord(data) || !Array.isArray(data.alternatives) || data.alternatives.length === 0) {
    throw new LineRewriteProviderError(providerPrefix, 'malformed-response', 'expected {"alternatives":[...]} with at least one entry');
  }
  const lines = data.alternatives
    .filter((l): l is string => typeof l === 'string')
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) {
    throw new LineRewriteProviderError(providerPrefix, 'malformed-response', 'alternatives contained no usable lines');
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Prompt builders (provider-specific but share structure)
// ---------------------------------------------------------------------------

export function buildLineRewritePrompt(
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
    'Output ONLY a JSON object in this exact format (no markdown, no extra text):',
    `{"alternatives":["line 1","line 2","line 3",...]}`,
    `- exactly ${count} alternatives, each a string`,
  ].filter(Boolean).join('\n');
}

// ---------------------------------------------------------------------------
// Generic request executor
// ---------------------------------------------------------------------------

export interface RequestConfig {
  providerPrefix: string;
  endpoint: string;
  headers: Record<string, string>;
  body: unknown;
}

export async function executeRewriteRequest(
  config: RequestConfig,
  fetchImpl: typeof fetch,
): Promise<string> {
  try {
    const res = await fetchImpl(config.endpoint, {
      method: 'POST',
      headers: config.headers,
      body: JSON.stringify(config.body),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new LineRewriteProviderError(
        config.providerPrefix,
        'http-error',
        `${config.providerPrefix} endpoint returned ${res.status}: ${body.slice(0, 300)}`,
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

    return responseBody;
  } catch (e) {
    if (e instanceof LineRewriteProviderError) throw e;
    throw new LineRewriteProviderError(config.providerPrefix, 'http-error', `request failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}