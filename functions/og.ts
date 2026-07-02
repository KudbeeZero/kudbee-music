// GET /og?s=<token>  →  per-song Open Graph image (SVG) for HERMES Live share links.
//
// Cloudflare Pages Function. Deterministic, no secrets, no external calls: it decodes
// the untrusted ?s= token with the same pure module the app uses (decodeShare, which
// never throws), then hand-rolls an SVG brain card. A missing/garbage token falls back
// to a generic branded card (never a 500).
//
// OFF BY DEFAULT: returns 404 unless OG_UNFURL=1 is set in the Pages project. Merging
// this file therefore cannot change live behavior — /og simply 404s (as it does today,
// there being no such static asset) until the founder flips the env var.
// See docs/og-unfurl.md.

import { decodeShare } from '../lib/hermes/shareLink';
import { renderOgSvg, unfurlEnabled, type PagesContext, type OgEnv } from './_lib/ogCard';

export const onRequestGet = (ctx: PagesContext<OgEnv>): Response => {
  if (!unfurlEnabled(ctx.env)) {
    return new Response('Not found', { status: 404 });
  }
  const url = new URL(ctx.request.url);
  const token = url.searchParams.get('s') ?? '';
  const decoded = token ? decodeShare(token) : null; // null ⇒ generic fallback card

  const svg = renderOgSvg(decoded?.inputs ?? null, decoded?.seed ?? 0);
  return new Response(svg, {
    status: 200,
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      // Deterministic output ⇒ cache hard at the edge + in social scrapers.
      'cache-control': 'public, max-age=3600, s-maxage=86400, immutable',
      'x-content-type-options': 'nosniff',
    },
  });
};
