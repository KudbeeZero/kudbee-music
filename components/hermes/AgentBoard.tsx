'use client';

import { useEffect, useRef, useState } from 'react';
import type { AgentId, AgentOutput, AgentStatus } from '@/lib/hermes/types';
import { AGENT_DEFINITIONS } from '@/lib/hermes/agents';
import { agentRegion } from '@/lib/hermes/brainMap';
import { outgoingPathways, type Signal } from '@/lib/hermes/nervousSystem';
import SignalTicker from './SignalTicker';
import styles from './hermes.module.css';

/** Do two agents' regions share a wired pathway (either direction)? Used to decide
 *  whether the two most-recently-fired agents earn a connector line — a real edge
 *  from brainMap.ts's PATHWAYS, not an invented one. */
function regionsWired(a: AgentId, b: AgentId): boolean {
  const ra = agentRegion(a)?.id;
  const rb = agentRegion(b)?.id;
  if (!ra || !rb || ra === rb) return false;
  return outgoingPathways(ra).some(([, y]) => y === rb) || outgoingPathways(rb).some(([, y]) => y === ra);
}

interface LinePos { x1: number; y1: number; x2: number; y2: number }

export default function AgentBoard({ outputs, signalLog = [] }: { outputs: Record<string, AgentOutput>; signalLog?: Signal[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Partial<Record<AgentId, HTMLDivElement>>>({});
  const [linePos, setLinePos] = useState<LinePos | null>(null);

  // The two most-recently-fired agents, if their regions share a real pathway —
  // a short-lived "a thought just moved from here to here" highlight.
  const lastTwo = signalLog.slice(-2);
  const edge: [AgentId, AgentId] | null =
    lastTwo.length === 2 && lastTwo[0].agentId && lastTwo[1].agentId && lastTwo[0].agentId !== lastTwo[1].agentId
      && regionsWired(lastTwo[0].agentId, lastTwo[1].agentId)
      ? [lastTwo[0].agentId, lastTwo[1].agentId]
      : null;

  useEffect(() => {
    if (!edge || !wrapRef.current) { setLinePos(null); return; }
    const wrap = wrapRef.current;
    const a = cardRefs.current[edge[0]];
    const b = cardRefs.current[edge[1]];
    if (!a || !b) { setLinePos(null); return; }
    const wrapBox = wrap.getBoundingClientRect();
    const aBox = a.getBoundingClientRect();
    const bBox = b.getBoundingClientRect();
    setLinePos({
      x1: aBox.left + aBox.width / 2 - wrapBox.left,
      y1: aBox.top + aBox.height / 2 - wrapBox.top,
      x2: bBox.left + bBox.width / 2 - wrapBox.left,
      y2: bBox.top + bBox.height / 2 - wrapBox.top,
    });
    const timer = setTimeout(() => setLinePos(null), 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edge?.[0], edge?.[1], signalLog.length]);

  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>HERMES Agent Board · {AGENT_DEFINITIONS.length} agents cross-checking</div>
      <div className={styles.agentGridWrap} ref={wrapRef}>
        {linePos && (
          <svg className={styles.agentConnSvg} aria-hidden="true">
            <line x1={linePos.x1} y1={linePos.y1} x2={linePos.x2} y2={linePos.y2} className={styles.agentConnLine} />
          </svg>
        )}
        <div className={styles.agentGrid}>
          {AGENT_DEFINITIONS.map((def) => {
            const out = outputs[def.id];
            const status: AgentStatus = out?.status ?? 'idle';
            const wired = edge?.includes(def.id);
            return (
              <div
                key={def.id}
                ref={(el) => { cardRefs.current[def.id] = el ?? undefined; }}
                className={styles.agentCard}
                data-status={status}
                data-wired={wired || undefined}
              >
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
      <SignalTicker signalLog={signalLog} />
    </div>
  );
}
