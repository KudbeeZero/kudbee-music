'use client';

import styles from './tde.module.css';

// TDE Safety Gate panel — Branch 07 (docs/kudbee-tde-roadmap.md). The visible
// blocked-actions board: every named gate the Kudbee agent operation enforces,
// why it exists, and what happens when something trips it. Pure display — the
// gates are policy made legible, not switches.

interface Gate {
  action: string;
  why: string;
  onTrip: string;
}

const GATES: Gate[] = [
  {
    action: 'git add -A from workspace root',
    why: 'Stages unrelated work across projects — the classic way secrets and stray files end up in a commit.',
    onTrip: 'Stop; stage explicit paths only.',
  },
  {
    action: 'Wrong-repo edits',
    why: 'hermes-lyric-server and kudbee-engine are hands-off from the TDE; edits belong in their own sessions.',
    onTrip: 'Stop; report which repo the change actually belongs to.',
  },
  {
    action: 'Wrong-branch push',
    why: 'One active feat/tde-NN branch at a time, always cut from fresh origin/main.',
    onTrip: 'Stop; re-cut the branch from origin/main.',
  },
  {
    action: 'Deleting final/',
    why: 'Training outputs are irreplaceable — hours of GPU time and the record of what was learned.',
    onTrip: 'Hard block; nothing in final/ is ever deleted by an agent.',
  },
  {
    action: 'Deleting model caches',
    why: 'Re-downloading base models burns hours and bandwidth; caches are infrastructure, not clutter.',
    onTrip: 'Hard block; cache cleanup is a founder decision.',
  },
  {
    action: 'Committing secrets',
    why: 'A leaked key once had to be rotated and scrubbed from history. Once is enough.',
    onTrip: 'Grep every staged diff for key_ before committing; rotate anything that slips.',
  },
  {
    action: 'Committing model artifacts',
    why: 'Checkpoints/adapters are gigabytes of binary that do not belong in git history.',
    onTrip: 'Stop; artifacts live in Lightning storage, never the repo.',
  },
  {
    action: 'CPU training fallback',
    why: 'A misconfigured GPU job silently falling back to CPU burns hours and produces nothing usable.',
    onTrip: 'Abort the run; verify device placement before restarting.',
  },
  {
    action: 'Recursive sub-agent spawning',
    why: 'Depth 1 only — agents spawning agents makes cost and behavior unauditable.',
    onTrip: 'Hard block; the dispatch is refused.',
  },
  {
    action: 'Live API calls without approval',
    why: 'Every network call in v1 is a policy decision, not a convenience. Suggest-only until the bridge exists.',
    onTrip: 'Stop; the action is recorded as a suggestion instead.',
  },
];

export default function SafetyGatePanel() {
  return (
    <section className={styles.wideSlot} data-tone="bad" aria-label="Safety gate panel">
      <div className={styles.slotHead}>
        <h2 className={styles.slotName}>Safety Gates</h2>
        <span className={styles.blockedTag}>{GATES.length} blocked actions · always on</span>
      </div>

      <div className={styles.gateGrid}>
        {GATES.map((g) => (
          <article key={g.action} className={styles.gateCard}>
            <h3 className={styles.gateAction}>
              <span className={styles.gateIcon} aria-hidden>⛔</span>
              {g.action}
            </h3>
            <p className={styles.repoRole}>{g.why}</p>
            <p className={styles.gateTrip}>{g.onTrip}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
