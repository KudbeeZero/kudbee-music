'use client';

import { useState } from 'react';
import type { SongPackage } from '@/lib/hermes/types';
import styles from './hermes.module.css';

export default function SongPackageView({ pkg, onSaveEdit }: { pkg: SongPackage; onSaveEdit?: (newText: string) => void }) {
  const rawLyrics = pkg.sections.map((s) => `[${s.label}]\n${s.lines.join('\n')}`).join('\n\n');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(rawLyrics);
  const [learned, setLearned] = useState(false);

  function save() {
    onSaveEdit?.(draft);
    setEditing(false);
    setLearned(true);
    setTimeout(() => setLearned(false), 2600);
  }

  function exportForVideo() {
    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${pkg.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'song'}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Song Package · “{pkg.title}” · v{pkg.version}</span>
        <button className={styles.copyBtn} style={{ marginLeft: 0 }} onClick={exportForVideo} title="Download to scaffold a video project with `hermes from-song`">🎬 Export for video studio</button>
      </div>

      <Section label="Concept">
        <div className={styles.kv}>{pkg.conceptSummary}</div>
      </Section>

      <Section label="Creative brief">
        <div className={styles.kv}>{pkg.brief}</div>
      </Section>

      <Section label="Hook options">
        {pkg.hookOptions.map((h, i) => (
          <div key={i} className={styles.hookCard} data-chosen={pkg.chosenHook?.text === h.text}>
            <div className={styles.hookText}>“{h.text}”</div>
            <div className={styles.hookMeta}>{h.angle} · {h.cadence} · stickiness {h.score}{pkg.chosenHook?.text === h.text ? ' · ★ lead' : ''}</div>
          </div>
        ))}
      </Section>

      <div className={styles.pkgSection}>
        <div className={styles.pkgLabel}>
          Final lyrics
          {onSaveEdit && !editing && (
            <button className={styles.copyBtn} onClick={() => { setDraft(rawLyrics); setEditing(true); }}>edit</button>
          )}
          {learned && <span className={styles.copyBtn} style={{ color: 'var(--cyan)', borderColor: 'var(--cyan)' }}>🧠 brain learned from your edit</span>}
        </div>
        {editing ? (
          <>
            <textarea className={styles.lyricBlock} style={{ width: '100%', minHeight: 280, color: 'var(--ink)' }}
              value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Edit lyrics" />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className={styles.runBtn} style={{ width: 'auto', flex: 1, padding: 10 }} onClick={save}>Save — teach the brain</button>
              <button className={styles.ghostBtn} onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </>
        ) : (
          <div className={styles.lyricBlock}>
            {pkg.sections.map((s, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <span className={styles.sectionTag}>[{s.label}]</span>
                {'\n'}{s.lines.join('\n')}
              </div>
            ))}
          </div>
        )}
      </div>

      <Section label="Production notes">
        <div className={styles.kv}>
          <b>Tempo:</b> {pkg.production.tempoBpm} BPM &nbsp; <b>Drums:</b> {pkg.production.drums} &nbsp; <b>Bass:</b> {pkg.production.bass}<br />
          <b>Instrumentation:</b> {pkg.production.instrumentation.join(', ')}<br />
          <b>Genre blend:</b> {pkg.production.genreBlend}<br />
          <b>Mix:</b> {pkg.production.mixVibe}
        </div>
        <ul className={styles.list} style={{ marginTop: 6 }}>
          {pkg.production.arrangement.map((a, i) => <li key={i}>{a}</li>)}
        </ul>
      </Section>

      <Section label="Vocal delivery">
        <div className={styles.kv}>
          <b>Delivery:</b> {pkg.vocals.delivery}<br />
          <b>Ad-libs:</b> {pkg.vocals.adlibs.join('  ')}<br />
          <b>Stacks:</b> {pkg.vocals.doublesAndStacks}
        </div>
      </Section>

      <Section label="Album cover prompt" copy={pkg.visuals.albumCoverPrompt}>
        <div className={styles.promptBox}>{pkg.visuals.albumCoverPrompt}</div>
      </Section>

      <Section label="Music video prompt (16:9)" copy={pkg.visuals.musicVideoPrompt}>
        <div className={styles.promptBox}>{pkg.visuals.musicVideoPrompt}</div>
        <ul className={styles.list} style={{ marginTop: 8 }}>
          {pkg.visuals.sceneIdeas.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </Section>

      <Section label="Short-form clips">
        {pkg.viralClips.map((c, i) => (
          <div key={i} className={styles.hookCard}>
            <div className={styles.hookText}>{c.label} · ~{c.durationSec}s · {c.startHint}</div>
            <div className={styles.hookMeta}>Caption: {c.caption}</div>
          </div>
        ))}
      </Section>

      <Section label="Promo caption" copy={pkg.promoCaption}>
        <div className={styles.kv}>{pkg.promoCaption}</div>
      </Section>
    </div>
  );
}

function Section({ label, children, copy }: { label: string; children: React.ReactNode; copy?: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className={styles.pkgSection}>
      <div className={styles.pkgLabel}>
        {label}
        {copy && (
          <button
            className={styles.copyBtn}
            onClick={() => {
              navigator.clipboard?.writeText(copy).then(() => { setDone(true); setTimeout(() => setDone(false), 1200); }).catch(() => {});
            }}
          >
            {done ? 'copied ✓' : 'copy'}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
