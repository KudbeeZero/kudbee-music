'use client';

import { useState } from 'react';
import type { AgentOutput, SongPackage } from '@/lib/hermes/types';
import type { Taste } from '@/lib/hermes/storage';
import { AGENT_DEFINITIONS } from '@/lib/hermes/agents';
import { deliberationForHook } from '@/lib/hermes/cognition';
import { rankHooksByCouncil, COUNCIL_WEIGHTS, COUNCIL_WEIGHTS_WITH_VOICE } from '@/lib/hermes/council';
import { GUEST_JUDGES } from '@/lib/hermes/guestJudges';
import { AGENT_PACKS } from '@/lib/hermes/agentPacks';
import AgentAvatar from './AgentAvatar';
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
      <div className={styles.councilBenchLabel} style={{ color: tint }}>{title}</div>
      <div className={styles.councilBenchList}>
        {defs.map((def) => (
          <div key={def.id} className={styles.councilCard} style={{ ['--tint' as string]: tint }}>
            <div className={styles.councilAvatarWrap} style={{ border: `1px solid ${tint}55`, boxShadow: `0 0 10px -2px ${tint}` }}>
              <AgentAvatar codename={def.codename} color={tint} size={16} />
            </div>
            <div className={styles.councilCardBody}>
              <div className={styles.councilCardName}>
                {def.codename ?? def.name}
                {def.codename && <span className={styles.councilCardCodename}>{def.name}</span>}
              </div>
              <div className={styles.councilCardFinding}>{outputs[def.id]?.finding ?? def.role}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const SeatChip = ({ id, emoji, label, description }: { id: string; emoji: string; label: string; description: string }) => {
    const seated = guestIds.includes(id);
    return (
      <button key={id} className={styles.councilSeatChip} onClick={() => toggleGuest(id)} title={description} aria-pressed={seated}>
        <span className={styles.councilVoteIcon} aria-hidden>
          <svg viewBox="0 0 16 16" width="9" height="9">
            {seated
              ? <path d="M4 6 L8 10 L12 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              : <path d="M4 10 L8 6 L12 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
          </svg>
        </span>
        {emoji} {label}
      </button>
    );
  };

  return (
    <div className={styles.panel}>
      <div className={styles.councilPanelHead}>
        <div className={styles.panelTitle} style={{ marginBottom: 0 }}>🏛️ The Council</div>
        <div className={styles.councilLogo} aria-hidden>
          <svg viewBox="0 0 32 32" width="18" height="18">
            <defs>
              <linearGradient id="councilLogoGrad" x1="0" y1="0" x2="32" y2="32">
                <stop offset="0" stopColor="var(--violet)" />
                <stop offset="1" stopColor="var(--magenta)" />
              </linearGradient>
            </defs>
            <path d="M16 3 L27 16 L16 29 L5 16 Z" fill="none" stroke="url(#councilLogoGrad)" strokeWidth="2.2" strokeLinejoin="round" />
            <path d="M16 11 L21 16 L16 21 L11 16 Z" fill="url(#councilLogoGrad)" opacity="0.32" />
          </svg>
          <span className={styles.councilLogoWord}>WiFi <strong>DJ</strong></span>
        </div>
      </div>
      <div className={styles.hint}>Right hemisphere <strong>proposes</strong> · left hemisphere <strong>challenges</strong> · <strong>you decide</strong>.</div>
      <div className={styles.councilBenches}>
        <Bench title="✦ Proposes (right)" defs={right} tint="var(--magenta)" />
        <Bench title="⚖ Challenges (left)" defs={left} tint="var(--cyan)" />
      </div>
      <div style={{ marginTop: 10 }}>
        <div className={styles.hint}>🎭 Guest Judges — seat an extra voice at the board for this session</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 5 }}>
          {GUEST_JUDGES.map((j) => (
            <SeatChip key={j.id} id={j.id} emoji={j.emoji} label={j.label} description={j.description} />
          ))}
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <div className={styles.hint}>🎛️ Agent Packs — genre/scene lenses, seated the same way</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 5 }}>
          {AGENT_PACKS.map((p) => (
            <SeatChip key={p.id} id={p.id} emoji={p.emoji} label={p.label} description={p.description} />
          ))}
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
                <div key={`${r.rank}-${r.hook.text}`} className={styles.councilRankRow} data-pick={isPick} style={{ opacity: isPick ? 1 : 0.9 }}>
                  <span className={styles.councilRankScore}>{r.councilScore}</span>
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
        <div className={styles.councilVerdictCard}>
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
