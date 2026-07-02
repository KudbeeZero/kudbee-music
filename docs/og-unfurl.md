# HERMES Live — per-song Open Graph unfurl (Cloudflare Pages Functions)

**Status: INERT / OFF by default.** The code is merged but does nothing live until the
founder sets one environment variable. See [Activation](#activation). Merging this PR
does **not** change the site's behavior.

## What it is

When someone pastes a HERMES Live share link into Twitter / Discord / iMessage / Slack,
we want it to unfurl with the song's **brain card** — the theme/genre/mood over the
brain heat-map in the locked palette — instead of the generic site preview.

Two tiny edge routes make that happen:

| Route | File | Job |
|---|---|---|
| `GET /og?s=<token>` | `functions/og.ts` | Returns the per-song **SVG** Open Graph image (1200×630). |
| `GET /s/<token>` | `functions/s/[token].ts` | Returns a tiny **HTML shim** whose `<meta og:image>` points at `/og?s=…`, then bounces real browsers to `/hermes?s=<token>`. |

Shared, pure render helpers live in `functions/_lib/ogCard.ts` (not a route — Cloudflare
only routes modules that export an `onRequest*` handler).

Both routes decode the `?s=` token with the **same pure module the app uses**
(`lib/hermes/shareLink.ts` → `decodeShare`, which sanitizes untrusted input and never
throws), then hand-roll strings. No canvas, no fonts, no network, no secrets, fully
deterministic.

## Why Cloudflare Pages Functions

- **Matches the stack.** The site is a static Next.js export on Cloudflare Pages
  (project `wifi-dj-meme`; see `wrangler.jsonc`, `docs/deploy.md`). Pages auto-detects a
  top-level `functions/` directory and runs those files as edge routes **alongside** the
  static assets — no adapter, no SSR, no second host.
- **$0 / no new vendor.** Stays on the free tier of the host we already use. No
  third-party OG service (e.g. Cloudinary/Vercel OG-as-a-service), no new npm dependency.
- **Deterministic + safe.** Same token ⇒ byte-identical image; cached hard at the edge.

## Why not run the full pipeline at the edge?

The generation pipeline is pure JS and *could* run at the edge, but it's heavy for a
preview image and would make cold unfurls slow. We instead render a **light, decode-only
card**: title/theme + genre · mood + "a deterministic brain wrote this — open to hear it"
+ the brain heat-map (REGION dots from `lib/hermes/brainMap.ts`, lit by a tiny
deterministic hash of the seed so each song looks different). This is the recommended
middle ground — the card is honest and per-song without paying for a full generation on
every scraper hit. If we ever want the *actual* hook text on the card, `decodeShare`
already gives us `{inputs, seed}`; import and run `runPipeline` from `lib/hermes` inside
`functions/og.ts` and drop the hook string into the SVG. (Tradeoff: heavier, slower cold
unfurls. Keep the edge function light unless there's a clear reason.)

## SVG vs PNG — honest unfurl-reliability tradeoff

The `$0` default renders **SVG** (`image/svg+xml`). SVG is by far the cheapest thing to
produce at the edge (no canvas binary, no font files, no extra dependency).

**The catch:** social scrapers render SVG OG images **inconsistently**. In practice:

- **Discord, Slack, Facebook** — generally OK with SVG `og:image`.
- **Twitter/X, iMessage, LinkedIn** — often **refuse** SVG `og:image` and show nothing
  (they expect PNG/JPG). This is the well-known limitation to be aware of.

So the SVG default is great for **Discord/Slack** and as a $0 baseline, but is **not
reliable on Twitter/iMessage**. Do not assume universal coverage.

**The upgrade path (when reliability matters):** rasterize the same SVG to **PNG** at the
edge. That requires a rasterizer — either:

1. add a dependency such as `workers-og` / `@vercel/og` (Satori-based; **would add npm
   deps**, which this PR deliberately avoids), or
2. pre-render PNGs at build time for a fixed set, or
3. keep the SVG generator and add a small PNG path later.

The SVG generator in `functions/_lib/ogCard.ts` (`renderOgSvg`) is the single source of
truth for the card layout, so swapping the *response encoding* to PNG later is localized
to `functions/og.ts` — the card design does not change. We ship SVG now to stay at **$0
with zero new deps**, and document PNG as the known upgrade for full Twitter/iMessage
coverage.

## Activation

Everything below is **currently inert.** To turn it on:

1. **Set the env var (this is the master switch).**
   Cloudflare dashboard → Pages → project `wifi-dj-meme` → **Settings → Environment
   variables → Production** → add:

   ```
   OG_UNFURL = 1
   ```

   Then redeploy (Deployments → Retry deployment, or push any commit). Every route above
   checks `env.OG_UNFURL === '1'` at the top and returns **404** when it's unset — so
   until you add this variable, `/og` and `/s/*` behave exactly as they do today (there
   are no such static assets, so both 404 either way). This is the clean OFF seam.

2. **(Optional but required for auto-unfurl) Point share links at `/s/`.**
   Today `shareUrl()` in `lib/hermes/shareLink.ts` returns `${base}/hermes?s=${token}`.
   For share links to unfurl per-song, the app must hand out the shim URL instead:

   ```ts
   // lib/hermes/shareLink.ts — one-line change, made at activation time, NOT in this PR
   return `${base}/s/${token}`;
   ```

   The shim serves the per-song meta to scrapers and then redirects humans to
   `/hermes?s=${token}`, so the in-app experience is unchanged. **This PR does not touch
   `shareLink.ts`** — the coordinator/founder makes this one-line flip when activating.

   > Without step 2 you can still hit `/og?s=<token>` directly (e.g. to verify the image),
   > but pasted `/hermes?s=…` links won't unfurl per-song because `/hermes` is a static
   > page with generic `<meta>`.

3. **No `wrangler.jsonc` change is needed.** Cloudflare Pages auto-detects the
   `functions/` directory on the next deploy; there is no compatibility flag to set.

### Confirming it's inert before activation

- `OG_UNFURL` unset ⇒ `/og` and `/s/*` return 404 (verified in tests).
- `shareLink.ts` unchanged ⇒ share links still use `/hermes?s=` ⇒ identical to today.
- `functions/` is ignored by `next build` (the static export in `out/` is unaffected).

## Local test harness

Because we can't deploy in-task, `lib/hermes/__tests__/ogFunction.test.ts` exercises the
handlers' pure logic by invoking `onRequestGet({ request, env, params })` with a fake
context (the Pages Functions signature) and asserting:

- valid token → **200** SVG with the right `content-type`, non-empty body, and the
  theme/genre text present;
- **env-gate unset → 404** (inert);
- garbage token → **safe generic fallback card** (not a crash);
- HTML shim emits per-song `og:image`/`og:title` and redirects to the app;
- hostile text is XML-escaped (no injection into the SVG).

Run: `npm run test:web`.

A sample rendered card (rasterized from the SVG via headless Chromium for eyeballing)
was produced during development; the SVG itself is the shipped artifact.
