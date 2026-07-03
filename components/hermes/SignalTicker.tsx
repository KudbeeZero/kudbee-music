'use client';

import type { Signal } from '@/lib/hermes/nervousSystem';
import { region } from '@/lib/hermes/brainMap';
import styles from './hermes.module.css';

/** A terminal-styled readout of the nervous system's signal bus — the same Signal
 *  objects the Brain Scan's working-memory counter already tallies, but read as a
 *  live transcript instead of just a number. Purely decorative/informational: it
 *  never feeds back into generation. */
export default function SignalTicker({ signalLog }: { signalLog: Signal[] }) {
  const lines = signalLog.slice(-8);
  return (
    <div className={styles.terminal}>
      <div className={styles.terminalBar}>
        <span className={styles.terminalDot} data-c="r" />
        <span className={styles.terminalDot} data-c="y" />
        <span className={styles.terminalDot} data-c="g" />
        <span className={styles.terminalLabel}>nervous-system.log</span>
      </div>
      <div className={styles.terminalBody}>
        {lines.length === 0 && <div className={styles.terminalLine}>&gt; awaiting signal…</div>}
        {lines.map((s) => (
          <div key={s.seq} className={styles.terminalLine}>
            <span className={styles.terminalPrompt}>&gt;</span>{' '}
            {region(s.region)?.label ?? s.region}
            {s.agentId ? ` (${s.agentId})` : ''}: {s.note}
          </div>
        ))}
        <div className={styles.terminalLine}><span className={styles.terminalCursor}>▍</span></div>
      </div>
    </div>
  );
}
