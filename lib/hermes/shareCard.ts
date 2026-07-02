// Downloadable "share card" — a client-side, canvas-rendered PNG of a song's brain
// trace: a compact echo of the Brain Scan heat-map, the lead hook, the banger score,
// the A&R verdict, and the receipt "$0 · no API key · deterministic". It's the static,
// paste-anywhere companion to the deterministic share LINK (shareLink.ts): the link
// reproduces the song, the card is the screenshot you post.
//
// 100% client-side, $0, no server, no dependency. Drawing is a pure function of the
// SongPackage (via buildTrace) — no wall-clock, no RNG — so the same song yields the
// same bytes. Canvas can't easily load the app's self-hosted Space Grotesk woff2, so
// text uses a bold web-safe stack ('Space Grotesk' if the browser happens to have it,
// else system sans); layout is measured + wrapped defensively so metric differences
// never overflow. The DOM path is guarded so importing this module in Node never throws.
import type { SongPackage } from './types';
import { buildTrace, type SongTrace } from './trace';
import { regionHeat } from './traceHtml';
import { REGIONS } from './brainMap';

// ---- canvas geometry ------------------------------------------------------------
/** OG aspect (1.91:1) — the size Twitter/Discord/OG unfurl at. */
export const CARD_W = 1200;
export const CARD_H = 630;
/** The brain lives in a 440×300 coordinate space (see brainMap.ts REGIONS). */
export const BRAIN_W = 440;
export const BRAIN_H = 300;

// ---- palette (mirrors app/globals.css + traceHtml.ts) ---------------------------
/** The exact Brain-Scan hues: left = analytical (cyan), right = generative (magenta), center = core (amber). */
const HUE = { left: '#36e0d4', right: '#d24bff', center: '#ffb14e' } as const;
const BG_0 = '#07070b';
const INK = '#f3f1fb';
const INK_DIM = '#a8a6bd';
const INK_FAINT = '#6f6d86';

// Canvas can't reach the self-hosted woff2, so fall back to a bold system stack.
const DISPLAY = '"Space Grotesk", "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const BODY = 'Inter, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

// =================================================================================
// PURE helpers (no DOM) — unit-tested in __tests__/shareCard.test.ts
// =================================================================================

/** The minimal slice of CanvasRenderingContext2D the wrapper needs — lets tests pass a fake. */
export interface TextMeasurer {
  measureText(text: string): { width: number };
}

/**
 * Greedy word-wrap `text` so no line exceeds `maxWidth` (measured via the ctx-like
 * `measureText`). A single word wider than the line is kept whole on its own line
 * (better a slight overflow than an infinite loop). Always returns ≥1 line. Pure.
 */
