# Lightning AI rollout plan

**What this is / who reads it:** the plan for HERMES's opt-in "unlock your own agent
on dedicated compute" tier (the founder's `/goal`, 2026-07-03). Read it before wiring
or spending on Lightning. The adapter half (`studio/lightning.mjs`, `hermes lightning`)
is **built and unit-tested**, and as of 2026-07-04 it's **live-tested end-to-end**
against the founder's own Lightning Studio — see "Live-test results" below. The one
thing still open is the visitor-facing BYOK slot (see "The two-tier key model").
Mirrors [`runway-plan.md`](runway-plan.md) — a paid provider kept out of the free `$0`
core, driven from the CLI, key in gitignored `.env.local`.

## Live-test results (2026-07-04)

The founder stood up one Lightning Studio (an NVIDIA RTX PRO 6000 Blackwell GPU running
Qwen2.5-14B-Instruct behind a LitServe HTTPS endpoint), put the URL + token in their
gitignored `.env.local`, and ran the adapter for real: `node studio/lightning.mjs --ping`
succeeded, and a real `--prompt` call round-tripped and returned actual generated lyrics.
The adapter contract (`buildRequest` / `extractText` / `generate`) is now proven live, not
just against a mocked `fetch`.

The same session surfaced a real limitation: prompting an LLM to hold a rhyme scheme
(AABB) isn't reliable. A first, generic prompt produced a couplet that didn't rhyme at
all; a second, explicit prompt (demanding AABB, bracketed section tags, and a banned-
cliche-word list) fixed the first couplet but the second still broke. This is the exact
gap HERMES's own local engine avoids by guaranteeing rhyme by construction
(`lib/hermes/rhyme.ts`'s rhyme-family lookups) instead of asking an LLM nicely — it's why
Lightning stays an opt-in provider behind the existing seam rather than a rhyme-scheme
authority. (It also motivated a LoRA fine-tuning smoke test on the founder's own,
separate Lightning-Studio project — not part of this repo, and not referenced further
here beyond this note.)

The real remaining step is unchanged from before: the visitor-facing BYOK Lightning slot
in the Engine Rack (see "The two-tier key model" below) — nothing user-facing ships until
that's built.

## What's built (and tested) now

- `studio/lightning.mjs` — a key-gated CLI adapter:
  - `hermes lightning --prompt "..."` POSTs the prompt to your Lightning endpoint and
    prints the generated lyrics.
  - `hermes lightning --ping` sends a tiny prompt and reports whether the endpoint is
    reachable (a free-ish health check).
  - `--field <name>` overrides the request body field (default `prompt`) so it fits
    whatever your LitServe `decode_request` reads; `--out <path>` writes to a file.
- Pure request/response helpers (`buildRequest`, `extractText`, `generate`) are unit-
  tested with an injected `fetch` (`test/lightning.test.mjs`) — the request shape and
  the response extraction are proven **without a live key**, the same discipline
  `lib/hermes/cloudSync.ts` uses. `extractText` probes the common LitServe / OpenAI-
  compatible response shapes (`output`, `text`, `generated_text`, `lyrics`,
  `choices[].text`, `choices[].message.content`, nested `{output:{text}}`).

## What the founder must provide to go live

1. **Stand up ONE Lightning Studio** running a single HERMES lyric model behind an
   HTTPS endpoint (LitServe or a Lightning Studios deployment). Keep it one agent —
   this is a spike, not the backbone.
2. **Put two values in `.env.local`** (gitignored — never a tracked file, a commit, or
   a `NEXT_PUBLIC_` var):
   ```
   LIGHTNING_ENDPOINT=https://<your-deployment>/predict
   LIGHTNING_API_KEY=<the bearer token it expects>
   ```
3. **Live-test:** `node studio/lightning.mjs --ping`, then a real
   `hermes lightning --prompt "a defiant chicago anthem, 2 verses + a hook"`. If the
   response field name differs from the defaults, pass `--field <name>` (and tell me,
   so I can pin the default). Compare quality/latency/cost against the Anthropic direct
   path (`ANTHROPIC_API_KEY`) and Modal/Replicate before committing to Lightning as a
   provider.

## The two-tier key model (why the key goes where it goes)

- **Now / founder testing:** `LIGHTNING_API_KEY` in `.env.local`, read only by this
  CLI script (server/CLI-side). The free static client never reads it, so it can't leak
  into a browser bundle — exactly the `RUNWAY_API_KEY` boundary.
- **Shipped product ("if somebody unlocks their own agent"):** a *visitor's own*
  Lightning endpoint + key, pasted client-side and stored only in their `localStorage`,
  their browser calling their endpoint directly — the same bring-your-own-key boundary
  `lib/hermes/claudeKey.ts` already holds. A founder key must **never** route through
  our infra to serve all users (it would spend the founder's money on strangers). That
  client BYO-slot is the next step, once the CLI path proves the contract.

## Training-data prep (before spending GPU credits)

The founder's own note above ("It also motivated a LoRA fine-tuning smoke test on the
founder's own, separate Lightning-Studio project") is the real next step once the CLI
adapter and the visitor BYOK slot are both proven out — and GPU time on a Studio costs
real money per hour, so the founder's ask was explicit: **do the data prep for $0,
locally, before the paid GPU session ever starts.**

`npm run prepare-training-data` (the always-on unit tests) and
`GEN_TRAINING_DATA=1 npx vitest run trainingData` (the actual generator, same env-gate
convention as `GEN_DEMOS=1 npx vitest run trace`) mint a ready-to-upload fine-tuning
dataset under `out/training-data/` — entirely local, deterministic, no API key, no GPU:

- **Pure extraction core**: `lib/hermes/trainingData.ts` turns any `SongPackage` into up
  to 4 task-specific training examples — **lyrics** (brief → finalLyrics, the task the
  founder's own LoRA smoke test already targeted), **production** (brief+lyrics →
  tempo/drums/bass/arrangement/mix), **album-cover-prompt**, and **video-treatment**
  (brief+concept → cinematic scene direction) — the same four surfaces the "Lightning
  expansion" roadmap in `TODO.md` targets for providers.
- **Format**: Alpaca-style `{instruction, input, output}` JSONL — the default format
  **LitGPT** (Lightning AI's own fine-tuning toolkit) and most LoRA/Axolotl recipes read
  out of the box — plus a `{messages:[system,user,assistant]}` chat variant for
  frameworks that expect a conversation instead.
- **Sources, combined and deduped**: the committed golden set (`examples/demos/` +
  `examples/cold-hard-gold/` — real, human-reviewed songs), a $0 synthetic matrix (10
  original themes × 5 rhyme schemes × 2 seeds = up to 100 fresh songs, all generated by
  the real deterministic pipeline), and an optional founder drop folder
  (`training-data-input/*.json` — a vault/brain export or loose `song.json`, validated
  through the same `sanitizeSong()` boundary `storage.ts`'s own import uses).
- **`out/training-data/REPORT.md`**: task coverage, row counts, average length, and an
  explicit "grow the set for $0 first" note — a LoRA style-adaptation run typically wants
  low hundreds to low thousands of rows per task, and every additional row here is free
  (add themes/seeds, or export more real songs from the live app) versus paying for
  GPU idle time while the dataset is still thin.

Everything under `out/training-data/` and `training-data-input/*.json` is gitignored —
regenerate, never commit (same reasoning as `out/` for rendered video).

## Guardrails carried forward

- `LIGHTNING_ENDPOINT` / `LIGHTNING_API_KEY` live only in `.env.local` (gitignored);
  nothing in `components/`/`app/` reads them, so they cannot reach the client bundle.
- `buildRequest` throws without an endpoint — the adapter never silently posts nowhere.
- Original-only still applies: the CLI's default prompt says "no living-artist mimicry";
  a Lightning-hosted model is subject to the same safety screen as any other provider.
