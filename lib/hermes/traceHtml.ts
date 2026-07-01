// Interactive trace explorer — the shareable, single-file version of the generation
// trace. Given a finished SongTrace (from trace.ts), renders a SELF-CONTAINED HTML
// page: a brain heat-map drawn in the same palette as the Brain Scan (left = cyan,
// right = magenta, center = amber), collapsible per-region cards showing what each
// region contributed, and a one-click copy-to-clipboard Suno prompt. No build step,
// no server, no JS framework — one string you can open, commit, or paste anywhere.
// Deterministic + $0, same as everything else in the brain.
import type { SongTrace, RegionTrace } from './trace';
import { REGIONS, region as regionById } from './brainMap';

/** The exact Brain-Scan hues (mirrors app/globals.css + BrainScan.tsx). */
const HUE = { left: '#36e0d4', right: '#d24bff', center: '#ffb14e' } as const;
const BG_0 = '#07070b', BG_1 = '#0d0d14', INK = '#f3f1fb', INK_DIM = '#a8a6bd', INK_FAINT = '#6f6d86';

/** Minimal, correct HTML-escape for text nodes + attribute values. */
export function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * A per-region "temperature" 0..1 for the heat-map glow. Deterministic, derived only
 * from the trace: the overall banger score sets the baseline warmth, and the regions
 * that did the load-bearing creative work (generative, decision, reward, limbic) run
 * hotter. Pure — no wall-clock, no RNG — so the SVG is byte-stable for a given trace.
 */
export function regionHeat(t: SongTrace): Record<string, number> {
  const base = 0.28 + 0.5 * (Math.max(0, Math.min(100, t.scoreTotal)) / 100);
  const boost: Record<string, number> = {
    generative: 0.22, decision: 0.18, reward: 0.16, limbic: 0.14, analytical: 0.12,
  };
  const out: Record<string, number> = {};
  for (const r of REGIONS) out[r.id] = Math.max(0, Math.min(1, base + (boost[r.id] ?? 0)));
  return out;
}

/** The brain heat-map SVG — region nodes at their Brain-Scan positions, glowing by side. */
function heatMapSvg(t: SongTrace): string {
  const heat = regionHeat(t);
  const contributed = new Set(t.regions.map((r) => r.region));
  const nodes = REGIONS.map((r) => {
    const hue = HUE[r.side];
    const temp = contributed.has(r.id) ? heat[r.id] : 0.12;
    const glow = (0.16 + temp * 0.6).toFixed(3);
    const rad = (7 + temp * 7).toFixed(1);
    return `
      <g class="node" data-region="${esc(r.id)}" tabindex="0" role="button" aria-label="${esc(r.label)}">
        <circle cx="${r.x}" cy="${r.y}" r="${rad}" fill="${hue}" opacity="${glow}"/>
        <circle cx="${r.x}" cy="${r.y}" r="3.2" fill="${hue}" opacity="0.95"/>
        <text x="${r.x}" y="${r.y + 18}" text-anchor="middle" class="node-label">${esc(r.label)}</text>
      </g>`;
  }).join('');
  return `<svg viewBox="0 0 440 300" class="brain" role="img" aria-label="Brain region heat-map">${nodes}</svg>`;
}

/** One collapsible <details> card per region — click/keyboard to expand its contribution. */
function regionCard(r: RegionTrace): string {
  const meta = regionById(r.region);
  const hue = meta ? HUE[meta.side] : HUE.center;
  const sideLabel = meta?.side === 'left' ? 'analytical' : meta?.side === 'right' ? 'generative' : 'core';
  return `
    <details class="card" data-region="${esc(r.region)}" style="--hue:${hue}">
      <summary>
        <span class="dot"></span>
        <span class="card-title">${esc(r.label)}</span>
        <span class="card-side">${esc(sideLabel)}</span>
      </summary>
      <p>${esc(r.contribution)}</p>
    </details>`;
}

export interface TraceHtmlOptions {
  sunoStyle?: string;   // the "Style of Music" string (from suno.ts sunoStyle)
  sunoLyrics?: string;  // the tagged lyric block (from suno.ts sunoLyrics)
  standalone?: boolean; // full <!doctype html> document (default true)
}

