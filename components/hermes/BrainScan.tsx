'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AgentOutput } from '@/lib/hermes/types';
import { REGIONS, PATHWAYS, region as regionById, regionState, activePathways, type RegionId } from '@/lib/hermes/brainMap';
import type { BrainHeat } from '@/lib/hermes/heat';
import styles from './hermes.module.css';

const COLOR: Record<string, string> = { left: 'var(--cyan)', right: 'var(--magenta)', center: 'var(--amber)' };
const pos = (id: RegionId) => { const r = regionById(id)!; return { x: r.x, y: r.y }; };
const RGB: Record<string, [number, number, number]> = { right: [255, 80, 200], left: [80, 220, 255], center: [255, 180, 90] };

// Each region is a functional area that IS a knowledge file (the file-system vault);
// each line is a nerve. As the agents fire, regions light up and the nerves between
// them pulse — short-term memory holds the moment, long-term keeps what mattered.
export default function BrainScan({
  outputs, running, workingMemory, heat,
}: { outputs: Record<string, AgentOutput>; running: boolean; workingMemory?: number; heat?: BrainHeat }) {
  const [selected, setSelected] = useState<RegionId | null>(null);
  const state = useMemo(() => Object.fromEntries(REGIONS.map((r) => [r.id, regionState(r, outputs)])), [outputs]);
  const activeSet = useMemo(() => new Set(activePathways(outputs).map(([a, b]) => `${a}-${b}`)), [outputs]);
  const sel = REGIONS.find((r) => r.id === selected);
  const lit = REGIONS.filter((r) => state[r.id] === 'done' || state[r.id] === 'running').length;

  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle} style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>🧠 Brain Scan</span>
        <span className={styles.hint}>{running ? 'scanning…' : `${lit}/${REGIONS.length} regions`}</span>
      </div>
      {heat && (
        <div className={styles.hint} style={{ marginTop: 2 }}>
          🔥 {heat.label} · brain temp {Math.round(heat.overall * 100)}°
        </div>
      )}

      <div style={{ position: 'relative' }}>
      <div className={styles.scanline} data-run={running} aria-hidden="true" />
      <HeatField heat={heat} running={running} />
      <svg viewBox="0 0 440 300" className={styles.brainSvg} role="img" aria-label="Brain activity scan" style={{ position: 'relative', zIndex: 1, display: 'block' }}>
        <defs>
          <radialGradient id="bsfill" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.015)" />
          </radialGradient>
        </defs>

        {/* hemispheres + fissure + gyri + stem */}
        <g className={styles.brainBody} data-scan={running}>
          <ellipse cx="160" cy="150" rx="124" ry="128" fill="url(#bsfill)" stroke="var(--line-strong)" strokeWidth="1.5" />
          <ellipse cx="280" cy="150" rx="124" ry="128" fill="url(#bsfill)" stroke="var(--line-strong)" strokeWidth="1.5" />
          <path d="M220 28 Q210 90 222 150 Q210 210 220 272" fill="none" stroke="var(--line-strong)" strokeWidth="1.5" opacity="0.7" />
          <path d="M70 120 Q120 100 150 130" fill="none" stroke="var(--line)" strokeWidth="1.4" />
          <path d="M80 180 Q130 160 165 188" fill="none" stroke="var(--line)" strokeWidth="1.4" />
          <path d="M285 130 Q320 100 370 122" fill="none" stroke="var(--line)" strokeWidth="1.4" />
          <path d="M280 188 Q320 162 365 184" fill="none" stroke="var(--line)" strokeWidth="1.4" />
          <path d="M205 252 Q220 282 235 252" fill="none" stroke="var(--line-strong)" strokeWidth="6" strokeLinecap="round" opacity="0.5" />
        </g>

        {/* the nerves (nervous-system pathways) */}
        <g>
          {PATHWAYS.map(([a, b]) => {
            const pa = pos(a); const pb = pos(b);
            const on = activeSet.has(`${a}-${b}`);
            return (
              <line
                key={`${a}-${b}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
                className={styles.brainNerve} data-on={on}
              />
            );
          })}
        </g>

        {/* region nodes */}
        {REGIONS.map((r) => {
          const st = state[r.id];
          const c = COLOR[r.side];
          const on = st === 'running' || st === 'done';
          return (
            <g key={r.id} transform={`translate(${r.x} ${r.y})`} style={{ cursor: 'pointer' }} onClick={() => setSelected(r.id)}>
              <circle r={selected === r.id ? 15 : 12} className={styles.brainNode} data-state={st}
                style={{ fill: r.soon ? 'var(--bg-2)' : c, ['--rc' as string]: c }} />
              <circle r="3.5" fill={on ? '#0a0a12' : 'transparent'} opacity={on ? 0.5 : 0} />
              <text y="-18" textAnchor="middle" className={styles.brainLabel} data-on={on}>{r.label}</text>
            </g>
          );
        })}
      </svg>
      </div>

      <div className={styles.brainCaption}>
        {sel ? (
          <><strong style={{ color: COLOR[sel.side] }}>{sel.label}</strong>
            <span className={styles.hint}> — region = <code>{sel.doc}</code>{sel.soon ? ' · not wired yet' : ''}</span></>
        ) : (
          <span className={styles.hint}>Each region is a knowledge file; each line is a nerve. Generate a song and watch the signal travel.</span>
        )}
      </div>
      {typeof workingMemory === 'number' && workingMemory > 0 && (
        <div className={styles.hint} style={{ marginTop: 2 }}>⚡ short-term memory: {workingMemory} recent signal{workingMemory === 1 ? '' : 's'} this session</div>
      )}
      <div className={styles.hint} style={{ marginTop: 6, opacity: 0.7, fontSize: '0.7rem' }}>
        The anatomy is an inspired workflow model, not a biological brain — each region is real code in <code>lib/hermes/</code>.
      </div>
    </div>
  );
}

/**
 * The living heat-map: a canvas overlaid on the brain that (1) glows each region by its
 * temperature and (2) drifts particles along the nerves, colored by hemisphere. The
 * brain literally runs hot where the artist is. Reduced-motion → a single static frame.
 */
function HeatField({ heat, running }: { heat?: BrainHeat; running: boolean }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
    const VW = 440, VH = 300;
    let W = 0, H = 0, raf = 0;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      W = r.width || 1; H = r.height || 1;
      canvas.width = Math.max(1, Math.floor(W * dpr));
      canvas.height = Math.max(1, Math.floor(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const sx = (x: number) => (x / VW) * W;
    const sy = (y: number) => (y / VH) * H;
    const tempOf = (id: RegionId) => heat?.regions[id] ?? 0.12;

    const N = reduce ? 0 : 150;
    const parts = Array.from({ length: N }, (_, i) => ({ pth: PATHWAYS[i % PATHWAYS.length], t: (i * 0.137) % 1, spd: 0.0022 + (i % 7) * 0.0006 }));

    const drawGlow = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (const r of REGIONS) {
        const t = tempOf(r.id);
        if (t <= 0.02) continue;
        const [cr, cg, cb] = RGB[r.side];
        const p = pos(r.id);
        const rad = 10 + t * 46;
        const g = ctx.createRadialGradient(sx(p.x), sy(p.y), 0, sx(p.x), sy(p.y), rad);
        g.addColorStop(0, `rgba(${cr},${cg},${cb},${0.05 + t * 0.33})`);
        g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(sx(p.x), sy(p.y), rad, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    const drawParticles = () => {
      ctx.globalCompositeOperation = 'lighter';
      for (const q of parts) {
        const [a, b] = q.pth;
        const pa = pos(a), pb = pos(b);
        const ta = tempOf(a), tb = tempOf(b);
        const x = pa.x + (pb.x - pa.x) * q.t;
        const y = pa.y + (pb.y - pa.y) * q.t;
        const temp = ta + (tb - ta) * q.t;
        const [cr, cg, cb] = RGB[regionById(a)!.side];
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.12 + temp * 0.5})`;
        ctx.beginPath();
        ctx.arc(sx(x), sy(y), 0.6 + temp * 1.8, 0, Math.PI * 2);
        ctx.fill();
        q.t += q.spd * (0.4 + temp * 1.4) * (running ? 1.7 : 1);
        if (q.t > 1) { q.t = 0; q.pth = PATHWAYS[(Math.floor(q.t * 1000) + parts.indexOf(q)) % PATHWAYS.length]; }
      }
    };
    const frame = () => { drawGlow(); drawParticles(); raf = requestAnimationFrame(frame); };
    if (reduce || N === 0) drawGlow(); else frame();
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [heat, running]);
  return <canvas ref={ref} aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />;
}
