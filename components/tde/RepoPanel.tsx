'use client';

import styles from './tde.module.css';

// TDE Repo panel — Branch 03 (docs/kudbee-tde-roadmap.md). Mock, read-only repo
// cards. kudbee-music facts come from this repo's own CLAUDE.md/SECURITY.md;
// hermes-lyric-server and kudbee-engine are external repos described from
// founder-supplied facts and labeled as such. Nothing here fetches anything.

interface RepoCard {
  name: string;
  origin: 'this repo' | 'external';
  role: string;
  canonicalBranch: string;
  protectedPaths: string[];
  status: string;
  statusTone: 'good' | 'warn' | 'dim';
  integration: string;
}

const REPOS: RepoCard[] = [
  {
    name: 'kudbee-music',
    origin: 'this repo',
    role: 'App / frontend / studio — the WIFI DJ web app, the HERMES song brain, and the music-video studio.',
    canonicalBranch: 'main',
    protectedPaths: [
      'training-data-input/ (founder drops, never committed)',
      'brain/vector-memory.json (generated)',
      '.env / .env.local (secrets)',
      'checkpoints/ + model caches (gitignored)',
    ],
    status: 'Active — merges to main auto-deploy to Cloudflare Pages (wifi-dj-meme).',
    statusTone: 'good',
    integration: 'Live — the TDE runs inside it.',
  },
  {
    name: 'hermes-lyric-server',
    origin: 'external',
    role: 'Backend / model / training / server — the Lightning AI lane: SCRIBE LoRA runs, model serving, eval.',
    canonicalBranch: 'main',
    protectedPaths: [
      'final/ (training outputs — never delete)',
      'checkpoints/ + LoRA adapters',
      'model caches',
      'secrets / tokens',
    ],
    status: 'Active Lightning AI training work — hands off from the TDE. Read-only forever until the bridge plan approves more.',
    statusTone: 'warn',
    integration: 'Planned read-only health contract (Branch 09). No calls yet.',
  },
  {
    name: 'kudbee-engine',
    origin: 'external',
    role: 'Archived planning repo — a possible future control-plane for agent orchestration.',
    canonicalBranch: 'main',
    protectedPaths: ['everything (archived — no writes at all)'],
    status: 'Archived — reference only.',
    statusTone: 'dim',
    integration: 'None planned yet.',
  },
];

export default function RepoPanel() {
  return (
    <section className={styles.wideSlot} data-tone="violet" aria-label="Repo panel">
      <div className={styles.slotHead}>
        <h2 className={styles.slotName}>Repos</h2>
        <span className={styles.suggestOnlyTag}>Read-only · mock state</span>
      </div>
      <div className={styles.repoGrid}>
        {REPOS.map((r) => (
          <article key={r.name} className={styles.repoCard}>
            <div className={styles.repoHead}>
              <h3 className={styles.repoName}>{r.name}</h3>
              <span className={styles.repoOrigin} data-external={r.origin === 'external' || undefined}>
                {r.origin}
              </span>
            </div>
            <p className={styles.repoRole}>{r.role}</p>
            <dl className={styles.repoFacts}>
              <div className={styles.repoFact}>
                <dt>Canonical branch</dt>
                <dd>
                  <code>{r.canonicalBranch}</code>
                </dd>
              </div>
              <div className={styles.repoFact}>
                <dt>Protected paths</dt>
                <dd>
                  <ul className={styles.repoPaths}>
                    {r.protectedPaths.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </dd>
              </div>
              <div className={styles.repoFact}>
                <dt>Status</dt>
                <dd data-tone={r.statusTone}>{r.status}</dd>
              </div>
              <div className={styles.repoFact}>
                <dt>Integration</dt>
                <dd>{r.integration}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
