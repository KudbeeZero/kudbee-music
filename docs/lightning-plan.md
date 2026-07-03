# Lightning AI rollout plan

**What this is / who reads it:** the plan for HERMES's opt-in "unlock your own agent
on dedicated compute" tier (the founder's `/goal`, 2026-07-03). Read it before wiring
or spending on Lightning. The adapter half (`studio/lightning.mjs`, `hermes lightning`)
is **built and unit-tested**; the live end-to-end run is blocked only on the founder
standing up an endpoint. Mirrors [`runway-plan.md`](runway-plan.md) — a paid provider
kept out of the free `$0` core, driven from the CLI, key in gitignored `.env.local`.

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

## Guardrails carried forward

- `LIGHTNING_ENDPOINT` / `LIGHTNING_API_KEY` live only in `.env.local` (gitignored);
  nothing in `components/`/`app/` reads them, so they cannot reach the client bundle.
- `buildRequest` throws without an endpoint — the adapter never silently posts nowhere.
- Original-only still applies: the CLI's default prompt says "no living-artist mimicry";
  a Lightning-hosted model is subject to the same safety screen as any other provider.
