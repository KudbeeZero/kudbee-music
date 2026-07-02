'use client';

// The Crossroads Board — Stage 2 (the WIFI DJ governance surface made visible).
// Stage 1 shipped the pure data model (lib/hermes/crossroads.ts + brain/crossroads.json,
// #44); this route renders the seeded crossings and lets a visitor cast their own vote,
// stored only in this browser (lib/hermes/crossroadsStorage.ts). Honest about scope:
// community-wide vote sync (stage 4, a separate API service) isn't built yet, so the
// tally shown here is the seeded base plus THIS browser's own vote, not a real headcount.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadSeed, applyMyVotes, tally, leader, type Crossing } from '@/lib/hermes/crossroadsBoard';
import { getMyVotes, castVote, type CrossroadsVotes } from '@/lib/hermes/crossroadsStorage';
import styles from './hermes.module.css';

function CrossingCard({ crossing, myVote, onVote }: { crossing: Crossing; myVote?: string; onVote: (optionId: string) => void }) {
  const ranked = tally(crossing);
  const top = leader(crossing);
  const totalVotes = crossing.options.reduce((sum, o) => sum + o.votes, 0);
  const decided = crossing.status === 'decided';

  return (
    <div className={styles.crossingCard}>
      <div className={styles.crossingQuestion}>{crossing.question}</div>
      <div className={styles.crossingStatus} data-status={crossing.status}>
        {decided ? `Decided — ${crossing.outcome}` : 'Open — cast your vote'}
      </div>
      {ranked.map((o) => {
        const isMine = myVote === o.id;
        const isOutcome = decided && crossing.outcome === o.id;
        const pct = totalVotes > 0 ? Math.round((o.votes / totalVotes) * 100) : 0;
        return (
          <button
            key={o.id}
            type="button"
            className={styles.optionRow}
            data-mine={isMine}
            data-outcome={isOutcome}
            disabled={decided}
            onClick={() => !decided && onVote(o.id)}
          >
            <div className={styles.optionTop}>
              <span className={styles.optionLabel}>
                {o.label}
                {isMine && <span className={styles.mineBadge}> · your vote</span>}
              </span>
              <span className={styles.optionVotes}>{o.votes} vote{o.votes === 1 ? '' : 's'} ({pct}%)</span>
            </div>
            <div className={styles.optionRationale}>{o.rationale}</div>
            <div className={styles.voteBar}><div className={styles.voteFill} style={{ width: `${pct}%` }} /></div>
          </button>
        );
      })}
      {!decided && top && (
        <div className={styles.hint} style={{ marginTop: 2 }}>Front-runner: {top.label}.</div>
      )}
    </div>
  );
}

export default function CrossroadsBoard() {
  const [seed, setSeed] = useState<Crossing[] | null>(null);
  const [myVotes, setMyVotes] = useState<CrossroadsVotes>({});

  // hydrate from local storage on mount (client only — avoids SSR mismatch)
  useEffect(() => {
    setSeed(loadSeed());
    setMyVotes(getMyVotes());
  }, []);

  const handleVote = (crossingId: string, optionId: string) => {
    setMyVotes(castVote(crossingId, optionId));
  };

  const crossings = seed ? applyMyVotes(seed, myVotes) : [];

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brandMark}>H</div>
        <div className={styles.brandText}>
          <span className={styles.kicker}>HERMES</span>
          <span className={styles.title}>🧭 Crossroads Board</span>
        </div>
        <div className={styles.headerSpacer} />
        <Link href="/hermes" className={styles.ghostBtn}>← Back to the studio</Link>
      </header>

      <div className={styles.hint} style={{ marginBottom: 16, lineHeight: 1.5 }}>
        The community + agents meet here to steer creative and ecosystem direction — the
        brain&apos;s &quot;decision&quot; region made social. Stage 1 shipped the model; this is Stage 2,
        the board itself. Your vote is recorded only in this browser (no account, no server) —
        community-wide sync across every visitor&apos;s vote is a later stage, not built yet.
      </div>

      {seed === null && <div className={styles.emptyState}>Loading the board…</div>}
      {seed !== null && crossings.length === 0 && (
        <div className={styles.emptyState}>No open crossings right now — check back soon.</div>
      )}
      {crossings.map((c) => (
        <CrossingCard key={c.id} crossing={c} myVote={myVotes[c.id]} onVote={(optionId) => handleVote(c.id, optionId)} />
      ))}
    </div>
  );
}
