// The Claude Engine — a real-AI LyricsProvider behind the exact same seam as the
// mock (roadmap 5.1). OPT-IN ONLY: the mock stays the default everywhere. Two opt-in
// lanes use this module: the CLI/eval lane (`npm run eval:compare`, founder's own
// ANTHROPIC_API_KEY) and the web app's Engine Rack BYOK path (roadmap 5.4, a
// visitor's own key, never a founder-controlled one — see the bundle-rule note below).
//
// HONESTY NOTE (this matters to the repo's ethos): the live engine does NOT promise
// determinism. The mock reproduces a draft exactly for a given seed; an LLM does not.
// We thread `seed` through as a "take" hint in the prompt — same seed *asks for* the
// same take, but the API gives no reproducibility guarantee, and current Claude
// models accept no temperature/top_p parameters at all. Docs: docs/claude-engine.md.
//
// API details follow the claude-api skill (2026-06 cache): Messages API
// (POST /v1/messages), headers `x-api-key` + `anthropic-version: 2023-06-01`,
// default model `claude-opus-4-8`. Strict JSON via structured outputs
// (`output_config.format` with a json_schema) — belt — plus defensive parsing of
// the returned text (fence stripping, shape validation) — suspenders.
//
// Bundle rule (updated for BYOK, roadmap 5.4): this module MAY be imported by
// components/ now — Rack.tsx and HermesHitFactory.tsx opt into it only when a
// visitor has pasted their OWN key into the rack (lib/hermes/claudeKey.ts,
// localStorage-only, never our server). The mock stays the default everywhere
// else; nothing here ever reads a founder-controlled key or env var from the
// browser bundle. The eval lane still uses this same module server-side with
// ANTHROPIC_API_KEY. It uses only global fetch (Node 22 / browser native) and
// guards `process` access, so it is safe to bundle client-side.
import type { SongInputs, HookOption, SongSection } from '../types';
import type { LyricsProvider } from './providerTypes';

export interface ClaudeLyricsProviderOptions {
  /** Explicit key. Falls back to process.env.ANTHROPIC_API_KEY (checked at CALL time). */
  apiKey?: string;
  /** Messages API model id. Default: the current recommended model. */
  model?: string;
  /** Injectable fetch — tests pass a fake so no real network is ever possible. */
  fetchImpl?: typeof fetch;
  /** Output token ceiling per request. Small on purpose (short JSON payloads = cost cap). */
  maxTokens?: number;
}

/** Current recommended model per the claude-api skill. */
export const CLAUDE_DEFAULT_MODEL = 'claude-opus-4-8';
export const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
export const CLAUDE_API_VERSION = '2023-06-01';
const DEFAULT_MAX_TOKENS = 4096;

export type ClaudeErrorCode = 'missing-key' | 'http-error' | 'refusal' | 'malformed-response';