export function wrapText(ctx: TextMeasurer, text: string, maxWidth: number): string[] {
  const words = String(text).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? `${cur} ${w}` : w;
    if (cur && ctx.measureText(trial).width > maxWidth) {
      lines.push(cur);
      cur = w;
    } else {
      cur = trial;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/**
 * Map a REGION point (in the 440×300 brain space) into a `W`×`H` target box. Returns
 * top-left-relative coordinates; the caller adds the box's on-canvas offset. Pure.
 */
export function scalePoint(x: number, y: number, W: number, H: number): { x: number; y: number } {
  return { x: (x / BRAIN_W) * W, y: (y / BRAIN_H) * H };
}

/** Truncate to at most `max` chars, adding an ellipsis if clipped. Pure. */
export function clampText(s: string, max: number): string {
  const t = String(s ?? '');
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/** The fixed receipt line — the whole point of the card. */
export const FOOTER_TAGLINE =
  'HERMES · a songwriting brain you can watch think · $0 · no API key · deterministic';

/** Compose the footer strip: the receipt tagline + the (clamped) song title. Pure. */
export function footerString(title: string): string {
  const t = clampText((title || 'Untitled').trim(), 42);
  return `${FOOTER_TAGLINE} · ${t}`;
}

/** The download filename for a package — reuses SongPackageView's slug idiom. Pure. */
export function cardFileName(pkg: Pick<SongPackage, 'title'>): string {
  const slug = (pkg.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${slug || 'song'}-hermes-card.png`;
}

// =================================================================================
// DOM path — canvas drawing (browser only)
// =================================================================================

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function radialGlow(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
}

/** Pick the largest display size whose wrapped hook fits `maxLines`, clamping the text. */
function fitHook(ctx: CanvasRenderingContext2D, hook: string, maxWidth: number, maxLines: number) {
  const quoted = `“${hook}”`;
  for (const size of [50, 44, 38, 33, 28]) {
    ctx.font = `700 ${size}px ${DISPLAY}`;
    const lines = wrapText(ctx, quoted, maxWidth);
    if (lines.length <= maxLines) return { size, lines };
  }
  // Still too long at the smallest size — clamp to maxLines and ellipsize the last.
  ctx.font = `700 28px ${DISPLAY}`;
  const lines = wrapText(ctx, quoted, maxWidth).slice(0, maxLines);
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last.replace(/\s+$/, '')}…`;
  }
  return { size: 28, lines };
}

/** Draw the brain heat-map (region dots at their Brain-Scan positions) into a box. */
function drawBrain(ctx: CanvasRenderingContext2D, t: SongTrace, box: { x: number; y: number; w: number; h: number }) {
  const heat = regionHeat(t);
  // Panel.
  roundRect(ctx, box.x, box.y, box.w, box.h, 20);
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.stroke();

  // Panel title.
  ctx.font = `600 15px ${BODY}`;
  ctx.fillStyle = INK_FAINT;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillText('B R A I N   H E A T - M A P', box.x + 24, box.y + 34);

  // Inner drawing area holding the 440×300 brain, centered under the title.
  const pad = 26;
  const innerW = box.w - pad * 2;
  const innerH = innerW * (BRAIN_H / BRAIN_W);
  const ox = box.x + pad;
  const oy = box.y + 52 + Math.max(0, (box.h - 52 - 44 - innerH) / 2);
  const sc = innerW / BRAIN_W;

  for (const r of REGIONS) {
    const temp = Math.max(0, Math.min(1, heat[r.id] ?? 0.12));
    const p = scalePoint(r.x, r.y, innerW, innerH);
    const cx = ox + p.x;
    const cy = oy + p.y;
    const hue = HUE[r.side];
    const glowR = (12 + temp * 16) * sc;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
    g.addColorStop(0, hexA(hue, 0.16 + temp * 0.5));
    g.addColorStop(1, hexA(hue, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
    ctx.fill();
    // Solid core.
    ctx.fillStyle = hue;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(2.5, 3.4 * sc), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Legend.
  const ly = box.y + box.h - 22;
  const legend: [string, string][] = [
    [HUE.right, 'generative'],
    [HUE.left, 'analytical'],
    [HUE.center, 'core'],
  ];
  ctx.font = `500 13px ${BODY}`;
  ctx.textBaseline = 'middle';
  let lx = box.x + 26;
  for (const [hue, label] of legend) {
    ctx.fillStyle = hue;
    ctx.beginPath();
    ctx.arc(lx + 5, ly, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = INK_DIM;
    ctx.fillText(label, lx + 16, ly + 1);
    lx += 20 + ctx.measureText(label).width + 22;
  }
  ctx.textBaseline = 'alphabetic';
}

/** Draw the whole card. Pure w.r.t. the trace — deterministic given the package. */
function drawCard(ctx: CanvasRenderingContext2D, t: SongTrace) {
  // Background + brand glows (echoes the landing / globals.css).
  ctx.fillStyle = BG_0;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  radialGlow(ctx, CARD_W * 0.9, -60, 560, 'rgba(139,92,255,0.22)'); // violet, top-right
  radialGlow(ctx, -80, 30, 520, 'rgba(255,138,61,0.16)'); // amber, top-left
  radialGlow(ctx, CARD_W * 0.55, CARD_H + 140, 620, 'rgba(210,75,255,0.14)'); // magenta, bottom

  // Hairline frame.
  roundRect(ctx, 12, 12, CARD_W - 24, CARD_H - 24, 22);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.stroke();

  const x0 = 60;
  const textW = 660;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Eyebrow.
  ctx.font = `600 16px ${BODY}`;
  ctx.fillStyle = INK_FAINT;
  ctx.fillText(`HERMES · BRAIN SCAN · SEED ${t.seed} · $0 LOCAL`, x0, 66);

  // Brief line (theme · mood · genre), clamped.
  const brief = clampText(
    [t.brief.theme, t.brief.mood, t.brief.genre].filter(Boolean).join('  ·  '),
    64,
  );
  ctx.font = `500 15px ${BODY}`;
  ctx.fillStyle = INK_DIM;
  ctx.fillText(brief, x0, 92);

  // Lead-hook label.
  ctx.font = `600 13px ${BODY}`;
  ctx.fillStyle = HUE.right;
  ctx.fillText('L E A D   H O O K', x0, 138);

  // The hook, big and quoted, fitted to the left column.
  const { size, lines } = fitHook(ctx, t.hook, textW, 4);
  const lh = Math.round(size * 1.16);
  let hy = 138 + size + 8;
  ctx.fillStyle = INK;
  ctx.font = `700 ${size}px ${DISPLAY}`;
  for (const line of lines) {
    ctx.fillText(line, x0, hy);
    hy += lh;
  }

  // Score block, anchored near the bottom of the text column.
  const scoreTop = 442;
  ctx.font = `600 13px ${BODY}`;
  ctx.fillStyle = INK_FAINT;
  ctx.fillText('B A N G E R   S C O R E', x0, scoreTop);

  // Big "NN" with amber glow, then "/ 100".
  ctx.save();
  ctx.shadowColor = 'rgba(255,177,78,0.55)';
  ctx.shadowBlur = 26;
  ctx.font = `700 96px ${DISPLAY}`;
  ctx.fillStyle = HUE.center;
  ctx.textBaseline = 'alphabetic';
  const nn = String(t.scoreTotal);
  ctx.fillText(nn, x0, scoreTop + 92);
  const nnW = ctx.measureText(nn).width; // measure while the 96px font is active
  ctx.restore();
  ctx.font = `600 30px ${DISPLAY}`;
  ctx.fillStyle = INK_DIM;
  ctx.fillText('/ 100', x0 + nnW + 16, scoreTop + 92);

  // Verdict.
  ctx.font = `600 20px ${BODY}`;
  ctx.fillStyle = INK;
  ctx.fillText(clampText(t.verdict, 52), x0, scoreTop + 128);

  // Brain heat-map panel on the right.
  drawBrain(ctx, t, { x: 748, y: 116, w: 392, h: 384 });

  // Footer strip.
  const fy = CARD_H - 46;
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.moveTo(40, fy - 22);
  ctx.lineTo(CARD_W - 40, fy - 22);
  ctx.stroke();
  ctx.font = `500 15px ${BODY}`;
  let footer = footerString(t.title);
  // Shrink defensively if the composed strip is wider than the card.
  const maxFooter = CARD_W - 120;
  while (footer.length > 8 && ctx.measureText(footer).width > maxFooter) {
    footer = `${footer.slice(0, -2)}…`;
  }
  ctx.fillStyle = INK_DIM;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(footer, 60, fy);
}

/** Parse "#rrggbb" → "rgba(r,g,b,a)". Defensive: falls back to white on a bad hue. */
function hexA(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return `rgba(255,255,255,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// =================================================================================
// Public API (browser)
// =================================================================================

/**
 * Render a song's share card to a PNG Blob. Browser only — throws if `document` is
 * undefined (server / test env) rather than crashing on a missing canvas. Deterministic:
 * the same package always draws the same pixels.
 */
export function renderShareCard(pkg: SongPackage): Promise<Blob> {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('renderShareCard requires a browser DOM (document is undefined).'));
  }
  const trace = buildTrace(pkg, pkg.inputs, pkg.seed ?? 0);
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('2D canvas context unavailable.'));
  drawCard(ctx, trace);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('canvas.toBlob returned null'));
    }, 'image/png');
  });
}

/**
 * Render + trigger a browser download of `<slug>-hermes-card.png`. Reuses the temp-<a>
 * blob-download idiom from SongPackageView (exportSong). Resolves once the click fires.
 */
export async function downloadShareCard(pkg: SongPackage): Promise<void> {
  const blob = await renderShareCard(pkg);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = cardFileName(pkg);
  a.click();
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
