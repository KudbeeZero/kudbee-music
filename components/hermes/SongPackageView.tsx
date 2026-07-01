'use client';

import { useState } from 'react';
import type { HookOption, SongPackage } from '@/lib/hermes/types';
import styles from './hermes.module.css';

export default function SongPackageView({ pkg, onSaveEdit, onChooseHook }: {
  pkg: SongPackage; onSaveEdit?: (newText: string) => void; onChooseHook?: (h: HookOption) => void;
}) {
  const rawLyrics = pkg.sections.map((s) => `[${s.label}]\n${s.lines.join('\n')}`).join('\n\n');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(rawLyrics);
  const [learned, setLearned] = useState(false);
  const [copiedClip, setCopiedClip] = useState(-1);

  function save() {
    onSaveEdit?.(draft);
    setEditing(false);
    setLearned(true);
    setTimeout(() => setLearned(false), 2600);
  }

  function exportSong() {
    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${pkg.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'song'}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  function copyClip(text: string, i: number) {
    navigator.clipboard?.writeText(text).then(() => { setCopiedClip(i); setTimeout(() => setCopiedClip(-1), 1200); }).catch(() => {});
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Song Package · “{pkg.title}” · v{pkg.version}</span>
        <button className={styles.copyBtn} style={{ marginLeft: 0 }} onClick={exportSong} title="Download this song package as JSON (backup / re-import into your vault)">⬇ Export JSON</button>
      </div>

      <Section label="Concept">
        <div className={styles.kv}>{pkg.conceptSummary}</div>
      </Section>

      <Section label="Creative brief">
        <div className={styles.kv}>{pkg.brief}</div>
      </Section>

      <Section label={onChooseHook ? 'Hook options — tap one to make it the lead' : 'Hook options'}>
        {pkg.hookOptions.map((h, i) => {
          const chosen = pkg.chosenHook?.text === h.text;
          const pick = onChooseHook && !chosen ? () => onChooseHook(h) : undefined;
          return (
            <div
              key={i}
              className={styles.hookCard}
              data-chosen={chosen}
              onClick={pick}
              role={pick ? 'button' : undefined}
              tabIndex={pick ? 0 : undefined}
              onKeyDown={pick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } } : undefined}
              style={pick ? { cursor: 'pointer' } : undefined}
              aria-pressed={onChooseHook ? chosen : undefined}
              title={onChooseHook ? (chosen ? 'Current lead hook' : 'Set as the lead hook — the brain learns your pick and re-scores') : undefined}
            >
              <div className={styles.hookText}>“{h.text}”</div>
              <div className={styles.hookMeta}>{h.angle} · {h.cadence} · stickiness {h.score}{chosen ? ' · ★ lead' : onChooseHook ? ' · tap to lead' : ''}</div>
            </div>
          );
        })}
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

      <Section label="Short-form clips — tap to copy the caption">
        {pkg.viralClips.map((c, i) => (
          <div
            key={i}
            className={styles.hookCard}
            onClick={() => copyClip(c.caption, i)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copyClip(c.caption, i); } }}
            style={{ cursor: 'pointer' }}
            title="Copy this clip's caption"
          >
            <div className={styles.hookText}>{c.label} · ~{c.durationSec}s · {c.startHint}</div>
            <div className={styles.hookMeta}>{copiedClip === i ? 'copied ✓' : `Caption: ${c.caption}`}</div>
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