/** Typed, greppable failure for everything that can go wrong on the live lane. */
export class ClaudeProviderError extends Error {
  readonly code: ClaudeErrorCode;
  readonly status?: number;
  constructor(code: ClaudeErrorCode, message: string, status?: number) {
    super(`[claude-lyrics:${code}] ${message}`);
    this.name = 'ClaudeProviderError';
    this.code = code;
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

/** The repo's craft rules, stated to the model exactly as the mock engine lives them. */
const CRAFT_RULES = [
  'Write 100% ORIGINAL material. Never quote, interpolate, or imitate any existing song, artist, or recognizable lyric.',
  'No artist mimicry: do not write "in the style of" any named artist, even if the references mention one — references describe a feel, never material to copy.',
  'Concrete imagery over abstraction: real objects, places, and actions the listener can see. Grounded and specific — not corny.',
  'Verses favor rhymed couplets (end-rhyme in pairs); respect the rhyme temperature: tight = perfect rhymes, balanced = mix, loose = slant rhymes welcome.',
  'Hooks should be short and singable — 8 words or fewer is strongly preferred.',
  'Strictly avoid every word and phrase in the AVOID LIST (hard constraint, not a suggestion).',
].join('\n- ');

function systemPrompt(): string {
  return [
    'You are the lyric engine inside HERMES, a songwriting studio. You turn a structured',
    'creative brief into original song material and answer with STRICT JSON only — no',
    'markdown, no commentary, no code fences. Craft rules:',
    `- ${CRAFT_RULES}`,
  ].join('\n');
}

/** Serialize the whole brief so the model sees every dial the artist set. */
function briefBlock(inputs: SongInputs): string {
  return [
    `title: ${inputs.title || 'Untitled'}`,
    `theme: ${inputs.theme}`,
    `mood: ${inputs.mood}`,
    `genre: ${inputs.genre}`,
    `tempo: ${inputs.tempoMin}-${inputs.tempoMax} BPM`,
    `voice/persona: ${inputs.voice}`,
    `audience: ${inputs.audience}`,
    `structure: ${inputs.structure}`,
    `rhyme temperature: ${inputs.rhymeTemp ?? 'balanced'}`,
    `culture/background (the artist's own, used as craft): ${inputs.culture ?? 'not specified'}`,
    `references (feel only, never copied): ${inputs.references || 'none'}`,
  ].join('\n');
}

function avoidBlock(inputs: SongInputs, bannedWords?: string[]): string {
  const all = [...new Set([...(bannedWords ?? []), ...(inputs.doNotUse ?? [])])];
  return all.length ? `AVOID LIST (never use any of these):\n${all.join(', ')}` : 'AVOID LIST: (empty)';
}

/** Seed → "take" hint. Honest framing: a request for variation, not a determinism knob. */
function takeBlock(seed?: number): string {
  return seed === undefined
    ? ''
    : `\nThis is take #${seed}. Different take numbers should read as genuinely different creative takes on the same brief. (Note: this is a variation hint only — no determinism is promised.)`;
}

export function buildHooksPrompt(inputs: SongInputs, count: number, seed?: number, bannedWords?: string[]): string {
  return [
    `Write ${count} candidate hooks (chorus one-liners) for this brief.`,
    '',
    briefBlock(inputs),
    '',
    avoidBlock(inputs, bannedWords),
    takeBlock(seed),
    '',
    'Respond with STRICT JSON matching exactly:',
    '{"hooks":[{"text":"the hook line","angle":"why it works","cadence":"delivery feel","score":0}]}',
    `- exactly ${count} entries; "score" is your own 0-100 stickiness estimate (integer).`,
  ].join('\n');
}

export function buildSectionsPrompt(inputs: SongInputs, hook: HookOption, seed?: number, bannedWords?: string[]): string {
  return [
    'Write the full song sections for this brief, built around the committed hook.',
    '',
    briefBlock(inputs),
    '',
    `COMMITTED HOOK: "${hook.text}" (angle: ${hook.angle}; cadence: ${hook.cadence})`,
    'The Hook section must use this hook text as its anchor line.',
    '',
    avoidBlock(inputs, bannedWords),
    takeBlock(seed),
    '',
    'Respond with STRICT JSON matching exactly:',
    '{"sections":[{"label":"Intro","lines":["line one","line two"]}]}',
    '- Use labels like Intro / Verse 1 / Hook / Verse 2 / Bridge / Outro appropriate to the structure.',
    '- Verses: 8 lines each in rhymed couplets. Hook: 4 lines. Every line is a plain string (no bar numbers).',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Structured-output schemas (output_config.format — all objects must set
// additionalProperties:false per the structured-outputs contract)
// ---------------------------------------------------------------------------

const HOOKS_SCHEMA = {
  type: 'object',
  properties: {
    hooks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          angle: { type: 'string' },
          cadence: { type: 'string' },
          score: { type: 'integer' },
        },
        required: ['text', 'angle', 'cadence', 'score'],
        additionalProperties: false,
      },
    },
  },
  required: ['hooks'],
  additionalProperties: false,
} as const;

const SECTIONS_SCHEMA = {
  type: 'object',
  properties: {
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          lines: { type: 'array', items: { type: 'string' } },
        },
        required: ['label', 'lines'],
        additionalProperties: false,
      },
    },
  },
  required: ['sections'],
  additionalProperties: false,
} as const;

// ---------------------------------------------------------------------------
// Defensive parsing — reject/repair fences, validate shapes, typed errors
// ---------------------------------------------------------------------------

