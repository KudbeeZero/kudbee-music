'use client';

import { useState } from 'react';
import type { AgentOutput, SongPackage } from '@/lib/hermes/types';
import { REGIONS, regionState, type RegionState } from '@/lib/hermes/brainMap';
import styles from './hermes.module.css';

// A small, deterministic clip-color rotation — same idea as a DAW coloring tracks,
// just keyed off the section label so the same song always paints the same way.
const CLIP_COLORS = ['var(--amber)', 'var(--violet)', 'var(--magenta)', 'var(--cyan)', 'var(--good)', 'var(--warn)'];
function clipColor(label: string) {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
  return CLIP_COLORS[h % CLIP_COLORS.length];
}

const REGION_DOT: Record<RegionState, string> = {
  running: 'var(--amber)',
  done: 'var(--good)',
  idle: 'var(--line-strong)',
  soon: 'var(--line-strong)',
};

/**
 * HERMES Studio — roadmap 3.4, "Suno-Studio-style pro workspace." $0/read-only v1:
 * an arrangement timeline (the song's real sections as clips, sized off the same
 * rough runtime estimate SongPackageView already shows) plus a compact "meter
 * bridge" reading the real brain-region state. Deliberately does NOT re-embed the
 * full Rack/BrainScan components here (that would double-mount BrainScan's live
 * particle canvas everywhere this panel is rendered) — this panel is the new
 * timeline; the Studio Flow rail's "studio" tab highlights it alongside the real
 * Rack + Brain Scan panels already elsewhere in the deck.
 */
export default function Studio({ pkg, outputs, id, active }: {
  pkg: SongPackage | null;
  outputs: Record<string, AgentOutput>;
  id?: string;
  active?: boolean;
}) {
  const [selected, setSelected] = useState(0);

  return (
    <div id={id} className={`${styles.panel} ${styles.flowFocus}`} data-active={active}>
      <div className={styles.panelTitle}>🎚️ HERMES Studio — Arrangement Timeline</div>
      {!pkg ? (
        <div className={styles.emptyState}>The timeline fills in once a song exists — each section becomes a clip.</div>
      ) : (
        <>
          <p className={styles.hint}>
            Read-only v1: your song&rsquo;s real sections as a clip timeline, clip width a rough
            length estimate (2 bars/line at the production tempo — the same rule of thumb the
            lyrics view uses), not a measurement. Clip editing is a later step.
          </p>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '10px 2px', marginTop: 4 }} role="tablist" aria-label="Song sections">
            {pkg.sections.map((s, i) => {
              const estSeconds = Math.round(s.lines.length * 2 * (240 / pkg.production.tempoBpm));
              const width = Math.max(64, Math.min(220, estSeconds * 5));
              const color = clipColor(s.label);
              return (
                <button
                  key={`${s.label}-${i}`}
                  role="tab"
                  aria-selected={selected === i}
                  onClick={() => setSelected(i)}
                  style={{
                    flex: `0 0 ${width}px`, textAlign: 'left', cursor: 'pointer',
                    borderRadius: 8, border: `1px solid ${color}`,
                    background: selected === i ? color : 'var(--bg-1)',
                    color: selected === i ? 'var(--bg-0)' : 'var(--ink)',
                    padding: '8px 10px', fontSize: 11.5,
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{s.label}</div>
                  <div style={{ opacity: 0.8, marginTop: 2 }}>{s.lines.length} ln · ~{estSeconds}s</div>
                </button>
              );
            })}
          </div>

          {pkg.sections[selected] && (
            <div className={styles.flag} style={{ marginTop: 8 }}>
              <div className={styles.flagKind}>[{pkg.sections[selected].label}]</div>
              {pkg.sections[selected].lines.map((l, i) => (
                <div key={i} style={{ fontSize: 13, lineHeight: 1.55 }}>{l}</div>
              ))}
            </div>
          )}

          <div className={styles.panelTitle} style={{ marginTop: 16 }}>🎚️ Meter bridge</div>
          <p className={styles.hint}>The same 11-region brain state that drives the full Brain Scan, read as a mixing-desk meter row.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {REGIONS.map((r) => {
              const state = regionState(r, outputs);
              return (
                <span key={r.id} className={styles.chip} style={{ color: 'var(--ink-dim)', borderColor: 'var(--line-strong)' }}>
                  <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: REGION_DOT[state], marginRight: 5 }} />
                  {r.label}
                </span>
              );
            })}
          </div>
          <p className={styles.hint} style={{ marginTop: 10 }}>
            The full 🎛️ Engine Rack and the animated Brain Scan are part of this same workspace —
            they ring-highlight alongside this panel while the Studio tab is active.
          </p>
        </>
      )}
    </div>
  );
}
