'use client';

import { useMemo, useState } from 'react';
import type { AgentOutput, AgentId, AgentStatus } from '@/lib/hermes/types';
import styles from './hermes.module.css';

// Each region is a FUNCTIONAL AREA of the brain, and each one IS a knowledge
// document on the file system (the Obsidian-style vault). When its subsystem
// fires during a run, the region lights up — like watching an fMRI scan — and
// clicking it surfaces the file behind it.
interface Region {
  id: string;
  label: string;
  doc: string;                 // the knowledge file this region is
  side: 'left' | 'right' | 'center';
  agents: AgentId[];           // lighting up when any of these fire
  x: number; y: number;        // position on the 440×300 brain
  soon?: boolean;              // not wired yet (Language & Culture)
}

const REGIONS: Region[] = [
  { id: 'intent', label: 'Intent', doc: 'the brief', side: 'center', agents: ['conductor'], x: 220, y: 58 },
  { id: 'language', label: 'Language & Culture', doc: 'lib/hermes/language.ts (coming)', side: 'left', agents: [], x: 150, y: 100, soon: true },
  { id: 'values', label: 'Values', doc: 'brain/beliefs.json', side: 'center', agents: ['conductor'], x: 250, y: 108 },
  { id: 'generative', label: 'Generative (right)', doc: 'brain/personas.json', side: 'right', agents: ['hooksmith', 'lyric-chemist', 'visual-director', 'viral-clip-scout'], x: 332, y: 150 },
  { id: 'analytical', label: 'Analytical (left)', doc: 'originality + scoring', side: 'left', agents: ['beat-oracle', 'emotion-scanner', 'originality-auditor', 'ar-judge', 'rights-release-guard'], x: 108, y: 158 },
  { id: 'decision', label: 'Decision', doc: 'the Writers-Room (process.ts)', side: 'center', agents: ['ar-judge'], x: 220, y: 160 },
  { id: 'memory', label: 'Memory', doc: 'brain/memory.json + the vault', side: 'center', agents: ['originality-auditor', 'lyric-chemist'], x: 220, y: 222 },
];

const COLOR: Record<string, string> = {
  left: 'var(--cyan)', right: 'var(--magenta)', center: 'var(--amber)',
};

function regionState(r: Region, outputs: Record<string, AgentOutput>): 'idle' | 'running' | 'done' | 'soon' {
  if (r.soon) return 'soon';
  const states = r.agents.map((a) => outputs[a]?.status).filter(Boolean) as AgentStatus[];
  if (states.some((s) => s === 'running')) return 'running';
  if (states.length && states.every((s) => s === 'done' || s === 'warning')) return 'done';
  return 'idle';
}

export default function BrainScan({ outputs, running }: { outputs: Record<string, AgentOutput>; running: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const active = useMemo(
    () => Object.fromEntries(REGIONS.map((r) => [r.id, regionState(r, outputs)])),
    [outputs],
  );
  const sel = REGIONS.find((r) => r.id === selected);
  const litCount = REGIONS.filter((r) => active[r.id] === 'done' || active[r.id] === 'running').length;

  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle} style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>🧠 Brain Scan</span>
        <span className={styles.hint}>{running ? 'scanning…' : `${litCount}/${REGIONS.length} regions`}</span>
      </div>

      <svg viewBox="0 0 440 300" className={styles.brainSvg} role="img" aria-label="Brain activity scan">
        <defs>
          <radialGradient id="bsfill" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.015)" />
          </radialGradient>
        </defs>

        {/* two hemispheres (top view) + central fissure + brain stem */}
        <g className={styles.brainBody} data-scan={running}>
          <ellipse cx="160" cy="150" rx="124" ry="128" fill="url(#bsfill)" stroke="var(--line-strong)" strokeWidth="1.5" />
          <ellipse cx="280" cy="150" rx="124" ry="128" fill="url(#bsfill)" stroke="var(--line-strong)" strokeWidth="1.5" />
          <path d="M220 28 Q210 90 222 150 Q210 210 220 272" fill="none" stroke="var(--line-strong)" strokeWidth="1.5" opacity="0.7" />
          {/* a few gyri for texture */}
          <path d="M70 120 Q120 100 150 130" fill="none" stroke="var(--line)" strokeWidth="1.4" />
          <path d="M80 180 Q130 160 165 188" fill="none" stroke="var(--line)" strokeWidth="1.4" />
          <path d="M285 130 Q320 100 370 122" fill="none" stroke="var(--line)" strokeWidth="1.4" />
          <path d="M280 188 Q320 162 365 184" fill="none" stroke="var(--line)" strokeWidth="1.4" />
          <path d="M205 250 Q220 280 235 250" fill="none" stroke="var(--line-strong)" strokeWidth="6" strokeLinecap="round" opacity="0.5" />
        </g>

        {/* region nodes */}
        {REGIONS.map((r) => {
          const state = active[r.id];
          const c = COLOR[r.side];
          const on = state === 'running' || state === 'done';
          return (
            <g key={r.id} transform={`translate(${r.x} ${r.y})`} style={{ cursor: 'pointer' }} onClick={() => setSelected(r.id)}>
              <circle
                r={selected === r.id ? 16 : 13}
                className={styles.brainNode}
                data-state={state}
                style={{ fill: r.soon ? 'var(--bg-2)' : c, ['--rc' as string]: c }}
              />
              <circle r="4" fill={on ? '#0a0a12' : 'transparent'} opacity={on ? 0.5 : 0} />
              <text y="-20" textAnchor="middle" className={styles.brainLabel} data-on={on}>{r.label}</text>
            </g>
          );
        })}
      </svg>

      <div className={styles.brainCaption}>
        {sel ? (
          <>
            <strong style={{ color: COLOR[sel.side] }}>{sel.label}</strong>
            <span className={styles.hint}> — region = <code>{sel.doc}</code>{sel.soon ? ' · not wired yet' : ''}</span>
          </>
        ) : (
          <span className={styles.hint}>Each region is a knowledge file in the brain. Tap one — or generate a song and watch it light up.</span>
        )}
      </div>
    </div>
  );
}
