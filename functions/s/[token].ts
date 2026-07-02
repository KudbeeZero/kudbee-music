// GET /s/<token>  →  the unfurl shim for a HERMES Live share link.
//
// Why this exists: /hermes?s=<token> is a STATIC page, so its <meta og:image> can't be
// per-song. This edge route serves a tiny HTML document whose OG/Twitter meta point at
// the per-song /og image, then bounces real browsers to /hermes?s=<token> so the
// visitor lands in the live app and watches the brain think. Crawlers just read the
// meta and render the rich card.
//
// To actually route share links here, shareUrl() in lib/hermes/shareLink.ts would emit
// `${base}/s/${token}` instead of `${base}/hermes?s=${token}` — a one-line change made
// at activation time, NOT in this PR. See docs/og-unfurl.md.
//
// OFF BY DEFAULT: returns 404 unless OG_UNFURL=1 is set in the Pages project.

import { decodeShare } from '../../lib/hermes/shareLink';
import { cardData, renderShimHtmlFor, unfurlEnabled, type PagesContext, type OgEnv } from '../_lib/ogCard';

export const onRequestGet = (ctx: PagesContext<OgEnv>): Response => {
  if (!unfurlEnabled(ctx.env)) {
    return new Response('Not found', { status: 404 });
  }
  const raw = ctx.params.token;
  const token = Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '');
  const origin = new URL(ctx.request.url).origin;
  const decoded = token ? decodeShare(token) : null;
  const d = cardData(decoded?.inputs ?? null, decoded?.seed ?? 0);

  const html = renderShimHtmlFor(d, token, origin);
  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=86400',
    },
  });
};
