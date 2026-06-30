'use client';

import type { AgentOutput, AgentStatus } from '@/lib/hermes/types';
import { AGENT_DEFINITIONS } from '@/lib/hermes/agents';
import styles from './hermes.module.css';

export default function AgentBoard({ outputs }: { outputs: Record<string, AgentOutput> }) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>HERMES Agent Board · {AGENT_DEFINITIONS.length} agents cross-checking</div>
      <div className={styles.agentGrid}>
        {AGENT_DEFINITIONS.map((def) => {
          const out = outputs[def.id];
          const status: AgentStatus = out?.status ?? 'idle';
          return (
            <div key={def.id} className={styles.agentCard} data-status={status}>
              <div className={styles.agentTop}>
                <div>
                  <div className={styles.agentName}>{def.name}</div>
                  <div className={styles.agentRole}>{def.role}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className={`${styles.hemi} ${def.hemisphere === 'right' ? styles.hemiRight : styles.hemiLeft}`}>
                    {def.hemisphere === 'right' ? 'R' : 'L'}
                  </span>
                  <span className={styles.statusPip} data-status={status} />
                </div>
              </div>

              <div className={styles.agentFinding}>
                {out?.finding ?? <span style={{ color: 'var(--ink-faint)' }}>{def.mission}</span>}
              </div>

              {out && (
                <>
                  <div className={styles.agentMeta}>
                    <span className={styles.conf}>conf</span>
                    <span className={styles.confBar}>
                      <span className={styles.confFill} style={{ width: `${out.confidence}%` }} />
                    </span>
                    <span className={styles.conf}>{out.confidence}%</span>
                  </div>
                  {out.warnings.length > 0 && (
                    <div className={styles.agentWarn}>⚠ {out.warnings[0]}</div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