/** Strip markdown code fences and any stray prose around the outermost JSON object. */
export function repairJsonText(raw: string): string {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fence) text = fence[1].trim();
  if (!text.startsWith('{')) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) text = text.slice(start, end + 1);
  }
  return text;
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(repairJsonText(raw));
  } catch {
    throw new ClaudeProviderError('malformed-response', `model output is not valid JSON: ${raw.slice(0, 200)}`);
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function parseHooks(raw: string): HookOption[] {
  const data = parseJson(raw);
  if (!isRecord(data) || !Array.isArray(data.hooks) || data.hooks.length === 0) {
    throw new ClaudeProviderError('malformed-response', 'expected {"hooks":[...]} with at least one entry');
  }
  return data.hooks.map((h, i): HookOption => {
    if (!isRecord(h) || typeof h.text !== 'string' || !h.text.trim()) {
      throw new ClaudeProviderError('malformed-response', `hooks[${i}] is missing a non-empty "text"`);
    }
    const score = typeof h.score === 'number' && Number.isFinite(h.score) ? h.score : 50;
    return {
      text: h.text.trim(),
      angle: typeof h.angle === 'string' ? h.angle : 'model-supplied hook',
      cadence: typeof h.cadence === 'string' ? h.cadence : 'natural delivery',
      score: Math.max(0, Math.min(100, Math.round(score))),
    };
  });
}

export function parseSections(raw: string): SongSection[] {
  const data = parseJson(raw);
  if (!isRecord(data) || !Array.isArray(data.sections) || data.sections.length === 0) {
    throw new ClaudeProviderError('malformed-response', 'expected {"sections":[...]} with at least one entry');
  }
  return data.sections.map((s, i): SongSection => {
    if (
      !isRecord(s) || typeof s.label !== 'string' || !s.label.trim() ||
      !Array.isArray(s.lines) || !s.lines.every((l): l is string => typeof l === 'string')
    ) {
      throw new ClaudeProviderError('malformed-response', `sections[${i}] must be {label: string, lines: string[]}`);
    }
    return { label: s.label.trim(), lines: s.lines.map((l) => l.trim()).filter(Boolean) };
  });
}

// ---------------------------------------------------------------------------
// The shared call — every Claude feature in this module (generation, line
// rewrites, the Rack's "Test key" check) funnels through this one function,
// so key resolution / CORS header / error typing stay in exactly one place.
// ---------------------------------------------------------------------------

function resolveKey(opts: ClaudeLyricsProviderOptions): string {
  const key = opts.apiKey
    ?? (typeof process !== 'undefined' ? process.env?.ANTHROPIC_API_KEY : undefined);
  if (!key) {
    throw new ClaudeProviderError(
      'missing-key',
      'no API key available — pass { apiKey } or set ANTHROPIC_API_KEY. ' +
      'The mock engine remains the default; this provider is only used by the opt-in eval lane.',
    );
  }
  return key;
}

function resolveFetch(opts: ClaudeLyricsProviderOptions): typeof fetch {
  const f = opts.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : undefined);
  if (!f) throw new ClaudeProviderError('http-error', 'no fetch implementation available in this runtime');
  return f;
}

/**
 * Call the Messages API once and return the raw text content. Call-time key
 * check (never at import/construct time) — creating a provider or calling this
 * with no key throws `missing-key` before any request is attempted.
 */
async function callClaudeMessages(
  opts: ClaudeLyricsProviderOptions,
  system: string,
  prompt: string,
  schema: object,
): Promise<string> {
  const model = opts.model ?? CLAUDE_DEFAULT_MODEL;
  const maxTokens = opts.maxTokens ?? DEFAULT_MAX_TOKENS;
  const key = resolveKey(opts);
  const doFetch = resolveFetch(opts);
  const res = await doFetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': CLAUDE_API_VERSION,
      // Anthropic's sanctioned BYOK escape hatch: without this header, a browser's
      // CORS preflight to api.anthropic.com is rejected. Only send it when we're
      // actually running in a browser (the Rack's own-key path) — the CLI/eval
      // lane runs in Node and never needs it.
      ...(typeof window !== 'undefined' ? { 'anthropic-dangerous-direct-browser-access': 'true' } : {}),
    },
    // NOTE: no temperature/top_p/top_k — removed on current models (400 if sent).
    // Variation is requested via the "take" hint in the prompt instead.
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: prompt }],
      output_config: { format: { type: 'json_schema', schema } },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ClaudeProviderError('http-error', `Messages API returned ${res.status}: ${body.slice(0, 300)}`, res.status);
  }
  const msg = (await res.json()) as {
    stop_reason?: string;
    content?: { type: string; text?: string }[];
  };
  if (msg.stop_reason === 'refusal') {
    throw new ClaudeProviderError('refusal', 'the model declined this request (stop_reason: refusal)');
  }
  const text = (msg.content ?? [])
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('');
  if (!text.trim()) {
    throw new ClaudeProviderError('malformed-response', 'response contained no text content');
  }
  return text;
}

// ---------------------------------------------------------------------------
// The provider
// ---------------------------------------------------------------------------

/**
 * Create the Claude-backed LyricsProvider. Creating it is always safe (no key
 * check at construction/import time); the missing-key error is thrown at CALL
 * time, when a generate method actually needs to hit the API.
 */
