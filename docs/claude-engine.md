# The Claude Engine — opt-in real-AI lyrics behind the same seam

**Status:** wired, locked by default. Roadmap item 5.1.

The Claude Engine is a real-AI `LyricsProvider` (`lib/hermes/providers/claudeLyricsProvider.ts`,
id `claude-lyrics`) that slots into the exact same provider seam as the free Local
Combinator (`mockLyricsProvider`). Same interface, same pipeline, zero pipeline changes —
`runPipeline(inputs, { providers })` just receives a bundle with the lyrics slot swapped.

## The $0-default guarantee

- **The mock stays the default everywhere.** Nothing in the web app (`app/`, `components/`)
  imports the Claude provider or can trigger an API call. The generation path in the UI is
  the Local Combinator, period.
- **The key only ever comes from the environment** — an explicit `{ apiKey }` option or
  `ANTHROPIC_API_KEY` (e.g. from `.env.local`, which is gitignored). No key is ever
  committed, stored, or read by client code.
- **No key → no call.** The provider checks for a key at *call* time and throws a typed
  `[claude-lyrics:missing-key]` error before any request is attempted. Creating the
  provider object is always safe.
- **No live call without BOTH env vars.** The only thing in the repo that ever invokes the
  live provider is the comparison runner, and it is double-gated: it skips (cleanly, with a
  printed note) unless `RUN_LIVE_EVAL=1` **and** `ANTHROPIC_API_KEY` are both set. CI sets
  neither, so CI can never spend money.
- All unit tests run against an injected fake `fetchImpl` with a tripwire on global fetch —
  the test suite is physically incapable of making a real network call.

## How the founder triggers the live comparison

```bash
RUN_LIVE_EVAL=1 ANTHROPIC_API_KEY=sk-ant-... npm run eval:compare
```

This runs `lib/hermes/__tests__/compare.eval.test.ts`, which:

1. loads the golden briefs (the `inputs` of every committed demo song in `examples/demos/*/song.json`),
2. runs each brief through the full pipeline twice — once with the mock bundle, once with
   the mock bundle whose lyrics slot is swapped for `createClaudeLyricsProvider()`,
3. scores every result with the local eval harness (`evaluateSong`: rhyme density, line
   diversity, thematic coherence, imagery coherence, hook strength), and
4. prints a side-by-side table (per-provider eval tables + a mean-metric summary).

Run without the env vars, `npm run eval:compare` executes only the offline orchestration
tests and skips the live block — verified in CI.

## Cost ballpark (honest version)

Cost depends on the model and token counts, so we won't invent a number. Shape of the
spend: 5 golden briefs × 2 calls each (hooks + sections) = **10 Messages API requests per
live run**, each with a prompt of roughly a page and a small JSON completion capped at
4,096 output tokens (`maxTokens` option). Default model is `claude-opus-4-8`; pass
`{ model: 'claude-haiku-4-5' }` (or another id) to trade quality for cost. Check current
per-token pricing on Anthropic's pricing page before running, and expect a single run to
be small — but not free. The mock lane remains exactly $0.

## Non-determinism caveat

The Local Combinator reproduces a draft *exactly* for a given seed. The live engine does
not and cannot promise that: LLM sampling is not seed-addressable through the API (current
Claude models accept no `temperature`/`top_p` parameters at all). We still thread `seed`
through honestly — it becomes a "take #N" hint in the prompt, so different seeds ask for
genuinely different takes — but the same seed is **not** guaranteed to return the same
lyrics twice. Treat live comparison numbers as one sample, not a fixed regression
baseline; the deterministic golden-set guard (`npm run eval`) stays on the mock.

## Implementation notes

- **API shape** (per the claude-api skill): `POST https://api.anthropic.com/v1/messages`
  with headers `x-api-key`, `anthropic-version: 2023-06-01`, `content-type:
  application/json`; body carries `model`, `max_tokens`, a `system` prompt with the repo's
  craft rules (original-only, no artist mimicry, concrete imagery, rhymed couplets, hook
  ≤ 8 words), and a single user turn with the full `SongInputs` brief + avoid-list.
- **Strict JSON** is requested twice over: structured outputs
  (`output_config.format` with a JSON schema, `additionalProperties: false`) *and*
  defensive parsing of the returned text — markdown fences stripped, shapes validated,
  with typed `ClaudeProviderError`s (`missing-key` / `http-error` / `refusal` /
  `malformed-response`) on anything that doesn't conform.
- **Rack:** the `claude-engine` unit in `lib/hermes/engines.ts` stays `locked: true`,
  `active: false`. Unlock = env key + the CLI/eval lane; the UI never flips it on.
