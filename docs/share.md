# Sharing a song — the link and the card

HERMES is a static, $0, client-only brain. Two ways to share a song come out of that,
and both run entirely in the browser — no server, no API key, no wall-clock, nothing to
pay for.

## 1. The deterministic share **link** (`lib/hermes/shareLink.ts`)

Because generation is a hard determinism contract — same inputs + same seed ⇒
byte-identical song — a whole song fits in a URL:

```
/hermes?s=<base64url token of { inputs, seed }>
```

Open it and the brain re-generates the **identical** package in front of you:
"here's the song my brain wrote — click and watch it think." The token is untrusted
input, so `decodeShare` caps its length, rejects unknown versions, strips
prototype-pollution keys, and coerces every field; it can never throw. 100% static.

## 2. The downloadable share **card** (`lib/hermes/shareCard.ts`)

A client-side, `<canvas>`-rendered **PNG** (1200×630, the OG aspect) of the song's brain
trace — the screenshot you post next to the link:

- a compact echo of the **Brain Scan heat-map** (each region drawn at its Brain-Scan
  position, in the same left=cyan / right=magenta / center=amber palette);
- the **lead hook**, quoted;
- the **banger score** `NN / 100` + the A&R verdict;
- the receipt: **"$0 · no API key · deterministic"** + the song title.

Drawing is a pure function of the `SongPackage` (via `buildTrace`) — no randomness, no
clock — so the same song always produces the same card. It renders in the browser and
triggers a normal file download (`<slug>-hermes-card.png`) via a temporary `<a>`, the
same idiom as the JSON export. The `⬇ Share card` button lives next to `🔗 Share` in
`SongPackageView`.

> Font note: canvas can't easily load the app's self-hosted Space Grotesk woff2, so the
> card falls back to a bold web-safe stack (`"Space Grotesk", system sans`). Text is
> measured + wrapped defensively so metric differences never overflow the card.

## What is **not** static: auto-unfurling OG images

When you paste a link into Twitter/X, Discord, iMessage, etc., the platform fetches the
page and reads its `<meta property="og:image">` to render a preview. A **dynamic,
per-song** OG image — one that shows *this* song's hook and score in the unfurl — can't
come from a purely static export, because the crawler wants a distinct image URL per
token and won't run our client JS.

That needs a tiny **edge function** (being built separately as a Cloudflare Pages
Function) that reads the `?s=` token and returns a rendered image — a few milliseconds of
compute per request, still effectively free on the Pages free tier, but no longer *zero*
infrastructure. It's an enhancement, not a dependency.

The **client-rendered share card above is the static-friendly version**: it gives you the
same receipt image with no server at all — you just attach it to the post yourself
instead of the platform auto-generating it. Honest tradeoff: manual attach, $0 forever.
