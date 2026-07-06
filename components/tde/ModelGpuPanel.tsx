'use client';

import styles from './tde.module.css';

// TDE Model/GPU panel — Branch 05 (docs/kudbee-tde-roadmap.md). Mock router
// cards for the Kudbee model family + hardware lanes + a mock GPU job queue.
// KUDBEE* models are external Lightning AI training work (labeled); HERMES and
// the embedding lane are this repo's own. Nothing here launches anything.

interface ModelCard {
  name: string;
  lane: string;
  origin: 'this repo' | 'external';
  status: string;
  note: string;
}

const MODELS: ModelCard[] = [
  {
    name: 'HERMES',
    lane: 'Deterministic lyric engine',
    origin: 'this repo',
    status: 'shipping default',
    note: '$0, local, seeded — same input, same song. The engine this app runs on today.',
  },
  {
    name: 'KUDBEECODEV0-MINI',
    lane: 'Local coding agent (small)',
    origin: 'external',
    status: 'training lane',
    note: 'T4-class runs: prep, labeling, light eval. Future Claude-Code-style local behavior.',
  },
  {
    name: 'KUDBEECODEV0-14B',
    lane: 'Local coding agent (14B)',
    origin: 'external',
    status: 'training lane',
    note: 'RTX 6000-class training/eval. The serious local coding-agent bet.',
  },
  {
    name: 'KUDBEESCRIBEV1',
    lane: 'Lyric line rewrite (SCRIBE)',
    origin: 'external',
    status: 'LoRA trained · eval pending',
    note: 'Qwen2.5-14B-Instruct base + LoRA on the 212-row real-format SCRIBE dataset (docs/scribe-real-training-v1.md).',
  },
  {
    name: 'KUDBEEV1',
    lane: 'Song generation',
    origin: 'external',
    status: 'planned',
    note: 'The trained song-brain lane. HERMES stays the deterministic fallback.',
  },
  {
    name: 'Embedding model',
    lane: 'Vector memory / semantic recall',
    origin: 'this repo',
    status: 'shipped (opt-in)',
    note: '@xenova/transformers, lazy-loaded, node-only — local cosine similarity, no API.',
  },
  {
    name: 'Mistral 7B',
    lane: 'Legacy / lighter lane',
    origin: 'external',
    status: 'reference option',
    note: 'Kept as a lighter base-model option; not currently trained or deployed.',
  },
];

const HARDWARE = [
  {
    name: 'T4 mode',
    tone: 'cyan',
    fits: 'Prep · MINI runs · embeddings · light eval',
    note: 'The cheap lane. Anything that fits in 16GB and tolerates slower tokens goes here first.',
  },
  {
    name: 'RTX 6000 mode',
    tone: 'amber',
    fits: '14B training/eval · real SCRIBE · dense rehearsal',
    note: 'RTX PRO 6000 Blackwell, 97GB VRAM (the SCRIBE LoRA ran here). Reserved for work that actually needs it.',
  },
];

const MOCK_JOBS = [
  { id: 'job-014', what: 'SCRIBE LoRA eval — 3-case rubric vs base Qwen2.5-14B', gpu: 'RTX 6000', state: 'queued (mock)' },
  { id: 'job-013', what: 'KUDBEECODEV0-MINI smoke eval — 18-prompt set', gpu: 'T4', state: 'queued (mock)' },
  { id: 'job-012', what: 'Training-row drop prep — dedupe + format check', gpu: 'T4', state: 'done (mock)' },
];

export default function ModelGpuPanel() {
  return (
    <section className={styles.wideSlot} data-tone="amber" aria-label="Model and GPU panel">
      <div className={styles.slotHead}>
        <h2 className={styles.slotName}>Models / GPU</h2>
        <span className={styles.suggestOnlyTag}>Mock queue · no jobs launch</span>
      </div>

      <div className={styles.modelGrid}>
        {MODELS.map((m) => (
          <article key={m.name} className={styles.modelCard}>
            <div className={styles.repoHead}>
              <h3 className={styles.modelName}>{m.name}</h3>
              <span className={styles.repoOrigin} data-external={m.origin === 'external' || undefined}>
                {m.origin}
              </span>
            </div>
            <p className={styles.modelLane}>{m.lane}</p>
            <p className={styles.modelStatus}>{m.status}</p>
            <p className={styles.repoRole}>{m.note}</p>
          </article>
        ))}
      </div>

      <div className={styles.hwRow}>
        {HARDWARE.map((h) => (
          <article key={h.name} className={styles.hwCard} data-tone={h.tone}>
            <h3 className={styles.repoName}>{h.name}</h3>
            <p className={styles.hwFits}>{h.fits}</p>
            <p className={styles.repoRole}>{h.note}</p>
          </article>
        ))}
      </div>

      <div className={styles.traceBox}>
        <h3 className={styles.traceTitle}>GPU job queue (mock) — next action: run the SCRIBE eval rubric on RTX 6000</h3>
        <ol className={styles.traceList}>
          {MOCK_JOBS.map((j) => (
            <li key={j.id} className={styles.traceLine}>
              <span className={styles.traceAt}>{j.id}</span>
              <span>
                {j.what} — <code className={styles.jobGpu}>{j.gpu}</code>{' '}
                <span className={styles.jobState} data-done={j.state.startsWith('done') || undefined}>{j.state}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
