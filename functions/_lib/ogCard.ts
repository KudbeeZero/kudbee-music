// Shared render helpers for the HERMES Live OG-unfurl Pages Functions.
//
// This file lives under functions/ but is NOT a route: Cloudflare Pages only turns a
// module into an edge route when it exports an `onRequest*` handler. This module
// exports only pure helpers, so it is bundled into the routes that import it and
// never responds on its own. (The leading-underscore folder is the conventional
// "not a route" marker used across Pages projects.)
//
// Everything here is pure, deterministic, dependency-free string building — safe to
// run at the edge (no canvas, no fonts, no network) and trivially unit-testable in
// Node. The card is hand-rolled SVG in the locked brand palette; see docs/og-unfurl.md
// for the SVG-vs-PNG unfurl-reliability tradeoff.

import type { SongInputs } from '../../lib/hermes/types';
import { REGIONS, PATHWAYS, region } from '../../lib/hermes/brainMap';

// ---- environment gate -----------------------------------------------------------
// The whole feature is OFF until the founder sets OG_UNFURL=1 in the Cloudflare Pages
// project. Until then every route below returns 404, so merging the PR cannot change
// live behavior. See docs/og-unfurl.md → "Activation".
export interface OgEnv {
  OG_UNFURL?: string;
}
export function unfurlEnabled(env: OgEnv | undefined): boolean {
  return !!env && env.OG_UNFURL === '1';
}

// Minimal Pages Functions context typing — kept local so we need no
// @cloudflare/workers-types dependency (repo rule: no new npm deps).
export interface PagesContext<E = OgEnv> {
  request: Request;
  env: E;
  params: Record<string, string | string[]>;
}
export type PagesHandler<E = OgEnv> = (ctx: PagesContext<E>) => Response | Promise<Response>;

// ---- brand palette (locked; mirrors app/globals.css) ----------------------------
const BG_0 = '#07070b';
const BG_1 = '#0d0d14';
const INK = '#f3f1fb';
const INK_DIM = '#a8a6bd';
const INK_FAINT = '#6f6d86';
const AMBER = '#ffb14e';
const MAGENTA = '#d24bff';
const CYAN = '#36e0d4';

// ---- text safety ----------------------------------------------------------------
/** Escape a string for inclusion in SVG/HTML text or attribute values. */
export function xmlEscape(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Collapse whitespace + hard-cap length so hostile inputs can't blow up the card. */
function clean(s: string, cap: number): string {
  return s.replace(/\s+/g, ' ').trim().slice(0, cap);
}

/** Greedy word-wrap into at most `maxLines` lines of ~`perLine` chars, ellipsised. */
function wrap(text: string, perLine: number, maxLines: number): string[] {
  const words = text.split(' ').filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > perLine && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines) break;
    } else {
      cur = next;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length > maxLines) lines.length = maxLines;
  // ellipsise if we ran out of room
  if (words.join(' ').length > lines.join(' ').length && lines.length) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] = last.length > perLine - 1 ? `${last.slice(0, perLine - 1)}…` : `${last}…`;
  }
  return lines.length ? lines : ['an untitled brain-song'];
}

