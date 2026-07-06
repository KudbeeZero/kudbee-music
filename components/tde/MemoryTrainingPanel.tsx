'use client';

import styles from './tde.module.css';

// TDE Memory/Training panel — Branch 06 (docs/kudbee-tde-roadmap.md). Mock
// dashboard over the Kudbee memory/state files and the KUDBEECODEV0/SCRIBE
// training loop. Numbers are founder-supplied snapshots from the Lightning AI
// session (mode: mock — nothing here reads live state). This repo's own
// SCRIBE facts (212-row real-format dataset) are cited where they apply.

const STATE_FILES = [
  {
    name: 'PROJECT_STATE.md',
    what: 'The single source of where the whole Kudbee operation stands — read first, every session.',
    freshness: 'mock snapshot',
  },
  {
    name: 'ARCHITECTURE_TRUTH.md',
    what: 'The decided architecture — what is true, not what is planned. Disagreements resolve here.',
    freshness: 'mock snapshot',
  },
  {
    name: 'agent-state-tracker',
    what: 'Which agent holds which branch/task right now; depth-1 dispatch ledger.',
    freshness: 'mock snapshot',
  },
  {
    name: 'repo atlas',
    what: 'Map of every repo, its role, canonical branch, and protected paths (rendered live in the Repos panel).',
    freshness: 'mock snapshot',
  },
];

const TRAINING_STATS = [
  { label: 'Training rows', value: '255+', note: 'KUDBEECODEV0 coding-agent rows collected (this repo separately holds a 212-row SCRIBE line-rewrite set)' },
  { label: 'Eval pass rate', value: '4/18 · 22%', note: 'baseline before the next fine-tune — the number to beat' },
  { label: 'Drop queue', value: '3 drops', note: 'branch-decision capture → row format → dedupe, waiting to land' },
  { label: 'Next data target', value: 'TDE branch decisions', note: 'every Asked/Done/Tests/PR report becomes a training row' },
];

export default function MemoryTrainingPanel() {
  return (
    <section className={styles.wideSlot} data-tone="good" aria-label="Memory and training panel">
      <div className={styles.slotHead}>
        <h2 className={styles.slotName}>Memory / Training</h2>
        <span className={styles.suggestOnlyTag}>mode: mock · no live reads</span>
      </div>

      <div className={styles.statRow}>
        {TRAINING_STATS.map((s) => (
          <article key={s.label} className={styles.statCard}>
            <p className={styles.statValue}>{s.value}</p>
            <h3 className={styles.statLabel}>{s.label}</h3>
            <p className={styles.statNote}>{s.note}</p>
          </article>
        ))}
      </div>

      <div className={styles.repoGrid}>
        {STATE_FILES.map((f) => (
          <article key={f.name} className={styles.memoryCard}>
            <div className={styles.repoHead}>
              <h3 className={styles.modelName}>{f.name}</h3>
              <span className={styles.freshTag}>{f.freshness}</span>
            </div>
            <p className={styles.repoRole}>{f.what}</p>
          </article>
        ))}
      </div>

      <div className={styles.traceBox} data-tone="good">
        <h3 className={styles.traceTitle}>Next GPU action (placeholder — never runs from here)</h3>
        <p className={styles.nextCmd}>
          <code>
            # rehearsal_candidate — RTX 6000 · queued behind founder approval{'\n'}
            litgpt finetune_lora … --data rehearsal_candidate.jsonl --precision bf16-mixed
          </code>
        </p>
        <p className={styles.statNote}>
          The command is documentation, not a button. Live GPU execution stays blocked
          until the Branch 12 backend-bridge permission layer exists.
        </p>
      </div>
    </section>
  );
}
