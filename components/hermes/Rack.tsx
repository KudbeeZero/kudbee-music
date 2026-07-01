'use client';

import { ENGINE_UNITS } from '@/lib/hermes/engines';
import styles from './hermes.module.css';

// The Pro Studio Rack — the lyrical engines as a DAW-style rack of modular units.
// The free Local Combinator is lit and active; Pro units are locked upgrade slots.
export default function Rack() {
  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>🎛️ Engine Rack</div>
      <div className={styles.hint}>Swappable lyrical engines. The free unit drives everything; Pro slots unlock with a key or server.</div>
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ENGINE_UNITS.map((u) => (
          <div
            key={u.id}
            className={styles.flag}
            style={{
              borderLeft: `3px solid ${u.active ? 'var(--good)' : u.locked ? 'var(--line-strong)' : 'var(--amber)'}`,
              opacity: u.locked ? 0.6 : 1,
            }}
          >
            <div className={styles.flagKind} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{u.locked ? '🔒 ' : u.active ? '🟢 ' : ''}{u.label}</span>
              <span className={styles.chip} style={{ marginLeft: 0 }}>
                {u.active ? 'active' : u.tier === 'free' ? 'free' : 'upgrade'}
              </span>
            </div>
            <div className={styles.hint} style={{ marginTop: 2 }}>{u.blurb}</div>
            {u.locked && u.unlockHint && (
              <div className={styles.hint} style={{ marginTop: 2, color: 'var(--amber)' }}>↑ {u.unlockHint}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