export function createClaudeLyricsProvider(opts: ClaudeLyricsProviderOptions = {}): LyricsProvider {
  return {
    id: 'claude-lyrics',
    live: true,
    async generateHooks(inputs, count, seed, bannedWords) {
      const text = await callClaudeMessages(
        opts, systemPrompt(), buildHooksPrompt(inputs, count, seed, bannedWords), HOOKS_SCHEMA,
      );
      return parseHooks(text).slice(0, count);
    },
    async generateSections(inputs, hook, seed, bannedWords) {
      const text = await callClaudeMessages(
        opts, systemPrompt(), buildSectionsPrompt(inputs, hook, seed, bannedWords), SECTIONS_SCHEMA,
      );
      return parseSections(text);
    },
  };
}

// ---------------------------------------------------------------------------
// Scribe — AI line rewrites (roadmap 5.5). A per-line "give me alternatives"
// tool, not part of the LyricsProvider seam (the mock has no equivalent — this
// is a Claude Engine–only value-add, gated the same BYOK way as generation).
// ---------------------------------------------------------------------------

export interface LineRewriteContext {
  sectionLabel: string;
  line: string;
  precedingLine?: string;
  followingLine?: string;
  inputs: SongInputs;
}

const LINE_REWRITE_SCHEMA = {
  type: 'object',
  properties: {
    alternatives: { type: 'array', items: { type: 'string' } },
  },
  required: ['alternatives'],
  additionalProperties: false,
} as const;

export function buildLineRewritePrompt(ctx: LineRewriteContext, count: number): string {
  return [
    `Rewrite ONE line from a song, offering ${count} alternative phrasings.`,
    '',
    briefBlock(ctx.inputs),
    '',
    `Section: [${ctx.sectionLabel}]`,
    ctx.precedingLine ? `Line before (context, do not rewrite): "${ctx.precedingLine}"` : '',
    `LINE TO REWRITE: "${ctx.line}"`,
    ctx.followingLine ? `Line after (context, do not rewrite): "${ctx.followingLine}"` : '',
    '',
    'Keep roughly the same meaning, syllable count, and rhyme role as the original line —',
    'these are alternate deliveries of the same moment, not a new idea. Each alternative must',
    'be a single, complete, singable line (no bar numbers, no explanation).',
    '',
    'Respond with STRICT JSON matching exactly:',
    `{"alternatives":["line one","line two", ...]}`,
    `- exactly ${count} entries, each a different phrasing.`,
  ].filter(Boolean).join('\n');
}

export function parseLineRewrites(raw: string): string[] {
  const data = parseJson(raw);
  if (!isRecord(data) || !Array.isArray(data.alternatives) || data.alternatives.length === 0) {
    throw new ClaudeProviderError('malformed-response', 'expected {"alternatives":[...]} with at least one entry');
  }
  const lines = data.alternatives
    .filter((l): l is string => typeof l === 'string')
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) {
    throw new ClaudeProviderError('malformed-response', 'alternatives contained no usable lines');
  }
  return lines;
}

/** Ask Claude for `count` alternate phrasings of a single lyric line, in context. */
export async function suggestLineRewrites(
  opts: ClaudeLyricsProviderOptions,
  ctx: LineRewriteContext,
  count = 3,
): Promise<string[]> {
  const text = await callClaudeMessages(opts, systemPrompt(), buildLineRewritePrompt(ctx, count), LINE_REWRITE_SCHEMA);
  return parseLineRewrites(text).slice(0, count);
}

// ---------------------------------------------------------------------------
// Connection test — the Rack's "Test key" button. A minimal, cheap round-trip
// so a visitor can confirm their own key actually works before generating a
// full song with it. Never called automatically — always an explicit tap.
// ---------------------------------------------------------------------------

const TEST_SCHEMA = {
  type: 'object',
  properties: { ok: { type: 'string' } },
  required: ['ok'],
  additionalProperties: false,
} as const;

export type ClaudeKeyTestResult = { ok: true } | { ok: false; message: string };

/** A tiny, capped-token round-trip against the real Messages API to confirm
 *  this key works. Surfaces the same typed ClaudeProviderError codes as
 *  everything else, as a plain ok/message result the UI can render directly. */
export async function testClaudeKey(opts: ClaudeLyricsProviderOptions): Promise<ClaudeKeyTestResult> {
  try {
    await callClaudeMessages(
      { ...opts, maxTokens: 16 },
      'Respond with STRICT JSON only, no commentary.',
      'Reply with {"ok":"ok"} to confirm the connection.',
      TEST_SCHEMA,
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof ClaudeProviderError ? e.message : 'connection test failed' };
  }
}
