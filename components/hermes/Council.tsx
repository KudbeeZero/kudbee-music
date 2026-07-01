'use client';

import type { AgentOutput, SongPackage } from '@/lib/hermes/types';
import { AGENT_DEFINITIONS } from '@/lib/hermes/agents';
import { deliberate } from '@/lib/hermes/cognition';
import styles from './hermes.module.css';

// The Council — the agents as a deliberating board (the WIFI DJ "Crossroads Board"
// made literal). The right hemisphere proposes, the left hemisphere challenges, and
// the artist decides. Reuses the real agent findings + the cognition loop.
export default function Council({ outputs, pkg }: { outputs: Record<string, AgentOutput>; pkg: SongPackage }) {
  const right = AGENT_DEFINITIONS.filter((d) => d.hemisphere === 'right');
  const left = AGENT_DEFINITIONS.filter((d) => d.hemisphere === 'left');
  const d = pkg.chosenHook ? deliberate(pkg.chosenHook.text, pkg.inputs) : null;

  const Bench = ({ title, defs, tint }: { title: string; defs: typeof AGENT_DEFINITIONS; tint: string }) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div className={styles.hint} style={{ color: tint, fontWeight: 600 }}>{title}</div>
      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {defs.map((def) => (
          <div key={def.id} className={styles.flag} style={{ borderLeft: `2px solid ${tint}` }}>
            <div className={styles.flagKind}>{def.name}</div>
            <div className={styles.hint}>{outputs[def.id]?.finding ?? def.role}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>🏛️ The Council</div>
      <div className={styles.hint}>Right hemisphere <strong>proposes</strong> · left hemisphere <strong>challenges</strong> · <strong>you decide</strong>.</div>
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <Bench title="✦ Proposes (right)" defs={right} tint="var(--magenta)" />
        <Bench title="⚖ Challenges (left)" defs={left} tint="var(--cyan)" />
      </div>
      {d && (
        <div style={{ marginTop: 10, borderTop: '1px solid var(--line)', paddingTop: 8 }}>
          <div className={styles.hint}>The decision on the lead hook — “{pkg.chosenHook!.text}”</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {d.secondThought.map((c, i) => (
              <span key={i} className={styles.chip} title={c.note}
                style={{ borderColor: c.passes ? 'rgba(87,217,138,0.4)' : 'rgba(255,120,120,0.4)', color: c.passes ? 'var(--good)' : 'var(--bad)' }}>
                {c.passes ? '✓' : '✗'} {c.question.replace(/^Is it |^Does it /, '').replace('?', '')}
              </span>
            ))}
          </div>
          <div className={styles.hint} style={{ marginTop: 4 }}>{d.verdict === 'keep' ? '✅ ' : '↻ '}{d.decision}</div>
        </div>
      )}
    </div>
  );
}
