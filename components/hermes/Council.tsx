'use client';

import type { AgentOutput, SongPackage } from '@/lib/hermes/types';
import type { Taste } from '@/lib/hermes/storage';
import { AGENT_DEFINITIONS } from '@/lib/hermes/agents';
import { deliberationForHook } from '@/lib/hermes/cognition';
import { rankHooksByCouncil, COUNCIL_WEIGHTS, COUNCIL_WEIGHTS_WITH_VOICE } from '@/lib/hermes/council';
import styles from './hermes.module.css';

// The Council — the agents as a deliberating board (the WIFI DJ "Crossroads Board"
// made literal). The right hemisphere proposes, the left hemisphere challenges, and
// the artist decides. Reuses the real agent findings + the cognition loop.
export default function Council({ outputs, pkg, taste }: { outputs: Record<string, AgentOutput>; pkg: SongPackage; taste?: Taste }) {
  const right = AGENT_DEFINITIONS.filter((d) => d.hemisphere === 'right');
  const left = AGENT_DEFINITIONS.filter((d) => d.hemisphere === 'left');
  // Reuse the pipeline's stored verdict when it's for the current lead (stays consistent
  // with the Deliberation panel); recompute otherwise. Guard shape for older/imported songs.
  const d = pkg.chosenHook ? deliberationForHook(pkg.chosenHook.text, pkg.inputs, pkg.cognition) : null;
  // The Council's actual work: rank the hook candidates across the three (or, once the
  // artist has real edit history, four — "your voice") voices.
  const ranking = rankHooksByCouncil(pkg.hookOptions ?? [], pkg.inputs, pkg.sections ?? [], taste).slice(0, 4);
  const chosenText = pkg.chosenHook?.text;
  const hasVoice = !!taste && taste.edits > 0;
  const w = hasVoice ? COUNCIL_WEIGHTS_WITH_VOICE : COUNCIL_WEIGHTS;

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
      {ranking.length > 1 && (
        <div style={{ marginTop: 10, borderTop: '1px solid var(--line)', paddingTop: 8 }}>
          <div className={styles.hint}>
            🏆 The Council's ranking{' '}
            <span style={{ opacity: 0.7 }}>
              {hasVoice
                ? `(challenges ${w.challenge} · crave ${w.reward} · confidence ${w.confidence} · your voice ${(w as typeof COUNCIL_WEIGHTS_WITH_VOICE).voice})`
                : `(challenges ${w.challenge} · crave ${w.reward} · confidence ${w.confidence})`}
            </span>
          </div>
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {ranking.map((r) => {
              const isPick = r.hook.text === chosenText;
              return (
                <div key={`${r.rank}-${r.hook.text}`} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: isPick ? 1 : 0.72 }}>
                  <span style={{ width: 34, fontWeight: 700, color: isPick ? 'var(--magenta)' : 'var(--ink-faint)' }}>{r.councilScore}</span>
                  <span className={styles.hint} style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isPick ? 'var(--ink)' : undefined }}>
                    {isPick ? '★ ' : `${r.rank}. `}{r.hook.text}
                  </span>
                  {typeof r.voice === 'number' && (
                    <span className={styles.hint} style={{ opacity: 0.7 }} title="How much this hook echoes your learned taste">🎙 {r.voice}</span>
                  )}
                  <span className={styles.hint} style={{ opacity: 0.7 }}>{r.passed}/3</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
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