// ---- deterministic per-song heat -------------------------------------------------
// A tiny deterministic hash so each song lights the brain map differently WITHOUT
// running the full pipeline at the edge (see docs → "Why not run the pipeline").
function hash32(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Data derived from decoded inputs+seed, drives both the SVG and the shim <meta>. */
export interface CardData {
  title: string;
  genre: string;
  mood: string;
  theme: string;
  seed: number;
}

export function cardData(inputs: Partial<SongInputs> | null, seed: number): CardData {
  const i = inputs ?? {};
  return {
    title: clean(i.title || i.theme || '', 80),
    genre: clean(i.genre || '', 40),
    mood: clean(i.mood || '', 40),
    theme: clean(i.theme || '', 80),
    seed: (Number.isFinite(seed) ? seed : 0) >>> 0,
  };
}

/** Short human description used for og:title / og:description. */
export function cardTitle(d: CardData): string {
  return d.title ? `“${d.title}” — a HERMES Live song` : 'A HERMES Live song';
}
export function cardDescription(d: CardData): string {
  const bits = [d.genre, d.mood].filter(Boolean).join(' · ');
  const lead = bits ? `${bits}. ` : '';
  return `${lead}A deterministic brain wrote this — open to watch it think. $0, no API key.`;
}

// ---- the SVG card ----------------------------------------------------------------
const W = 1200;
const H = 630;

/** Render the 1200×630 Open Graph card as an SVG string. Pure + deterministic. */
export function renderOgSvg(inputs: Partial<SongInputs> | null, seed: number): string {
  const d = cardData(inputs, seed);
  const titleLines = wrap(d.title || 'an untitled brain-song', 20, 3);
  const subBits = [d.genre, d.mood].filter(Boolean).map((s) => xmlEscape(s));
  const sub = subBits.length ? subBits.join('  ·  ') : 'deterministic songwriting';

  // Brain heat-map: place REGION dots into a 480×360 box on the right. The brain
  // coordinate space is 440×300 (see brainMap.ts).
  const boxX = 690;
  const boxY = 150;
  const boxW = 460;
  const boxH = 314;
  const sx = boxW / 440;
  const sy = boxH / 300;
  const px = (x: number) => boxX + x * sx;
  const py = (y: number) => boxY + y * sy;
  const sideColor = (side: string) => (side === 'left' ? CYAN : side === 'right' ? MAGENTA : AMBER);

  const pathwaysSvg = PATHWAYS.map(([a, b]) => {
    const ra = region(a);
    const rb = region(b);
    if (!ra || !rb) return '';
    return `<line x1="${px(ra.x).toFixed(1)}" y1="${py(ra.y).toFixed(1)}" x2="${px(rb.x).toFixed(1)}" y2="${py(rb.y).toFixed(1)}" stroke="#ffffff" stroke-opacity="0.07" stroke-width="1.5"/>`;
  }).join('');

  const h = hash32(`${d.seed}|${d.theme}|${d.genre}`);
  const dotsSvg = REGIONS.map((r, idx) => {
    const c = sideColor(r.side);
    const hot = ((h >> (idx % 32)) & 1) === 1 || r.id === 'intent';
    const cx = px(r.x).toFixed(1);
    const cy = py(r.y).toFixed(1);
    const glow = hot ? 16 : 9;
    const core = hot ? 6.5 : 4;
    const glowOp = hot ? 0.4 : 0.16;
    return (
      `<circle cx="${cx}" cy="${cy}" r="${glow}" fill="${c}" fill-opacity="${glowOp}"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${core}" fill="${c}" fill-opacity="${hot ? 0.95 : 0.5}"/>`
    );
  }).join('');

  const titleTspans = titleLines
    .map((ln, idx) => `<tspan x="80" dy="${idx === 0 ? 0 : 66}">${xmlEscape(ln)}</tspan>`)
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="HERMES Live song card">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BG_1}"/>
      <stop offset="1" stop-color="${BG_0}"/>
    </linearGradient>
    <radialGradient id="amberGlow" cx="0.2" cy="0.15" r="0.8">
      <stop offset="0" stop-color="${AMBER}" stop-opacity="0.16"/>
      <stop offset="1" stop-color="${AMBER}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#amberGlow)"/>
  <rect x="0" y="0" width="8" height="${H}" fill="${AMBER}"/>

  <g font-family="'Space Grotesk', ui-sans-serif, system-ui, sans-serif">
    <text x="80" y="96" font-size="24" letter-spacing="6" fill="${AMBER}" font-weight="700">HERMES LIVE</text>
    <text x="80" y="230" font-size="58" font-weight="700" fill="${INK}">${titleTspans}</text>
    <text x="80" y="${230 + (titleLines.length - 1) * 66 + 70}" font-size="27" fill="${INK_DIM}" font-family="ui-sans-serif, system-ui, sans-serif">${sub}</text>
    <text x="80" y="${230 + (titleLines.length - 1) * 66 + 118}" font-size="21" fill="${INK_FAINT}" font-family="ui-sans-serif, system-ui, sans-serif">a deterministic brain wrote this — open to hear it</text>
  </g>

  <g>${pathwaysSvg}${dotsSvg}</g>
  <text x="928" y="502" text-anchor="middle" font-size="17" letter-spacing="2" fill="${INK_FAINT}" font-family="ui-sans-serif, system-ui, sans-serif">THE BRAIN, THINKING</text>

  <g font-family="ui-sans-serif, system-ui, monospace">
    <rect x="80" y="540" width="360" height="44" rx="22" fill="none" stroke="#ffffff" stroke-opacity="0.16"/>
    <text x="104" y="568" font-size="19" fill="${INK_DIM}">$0 · no API key · deterministic</text>
  </g>
</svg>`;
}

/**
 * Render the tiny HTML shim served at /s/<token>. Crawlers (Twitter/Discord/Slack/
 * iMessage) read the OG/Twitter meta; real browsers are bounced to the live app at
 * /hermes?s=<token> so the visitor immediately watches the brain think. Pure string.
 */
export function renderShimHtmlFor(d: CardData, token: string, origin: string): string {
  const safeToken = xmlEscape(encodeURIComponent(token));
  const ogImage = `${origin}/og?s=${safeToken}`;
  const appUrl = `${origin}/hermes?s=${safeToken}`;
  const title = xmlEscape(cardTitle(d));
  const desc = xmlEscape(cardDescription(d));
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title>
<meta name="description" content="${desc}"/>
<meta property="og:type" content="website"/>
<meta property="og:title" content="${title}"/>
<meta property="og:description" content="${desc}"/>
<meta property="og:image" content="${ogImage}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:url" content="${xmlEscape(appUrl)}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${title}"/>
<meta name="twitter:description" content="${desc}"/>
<meta name="twitter:image" content="${ogImage}"/>
<meta http-equiv="refresh" content="0; url=${xmlEscape(appUrl)}"/>
<link rel="canonical" href="${xmlEscape(appUrl)}"/>
</head>
<body style="background:${BG_0};color:${INK};font-family:ui-sans-serif,system-ui,sans-serif">
<p style="padding:24px">Opening HERMES Live… <a style="color:${AMBER}" href="${xmlEscape(appUrl)}">continue</a></p>
<script>location.replace(${JSON.stringify(appUrl)});</script>
</body>
</html>`;
}
