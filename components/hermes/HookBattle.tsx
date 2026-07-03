'use client';

import { useState } from 'react';
import type { HookOption, SongInputs, SongSection } from '@/lib/hermes/types';
import { rankHooksByCouncil } from '@/lib/hermes/council';
import styles from './hermes.module.css';

/**
 * A bracket-style reskin of the same ranking Council.tsx already shows as a flat list
 * (mobile-mockup-plan Phase B, "Hook Battle") — zero new scoring logic, `rankHooksByCouncil`
 * does the seeding, this just turns "the top 2-4 hooks" into a single-elimination "pick
 * the stronger one" bracket instead of a ranked list. Callers should only render this
 * when there are ≥2 hook options; it returns null itself as a second guard.
 */
export default function HookBattle({ hooks, inputs, sections, onWinner }: {
  hooks: HookOption[];
  inputs: SongInputs;
  sections: SongSection[];
  onWinner: (h: HookOption) => void;
}) {
  const seeds = rankHooksByCouncil(hooks, inputs, sections)
    .slice(0, hooks.length >= 4 ? 4 : 2)
    .map((r) => r.hook);

  const [round, setRound] = useState<HookOption[]>(seeds);
  // Decisions are keyed by pair index → winning side (0|1), never by hook text — two
  // hooks with identical text used to collide and stick the bracket.
  const [picks, setPicks] = useState<Record<number, 0 | 1>>({});

  if (seeds.length < 2) return null;
  const winner = round.length === 1 ? round[0] : null;
  const pairCount = Math.floor(round.length / 2);

  function pick(pairIndex: number, side: 0 | 1) {
    if (picks[pairIndex] !== undefined) return; // this pair is already decided
    const nextPicks = { ...picks, [pairIndex]: side };
    if (Object.keys(nextPicks).length === pairCount) {
      const winners: HookOption[] = [];
      for (let i = 0; i < pairCount; i++) winners.push(round[i * 2 + nextPicks[i]]);
      if (winners.length === 1) onWinner(winners[0]);
      setRound(winners);
      setPicks({});
    } else {
      setPicks(nextPicks);
    }
  }

  function reset() {
    setRound(seeds);
    setPicks({});
  }

  if (winner) {
    return (
      <div className={styles.flag} style={{ textAlign: 'center', borderLeft: '3px solid var(--amber)' }}>
        <div className={styles.flagKind}>🏆 Winner</div>
        <div style={{ fontSize: 14, fontWeight: 700, margin: '4px 0' }}>&ldquo;{winner.text}&rdquo;</div>
        <button className={styles.ghostBtn} onClick={reset}>↺ Battle again</button>
      </div>
    );
  }

  const pairs: [HookOption, HookOption][] = [];
  for (let i = 0; i < round.length; i += 2) pairs.push([round[i], round[i + 1]]);

  return (
    <div>
      <p className={styles.hint} style={{ marginBottom: 6 }}>
        {round.length === 2 ? '⚔️ Final round' : `⚔️ Round of ${round.length}`} — tap the stronger hook.
      </p>
      {pairs.map(([a, b], i) => {
        const decidedSide = picks[i];
        const decided = decidedSide !== undefined;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'stretch', gap: 8, marginBottom: 8 }}>
            {[a, b].map((h, side) => {
              const won = decided && decidedSide === side;
              const lost = decided && decidedSide !== side;
              return (
                <button
                  key={side}
                  type="button"
                  className={styles.hookCard}
                  disabled={decided}
                  onClick={() => pick(i, side as 0 | 1)}
                  style={{
                    flex: 1, textAlign: 'left', cursor: decided ? 'default' : 'pointer',
                    opacity: lost ? 0.4 : 1, borderColor: won ? 'var(--amber)' : undefined,
                    color: 'var(--ink)', width: '100%',
                  }}
                >
                  <div className={styles.hookText}>&ldquo;{h.text}&rdquo;</div>
                  <div className={styles.hookMeta}>{h.angle} · stickiness {h.score}</div>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
