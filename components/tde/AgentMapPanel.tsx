'use client';

import styles from './tde.module.css';

// TDE Agent map — Branch 04 (docs/kudbee-tde-roadmap.md). Mock roster of the
// Kudbee agent hierarchy: who exists, what each may and may not do, who spawned
// it, and its risk level. No agent here is running — this is the org chart the
// future execution layer must obey. Depth-1 rule rendered as a hard banner.

interface AgentCard {
  name: string;
  status: 'active' | 'standby' | 'planned';
  role: string;
  allowed: string[];
  forbidden: string[];
  spawnedBy: string;
  risk: 'low' | 'medium' | 'high';
}

const AGENTS: AgentCard[] = [
  {
    name: 'Main Agent',
    status: 'active',
    role: 'Owns the current branch end-to-end: plans, edits, tests, opens and merges PRs inside the safety envelope.',
    allowed: ['edit current branch', 'run gates', 'open/merge low-risk PRs', 'spawn depth-1 sub-agents'],
    forbidden: ['touch other repos', 'live API calls', 'auth/payment code', 'secrets'],
    spawnedBy: 'founder session',
    risk: 'medium',
  },
  {
    name: 'Training Scribe',
    status: 'standby',
    role: 'Captures every branch decision as future KUDBEECODEV0 training material — docs and spine entries, never model outputs.',
    allowed: ['write docs', 'update BUILD_LOG/spine notes'],
    forbidden: ['code edits', 'pushes', 'merges'],
    spawnedBy: 'Main Agent',
    risk: 'low',
  },
  {
    name: 'Safety Reviewer',
    status: 'standby',
    role: 'Checks every PR for secrets, scope creep, live-execution risk, API-key requirements, and production-sensitive changes.',
    allowed: ['read diffs', 'block a merge with findings'],
    forbidden: ['edits', 'pushes', 'merges'],
    spawnedBy: 'Main Agent',
    risk: 'low',
  },
  {
    name: 'Eval Runner',
    status: 'planned',
    role: 'Will drive the KUDBEECODEV0 / SCRIBE eval scoreboards once the Lightning read-only contract exists (Branch 09+).',
    allowed: ['read eval results (future, read-only)'],
    forbidden: ['launch GPU jobs', 'write to training repos'],
    spawnedBy: 'Main Agent',
    risk: 'medium',
  },
  {
    name: 'Memory Agent',
    status: 'planned',
    role: 'Will keep PROJECT_STATE / repo atlas / agent-state-tracker fresh so every session orients instantly.',
    allowed: ['read memory layers', 'propose spine updates'],
    forbidden: ['silent rewrites of beliefs/roadmap', 'deleting memory'],
    spawnedBy: 'Main Agent',
    risk: 'low',
  },
  {
    name: 'Future Integration Scout',
    status: 'standby',
    role: 'Read-only recon of GitHub, Lightning, hermes-lyric-server, SCRIBE, and memory integrations — notes only, N+1/N+2 branches ahead.',
    allowed: ['read anything in-repo', 'report likely files/risks/dependencies'],
    forbidden: ['edits of any kind', 'network calls', 'spawning agents'],
    spawnedBy: 'Main Agent',
    risk: 'low',
  },
];

// A believable mock trace of one depth-1 dispatch, so the panel shows how a
// run would read. Static data — nothing executed.
const MOCK_TRACE = [
  { at: 'T+0s', line: 'Main Agent: branch feat/tde-04-agent-map opened from origin/main' },
  { at: 'T+2s', line: 'Main Agent → Future Integration Scout: scout Branch 05/06 facts (read-only)' },
  { at: 'T+41s', line: 'Future Integration Scout: report returned — no changes made' },
  { at: 'T+42s', line: 'Safety Reviewer: diff scan clean (no secrets, no live calls)' },
  { at: 'T+55s', line: 'Main Agent: gates green, PR opened' },
];

export default function AgentMapPanel() {
  return (
    <section className={styles.wideSlot} data-tone="magenta" aria-label="Agent map panel">
      <div className={styles.slotHead}>
        <h2 className={styles.slotName}>Agents</h2>
        <span className={styles.suggestOnlyTag}>Org chart · nothing running</span>
      </div>

      <p className={styles.depthRule}>
        Sub-agent depth 1 only. Recursive spawning blocked.
      </p>

      <div className={styles.agentGrid}>
        {AGENTS.map((a) => (
          <article key={a.name} className={styles.agentCard} data-status={a.status}>
            <div className={styles.repoHead}>
              <h3 className={styles.repoName}>{a.name}</h3>
              <span className={styles.agentStatus} data-status={a.status}>
                {a.status}
              </span>
            </div>
            <p className={styles.repoRole}>{a.role}</p>
            <dl className={styles.repoFacts}>
              <div className={styles.repoFact}>
                <dt>Allowed</dt>
                <dd data-tone="good">{a.allowed.join(' · ')}</dd>
              </div>
              <div className={styles.repoFact}>
                <dt>Forbidden</dt>
                <dd data-tone="bad">{a.forbidden.join(' · ')}</dd>
              </div>
              <div className={styles.agentMetaRow}>
                <div className={styles.repoFact}>
                  <dt>spawned_by</dt>
                  <dd>
                    <code>{a.spawnedBy}</code>
                  </dd>
                </div>
                <div className={styles.repoFact}>
                  <dt>Risk</dt>
                  <dd>
                    <span className={styles.riskBadge} data-risk={a.risk}>
                      {a.risk}
                    </span>
                  </dd>
                </div>
              </div>
            </dl>
          </article>
        ))}
      </div>

      <div className={styles.traceBox}>
        <h3 className={styles.traceTitle}>Mock agent trace — how one dispatch reads</h3>
        <ol className={styles.traceList}>
          {MOCK_TRACE.map((t) => (
            <li key={t.at} className={styles.traceLine}>
              <span className={styles.traceAt}>{t.at}</span>
              <span>{t.line}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
