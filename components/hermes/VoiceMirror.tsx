'use client';

import type { SongPackage } from '@/lib/hermes/types';
import type { Taste } from '@/lib/hermes/storage';
import { voiceMirror } from '@/lib/hermes/becomingYou';
import styles from './hermes.module.css';

/** "Becoming you" — how much of this song echoes the artist's learned voice. */
export default function VoiceMirror({ pkg, taste, priorSongs }: {
  pkg: SongPackage; taste: Taste | undefined; priorSongs: SongPackage[];
}) {
  const m = voiceMirror(pkg, taste, priorSongs);
  const hue = m.youPercent >= 30 ? 'var(--good)' : m.youPercent >= 12 ? 'var(--amber)' : 'var(--ink-dim)';
  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>🪞 Becoming You</div>
      <div className={styles.scoreHead}>
        <span className={styles.scoreBig} style={{ color: hue }}>{m.youPercent}%</span>
        <span className={styles.scoreOf}>you</span>
      </div>
      <div className={styles.bar}><div className={styles.barFill} style={{ width: `${m.youPercent}%` }} /></div>
      <div className={styles.hint} style={{ marginTop: 6 }}>{m.note}</div>
      <div className={styles.hint} style={{ marginTop: 2 }}>Learned from {m.learnedFrom} song{m.learnedFrom === 1 ? '' : 's'}.</div>
      {m.signature.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div className={styles.hint}>Your signature words in this one:</div>
          <div>{m.signature.map((w) => <span key={w} className={styles.chip} style={{ borderColor: 'rgba(87,217,138,0.4)', color: 'var(--good)' }}>{w}</span>)}</div>
        </div>
      )}
    </div>
  );
}
