'use client';

import type { UniquenessReport } from '@/lib/hermes/types';
import { SAFETY_DISCLAIMER } from '@/lib/hermes/safety';
import styles from './hermes.module.css';

export default function UniquenessReportView({ report }: { report: UniquenessReport }) {
  const hue = report.score >= 80 ? 'var(--good)' : report.score >= 60 ? 'var(--amber)' : 'var(--bad)';
  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>Uniqueness Report</div>
      <div className={styles.uniqHead}>
        <span className={styles.uniqScore} style={{ color: hue }}>{report.score}</span>
        <span className={styles.scoreOf}>/ 100 original</span>
      </div>
      <div className={styles.hint} style={{ marginTop: 4 }}>
        Local check — vs your vault + cliché/avoid lists, not the whole internet. A uniqueness guard for your own catalog.
      </div>

      {report.bannedWordsHit.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div className={styles.hint}>Avoid-words present (warning only):</div>
          <div>{report.bannedWordsHit.map((w) => <span key={w} className={styles.chip}>{w}</span>)}</div>
        </div>
      )}

      {report.flags.length === 0 ? (
        <div className={styles.clean} style={{ marginTop: 12 }}>✓ Clean — no repeats, clichés, or similarity matches.</div>
      ) : (
        <div style={{ marginTop: 10 }}>
          {report.flags.slice(0, 8).map((f, i) => (
            <div key={i} className={styles.flag}>
              <div className={styles.flagKind}>{f.kind.replace('-', ' ')}</div>
              <div>{f.detail}</div>
              {f.line && <div className={styles.flagLine}>“{f.line}”</div>}
              {f.suggestion && <div className={styles.hint}>→ {f.suggestion}</div>}
            </div>
          ))}
        </div>
      )}

      {report.rewriteSuggestions.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className={styles.hint}>Suggested rewrites:</div>
          <ul className={styles.list}>
            {report.rewriteSuggestions.slice(0, 4).map((r, i) => <li key={i}>{r.suggestion}</li>)}
          </ul>
        </div>
      )}

      <div className={styles.hint} style={{ marginTop: 12, opacity: 0.7, fontSize: '0.7rem', borderTop: '1px solid var(--line)', paddingTop: 8 }}>
        {SAFETY_DISCLAIMER}
      </div>
    </div>
  );
}
