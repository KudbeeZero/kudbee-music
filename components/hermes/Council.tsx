'use client';

import { useState } from 'react';
import type { AgentOutput, SongPackage } from '@/lib/hermes/types';
import type { Taste } from '@/lib/hermes/storage';
import { AGENT_DEFINITIONS } from '@/lib/hermes/agents';
import { deliberationForHook } from '@/lib/hermes/cognition';
import { rankHooksByCouncil, COUNCIL_WEIGHTS, COUNCIL_WEIGHTS_WITH_VOICE } from '@/lib/hermes/council';
import { GUEST_JUDGES } from '@/lib/hermes/guestJudges';
import { AGENT_PACKS } from '@/lib/hermes/agentPacks';
import styles from './hermes.module.css';

// Guest Judges (personas) and Agent Packs (genre/scene lenses) are the same
// underlying plug-in shape — seated the same way, at the same board.
const SEATABLE = [...GUEST_JUDGES, ...AGENT_PACKS];

// The Council — the agents as a deliberating board (the WIFI DJ "Crossroads Board"
// made literal). The right hemisphere proposes, the left hemisphere challenges, and
// the artist decides. Reuses the real agent findings + the cognition loop.
export default function Council({ outputs, pkg, taste }: { outputs: Record<string, AgentOutput>; pkg: SongPackage; taste?: Taste }) {
  const right = AGENT_DEFINITIONS.filter((d) => d.hemisphere === 'right');
  const left = AGENT_DEFINITIONS.filter((d) => d.hemisphere === 'left');
  // Guest Judges + Agent Packs — pluggable voices, seated by the artist for this
  // session only (not persisted; a deliberate choice each time, not a sticky setting).
  const [guestIds, setGuestIds] = useState<string[]>([]);
  function toggleGuest(id: string) {
    setGuestIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));
  }
  const guestVoices = SEATABLE.filter((j) => guestIds.includes(j.id)).map((j) => j.voice);
  // Reuse the pipeline's stored verdict when it's for the current lead (stays consistent
  // with the Deliberation panel); recompute otherwise. Guard shape for older/imported songs.
  const d = pkg.chosenHook ? deliberationForHook(pkg.chosenHook.text, pkg.inputs, pkg.cognition) : null;
  // The Council's actual work: rank the hook candidates across the three (or, once the
  // artist has real edit history, four — "your voice") voices, plus any seated guests.
  const ranking = rankHooksByCouncil(pkg.hookOptions ?? [], pkg.inputs, pkg.sections ?? [], taste, guestVoices).slice(0, 4);
  const chosenText = pkg.chosenHook?.text;
  const hasVoice = !!taste && taste.edits > 0;
  const w = hasVoice ? COUNCIL_WEIGHTS_WITH_VOICE : COUNCIL_WEIGHTS;

  const Bench = ({ title, defs, tint }: { title: string; defs: typeof AGENT_DEFINITIONS; tint: string }) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div className={styles.hint} style={{ color: tint, fontWeight: 600 }}>{title}</div>
      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {defs.map((def) => (
          <div key={def.id} className={styles.flag} style={{ borderLeft: `2px solid ${tint}` }}>
            <div className={styles.flagKind}>
              {def.codename ?? def.name}
              {def.codename && <span className={styles.hint} style={{ marginLeft: 6, fontWeight: 400 }}>{def.name}</span>}
            </div>
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
      <div style={{ marginTop: 10 }}>
        <div className={styles.hint}>🎭 Guest Judges — seat an extra voice at the board for this session</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 5 }}>
          {GUEST_JUDGES.map((j) => {
            const seated = guestIds.includes(j.id);
            return (
              <button
                key={j.id}
                className={styles.chip}
                onClick={() => toggleGuest(j.id)}
                title={j.description}
                aria-pressed={seated}
                style={{
                  cursor: 'pointer', borderColor: seated ? 'var(--amber)' : undefined,
                  color: seated ? 'var(--amber)' : undefined, background: seated ? 'rgba(255,177,78,0.1)' : undefined,
                }}
              >
                {j.emoji} {j.label}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <div className={styles.hint}>🎛️ Agent Packs — genre/scene lenses, seated the same way</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 5 }}>
          {AGENT_PACKS.map((p) => {
            const seated = guestIds.includes(p.id);
            return (
              <button
                key={p.id}
                className={styles.chip}
                onClick={() => toggleGuest(p.id)}
                title={p.description}
                aria-pressed={seated}
                style={{
                  cursor: 'pointer', borderColor: seated ? 'var(--amber)' : undefined,
                  color: seated ? 'var(--amber)' : undefined, background: seated ? 'rgba(255,177,78,0.1)' : undefined,
                }}
              >
                {p.emoji} {p.label}
              </button>
            );
          })}
        </div>
      </div>
      {ranking.length > 1 && (
        <div style={{ marginTop: 10, borderTop: '1px solid var(--line)', paddingTop: 8 }}>
          <div className={styles.hint}>
            🏆 The Council's ranking{' '}
            <span style={{ opacity: 0.7 }}>
              {hasVoice
                ? `(challenges ${w.challenge} · crave ${w.reward} · confidence ${w.confidence} · your voice ${(w as typeof COUNCIL_WEIGHTS_WITH_VOICE).voice})`
                : `(challenges ${w.challenge} · crave ${w.reward} · confidence ${w.confidence})`}
              {guestVoices.length > 0 && ` + ${guestIds.map((id) => SEATABLE.find((j) => j.id === id)?.label).join(', ')} seated`}
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
