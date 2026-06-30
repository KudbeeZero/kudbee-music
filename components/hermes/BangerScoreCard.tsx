'use client';

import type { BangerScore } from '@/lib/hermes/types';
import styles from './hermes.module.css';

const CATS: { key: keyof BangerScore; label: string; max: number }[] = [
  { key: 'hookStrength', label: 'Hook strength', max: 20 },
  { key: 'emotionalClarity', label: 'Emotional clarity', max: 20 },
  { key: 'originality', label: 'Originality', max: 20 },
  { key: 'replayValue', label: 'Replay value', max: 15 },
  { key: 'visualIdentity', label: 'Visual identity', max: 10 },
  { key: 'shortFormPotential', label: 'Short-form potential', max: 10 },
  { key: 'releaseReadiness', label: 'Release readiness', max: 5 },
];

export default function BangerScoreCard({ score }: { score: BangerScore }) {
  const hue = score.total >= 85 ? 'var(--good)' : score.total >= 60 ? 'var(--amber)' : 'var(--warn)';
  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>Banger Score</div>
      <div className={styles.scoreHead}>
        <span className={styles.scoreBig} style={{ color: hue }}>{score.total}</span>
        <span className={styles.scoreOf}>/ 100</span>
      </div>
      <div className={styles.verdict}>{score.verdict}</div>
      <div className={styles.cat}>
        {CATS.map((c) => {
          const val = score[c.key] as number;
          return (
            <div key={c.key} style={{ marginBottom: 9 }}>
              <div className={styles.catRow}>
                <span>{c.label}</span>
                <span>{val}/{c.max}</span>
              </div>
              <div className={styles.bar}>
                <div className={styles.barFill} style={{ width: `${(val / c.max) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
