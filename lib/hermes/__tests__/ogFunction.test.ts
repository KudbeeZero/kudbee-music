// Local test harness for the HERMES Live OG-unfurl Pages Functions. We can't deploy
// in this task, so we exercise the handlers' PURE logic: invoke onRequestGet with a
// fake { request, env, params } context (the Pages Functions signature) and assert on
// the Response. Node 18+ provides global Request/Response/URL, so no Workers shim is
// needed here.
import { describe, it, expect } from 'vitest';
import { encodeShare } from '../shareLink';
import type { SongInputs } from '../types';
import { onRequestGet as ogHandler } from '../../../functions/og';
import { onRequestGet as shimHandler } from '../../../functions/s/[token]';
import { renderOgSvg, cardTitle, cardData } from '../../../functions/_lib/ogCard';

const inputs: SongInputs = {
  title: 'Neon Gospel',
  theme: 'finding faith in a broken city',
  mood: 'defiant, luminous',
  genre: 'synthwave gospel',
  tempoMin: 120,
  tempoMax: 138,
  voice: 'a preacher on the last train',
  audience: 'the sleepless',
  doNotUse: [],
  references: '',
  structure: 'full-song',
};
const TOKEN = encodeShare(inputs, 4242);

const ON = { OG_UNFURL: '1' };

function ogCtx(token: string | null, env: Record<string, string> = ON) {
  const q = token === null ? '' : `?s=${encodeURIComponent(token)}`;
  return {
    request: new Request(`https://wifi-dj-meme.pages.dev/og${q}`),
    env,
    params: {},
  };
}
function shimCtx(token: string, env: Record<string, string> = ON) {
  return {
    request: new Request(`https://wifi-dj-meme.pages.dev/s/${encodeURIComponent(token)}`),
    env,
    params: { token },
  };
}

describe('OG /og image function', () => {
  it('valid token → 200 SVG image with the song text present', async () => {
    const res = await ogHandler(ogCtx(TOKEN));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/svg+xml; charset=utf-8');
    const body = await res.text();
    expect(body.length).toBeGreaterThan(500);
    expect(body).toContain('<svg');
    expect(body).toContain('Neon Gospel'); // title rendered
    expect(body).toContain('synthwave gospel'); // genre rendered
    expect(body).toContain('$0 · no API key · deterministic');
  });

  it('is deterministic (same token → byte-identical body)', async () => {
    const a = await (await ogHandler(ogCtx(TOKEN))).text();
    const b = await (await ogHandler(ogCtx(TOKEN))).text();
    expect(a).toBe(b);
  });

  it('env-gate unset → 404 inert (merging cannot change live behavior)', async () => {
    const res = await ogHandler(ogCtx(TOKEN, {}));
    expect(res.status).toBe(404);
  });

  it('garbage token → safe generic fallback card, not a crash', async () => {
    const res = await ogHandler(ogCtx('%%%not-a-real-token%%%'));
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('<svg');
    expect(body).toContain('HERMES LIVE'); // still a branded card
    expect(body).toContain('brain-song'); // fallback title (wrapped across tspans)
  });

  it('missing token → still 200 (branded generic card)', async () => {
    const res = await ogHandler(ogCtx(null));
    expect(res.status).toBe(200);
    expect((await res.text())).toContain('HERMES LIVE');
  });
});

describe('OG /s/<token> unfurl shim', () => {
  it('valid token → 200 HTML with og:image pointing at /og and a redirect to the app', async () => {
    const res = await shimHandler(shimCtx(TOKEN));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8');
    const html = await res.text();
    expect(html).toContain('property="og:image"');
    expect(html).toContain('/og?s=');
    expect(html).toContain('/hermes?s='); // bounces real browsers to the live app
    expect(html).toContain('Neon Gospel'); // per-song og:title
    expect(html).toContain('twitter:card');
  });

  it('env-gate unset → 404 inert', async () => {
    const res = await shimHandler(shimCtx(TOKEN, {}));
    expect(res.status).toBe(404);
  });

  it('garbage token → 200 generic shim, not a crash', async () => {
    const res = await shimHandler(shimCtx('@@@garbage@@@'));
    expect(res.status).toBe(200);
    expect((await res.text())).toContain('og:image');
  });
});

describe('renderOgSvg is well-formed + safe', () => {
  it('escapes hostile text (no raw injection into the SVG)', () => {
    const evil = { ...inputs, title: '<script>alert(1)</script>', genre: 'a & b "c"' };
    const svg = renderOgSvg(evil, 1);
    expect(svg).not.toContain('<script>alert(1)</script>');
    expect(svg).toContain('&lt;script&gt;');
    expect(svg).toContain('&amp;');
  });

  it('cardTitle/cardData derive a human title from inputs', () => {
    const d = cardData(inputs, 4242);
    expect(cardTitle(d)).toContain('Neon Gospel');
    expect(d.genre).toBe('synthwave gospel');
  });
});
