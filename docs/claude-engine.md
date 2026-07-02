# The Claude Engine — opt-in real-AI lyrics behind the same seam

**Status:** wired, opt-in via three separate lanes. Roadmap items 5.1 (CLI/eval), 5.4 (rack BYOK),
5.5 (Scribe line editor + key test).

The Claude Engine is a real-AI `LyricsProvider` (`lib/hermes/providers/claudeLyricsProvider.ts`,
id `claude-lyrics`) that slots into the exact same provider seam as the free Local
Combinator (`mockLyricsProvider`). Same interface, same pipeline, zero pipeline changes —
`runPipeline(inputs, { providers })` just receives a bundle with the lyrics slot swapped.

There are now three distinct, non-overlapping places a key can come from — each documented
in its own section below:

1. **Local `.env.local`** — the founder's own laptop key, for the CLI eval lane.
2. **GitHub Actions repository secret** — the same eval lane, triggerable from a phone.
3. **The visitor's own key, pasted into the Engine Rack** — bring-your-own-key, browser-only,
   live in the deployed app (this is new — see "Run it from the panel" below).

## The $0-default guarantee

- **The mock stays the default everywhere.** Nothing in the web app calls the Claude
  provider unless a visitor has explicitly pasted their own key into the Engine Rack and
  flipped it on (`lib/hermes/claudeKey.ts`, localStorage-only). Every other path — landing
  page, share links, reproduced songs — always uses the Local Combinator.
- **No founder-controlled key is ever in the client bundle.** The env-var key
  (`ANTHROPIC_API_KEY`, `.env.local` / Actions secret) is read only by Node — the eval lane
  and CI. The browser bundle never references `process.env.ANTHROPIC_API_KEY`.
- **No key → no call.** The provider checks for a key at *call* time and throws a typed
  `[claude-lyrics:missing-key]` error before any request is attempted. Creating the
  provider object is always safe.
- **No live call without BOTH env vars (CLI/eval lane).** The comparison runner is
  double-gated: it skips (cleanly, with a printed note) unless `RUN_LIVE_EVAL=1` **and**
  `ANTHROPIC_API_KEY` are both set. CI sets neither, so CI can never spend money.
- All unit tests run against an injected fake `fetchImpl` with a tripwire on global fetch —
  the test suite is physically incapable of making a real network call.

## Run it from the panel — bring your own key (BYOK)

The Engine Rack (`components/hermes/Rack.tsx`) has a **Claude Engine** slot. Click "Enter
your Anthropic key," paste a key from console.anthropic.com, and it unlocks:

- The key is written to **this browser's `localStorage` only**
  (`hermes.claudeKey.v1` / `hermes.claudeEngineActive.v1`) — never sent to any server we
  control, because we don't have one. It never leaves the browser except in requests you
  make yourself, straight to `api.anthropic.com`.
- Once unlocked, the "Turn on" toggle makes the Claude Engine the active lyrics provider
  for *your* generations. Calls go directly from your browser to Anthropic's Messages API,
  billed to your own key. "Forget key" wipes it from this browser.
- The browser call carries the `anthropic-dangerous-direct-browser-access: true` header —
  Anthropic's own sanctioned opt-in for client-only, bring-your-own-key apps (the "dangerous"
  naming is a deliberate friction/warning, not a prohibition); without it the browser's CORS
  preflight to `api.anthropic.com` is rejected.
- **Reproduced/shared songs never use your key.** A permalink must render byte-identically
  for every viewer, so `runPipeline` always uses the Local Combinator when reproducing a
  seed — regardless of whether the viewer has Claude Engine turned on.
- If a call fails for any reason (bad key, rate limit, refusal, network), the app catches it,
  falls back to the free Local Combinator for that take, and shows an honest banner
  explaining the fallback — generation never gets stuck.

This design is why it satisfies SECURITY.md's "no hosted deployment may proxy to a paid API
without a server-side proxy + rate limiting + a spend cap" rule *without* needing any of
that infrastructure: there is no proxy, because there is no server in the request path at
all — the visitor's own browser talks straight to Anthropic with the visitor's own key and
the visitor's own money.

## "Is my key actually working?" — the Test key button

Once unlocked, the Rack shows a **🔌 Test key** button next to "Turn on/off." It's an
explicit, opt-in action — never automatic — that makes one small, real request straight to
`api.anthropic.com` (`testClaudeKey()`, capped at 16 output tokens, so it's cheap) and reports
`✓ Claude API is working — connection confirmed.` or the exact typed error (`missing-key` /
`http-error` incl. status code / `refusal` / `malformed-response`) if it doesn't. This is the
honest way to answer "is Claude actually working" without needing a founder-side dashboard or
log — the visitor gets a direct, real answer from their own browser.

## Scribe — edit lyrics line by line, with AI rewrites

The "Final lyrics" edit mode (`components/hermes/ScribeEditor.tsx`) is a per-line editor
instead of one big text block — inspired by dedicated lyric-writing tools like Scribe:

- Every line is its own field. Edit it directly, **+** adds a new line below it, **×** deletes it.
- **✨** asks the Claude Engine for 3 alternate phrasings of *that one line* — same meaning,
  syllable count, and rhyme role, with the line before/after as context so the rewrite fits
  the surrounding lines (`suggestLineRewrites()`, `lib/hermes/providers/claudeLyricsProvider.ts`).
  Click a suggestion to drop it into the line. Requires the Claude Engine unlocked + active
  (BYOK, above); if it isn't, the button still works but shows an honest unlock hint instead
  of quietly doing nothing.
- **"edit as raw text"** switches to the original single-textarea editor for power users who
  want to paste in a whole rewritten song at once — no regression, both save through the same
  `renderSections()` → learn-from-edits path (`lib/hermes/edits.ts`), so taste-learning and
  auto-exclusion behave identically no matter which editor was used.

## How the founder triggers the live comparison

```bash
RUN_LIVE_EVAL=1 ANTHROPIC_API_KEY=sk-ant-... npm run eval:compare
```

Optionally pick the model (cost/quality dial) with `CLAUDE_MODEL=claude-haiku-4-5-20251001`.

## Run it from GitHub Actions (no laptop needed)

The same lane is exposed as a **manual workflow** — `.github/workflows/claude-compare.yml` —
so it can be triggered from the GitHub app/website on a phone:

1. **Add the key once** (founder-only, never in the repo or chat): repo **Settings →
   Secrets and variables → Actions → New repository secret**, name `ANTHROPIC_API_KEY`,
   value = your key from console.anthropic.com. Actions secrets are encrypted, masked in
   logs, and **never available to fork PRs**.
2. **Trigger**: Actions tab → *claude-compare* → **Run workflow** → pick a model
   (Opus 4.8 default; Haiku 4.5 is the cheap lane) → Run.
3. **Read the result** on the run's Summary page (the side-by-side eval table renders
   there) — also saved as a 30-day artifact.

Safety properties: the workflow runs **only** on the manual button (never push/PR, so CI can
never spend money), holds `contents: read` and nothing else, and without the secret it skips
cleanly via the same double-gate as the CLI. The one honest caveat of Actions secrets: anyone
with **write access** to the repo could author a workflow that reads them — keep collaborators
tight and secret-scanning/push-protection on.

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
- **Rack:** the `claude-engine` unit in `lib/hermes/engines.ts` still defaults to
  `locked: true`, `active: false` — that's the static base data. `Rack.tsx` overrides both
  fields live from `lib/hermes/claudeKey.ts` (does this browser have a key? is it toggled on?),
  so the UI reflects the *visitor's* unlock state, not a global one.