/** Render a SongTrace as a self-contained interactive HTML string. Pure + deterministic. */
export function renderTraceHtml(t: SongTrace, opts: TraceHtmlOptions = {}): string {
  const { sunoStyle, sunoLyrics, standalone = true } = opts;
  const chips = [
    ['theme', t.brief.theme], ['mood', t.brief.mood], ['genre', t.brief.genre],
    ['structure', t.brief.structure], ...(t.brief.culture ? [['culture', t.brief.culture]] : []),
  ].map(([k, v]) => `<span class="chip"><b>${esc(k)}</b> ${esc(v)}</span>`).join('');

  const cards = t.regions.map(regionCard).join('');

  const sunoBlock = (sunoStyle || sunoLyrics)
    ? `<div class="suno">
        <div class="suno-head">
          <h2>🎧 Suno prompt</h2>
          <button id="copySuno" type="button">Copy to clipboard</button>
        </div>
        <pre id="sunoText">${esc([
          sunoStyle ? `Style of Music:\n${sunoStyle}` : '',
          sunoLyrics ? `\nLyrics:\n${sunoLyrics}` : '',
        ].join('\n').trim())}</pre>
      </div>`
    : '';

  const metrics = [
    ['Banger score', `${t.scoreTotal}/100`, t.verdict],
    ['Lead hook', `“${t.hook}”`, `chosen from ${t.hookOptions}`],
    ['Rhyme', t.rhymeScheme, `${t.rhymeDensity}% density`],
    ['Crave-ability', `${t.crave}/100`, ''],
    ['Originality', `${t.uniqueness}/100`, ''],
  ].map(([k, v, sub]) => `<div class="metric"><span class="m-k">${esc(k)}</span><span class="m-v">${esc(v)}</span>${sub ? `<span class="m-s">${esc(sub)}</span>` : ''}</div>`).join('');

  const body = `
  <main class="wrap">
    <header>
      <div class="eyebrow">HERMES · generation trace · deterministic (seed ${t.seed}) · $0 local</div>
      <h1>${esc(t.title)}</h1>
      <div class="chips">${chips}</div>
    </header>

    <section class="scan">
      ${heatMapSvg(t)}
      <div class="legend">
        <span><i style="background:${HUE.right}"></i> generative (right)</span>
        <span><i style="background:${HUE.left}"></i> analytical (left)</span>
        <span><i style="background:${HUE.center}"></i> core (center)</span>
      </div>
    </section>

    <section class="metrics">${metrics}</section>

    <section class="regions">
      <h2>🧠 What each region contributed <small>(click to expand)</small></h2>
      ${cards}
    </section>

    ${sunoBlock}

    <footer>The brain metaphor is an inspired workflow model, not biological — but every line above is the output of real code in <code>lib/hermes/</code>. Load the full deck at <code>/hermes</code>.</footer>
  </main>`;

  const script = `
  (function(){
    var b=document.getElementById('copySuno');
    if(b){b.addEventListener('click',function(){
      var t=document.getElementById('sunoText').innerText;
      var done=function(){b.textContent='Copied ✓';setTimeout(function(){b.textContent='Copy to clipboard';},1600);};
      if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(done,done);}
      else{try{var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);done();}catch(e){}}
    });}
    // clicking a brain node opens+scrolls to its region card
    document.querySelectorAll('.node').forEach(function(n){
      var open=function(){
        var id=n.getAttribute('data-region');
        var c=document.querySelector('.card[data-region="'+id+'"]');
        if(c){c.open=true;c.scrollIntoView({behavior:'smooth',block:'center'});c.classList.add('flash');setTimeout(function(){c.classList.remove('flash');},900);}
      };
      n.addEventListener('click',open);
      n.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
    });
  })();`;

  if (!standalone) return body + `<script>${script}</script>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>HERMES trace — ${esc(t.title)}</title>
<style>
  :root{--bg0:${BG_0};--bg1:${BG_1};--ink:${INK};--dim:${INK_DIM};--faint:${INK_FAINT}}
  *{box-sizing:border-box}
  body{margin:0;background:radial-gradient(1200px 600px at 50% -10%, ${BG_1}, ${BG_0}) fixed;color:var(--ink);
    font:15px/1.55 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}
  .wrap{max-width:860px;margin:0 auto;padding:34px 20px 60px}
  .eyebrow{color:var(--faint);font-size:12px;letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px}
  h1{margin:0 0 14px;font-size:32px;letter-spacing:-.01em}
  h2{font-size:16px;margin:0 0 12px}
  h2 small{color:var(--faint);font-weight:400}
  .chips{display:flex;flex-wrap:wrap;gap:8px}
  .chip{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:999px;padding:4px 11px;font-size:12.5px;color:var(--dim)}
  .chip b{color:var(--ink);font-weight:600;text-transform:uppercase;font-size:10.5px;letter-spacing:.04em;margin-right:4px}
  section{margin-top:30px}
  .scan{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:14px}
  .brain{width:100%;height:auto;display:block}
  .brain .node{cursor:pointer}
  .brain .node:focus{outline:none}
  .brain .node:focus circle:first-child,.brain .node:hover circle:first-child{opacity:.55}
  .node-label{fill:var(--dim);font-size:8.5px;font-family:inherit}
  .legend{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-top:6px;color:var(--dim);font-size:12px}
  .legend i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px;vertical-align:-1px}
  .metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px}
  .metric{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:2px}
  .m-k{color:var(--faint);font-size:11px;text-transform:uppercase;letter-spacing:.05em}
  .m-v{font-size:18px;font-weight:600}
  .m-s{color:var(--dim);font-size:12px}
  .card{border:1px solid rgba(255,255,255,.08);border-left:3px solid var(--hue);border-radius:10px;margin:8px 0;background:rgba(255,255,255,.02);transition:background .3s}
  .card.flash{background:rgba(255,255,255,.08)}
  .card summary{cursor:pointer;list-style:none;padding:11px 14px;display:flex;align-items:center;gap:10px}
  .card summary::-webkit-details-marker{display:none}
  .card .dot{width:9px;height:9px;border-radius:50%;background:var(--hue);flex:0 0 auto;box-shadow:0 0 10px var(--hue)}
  .card-title{font-weight:600}
  .card-side{margin-left:auto;color:var(--faint);font-size:11px;text-transform:uppercase;letter-spacing:.05em}
  .card p{margin:0;padding:0 14px 14px 33px;color:var(--dim)}
  .suno-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
  .suno pre{white-space:pre-wrap;word-break:break-word;background:${BG_0};border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:14px;color:var(--dim);font:12.5px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;margin:10px 0 0}
  #copySuno{background:${HUE.right};color:#12001a;border:0;border-radius:8px;padding:8px 14px;font-weight:600;cursor:pointer;font-size:13px}
  #copySuno:hover{filter:brightness(1.1)}
  footer{margin-top:36px;color:var(--faint);font-size:12.5px;line-height:1.6}
  footer code{color:var(--dim)}
  @media (prefers-reduced-motion: reduce){*{scroll-behavior:auto!important;transition:none!important}}
</style>
</head>
<body>
${body}
<script>${script}</script>
</body>
</html>
`;
}
