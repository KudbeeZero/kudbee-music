'use client';

import MissionPanel from './MissionPanel';
import RepoPanel from './RepoPanel';
import styles from './tde.module.css';

// The Kudbee TDE (Task-Driven Environment) shell — Branch 01 of the TDE track
// (docs/kudbee-tde-roadmap.md). A window, not a lever: every panel renders mock
// state only; the live-execution gate in the roadmap defines what must exist
// before any panel gets a real button. Panels land one branch at a time.
const PANELS = [
  {
    key: 'agents',
    name: 'Agents',
    tone: 'magenta',
    arrives: 'Branch 04',
    blurb:
      'Main Agent + sub-agent roster: allowed and forbidden actions, spawned_by, risk level. Sub-agent depth 1 only — recursive spawning blocked.',
  },
  {
    key: 'models',
    name: 'Models / GPU',
    tone: 'amber',
    arrives: 'Branch 05',
    blurb:
      'Model router cards (KUDBEECODEV0, KUDBEESCRIBEV1, KUDBEEV1, HERMES…), T4 vs RTX 6000 lanes, mock GPU job queue.',
  },
  {
    key: 'memory',
    name: 'Memory / Training',
    tone: 'good',
    arrives: 'Branch 06',
    blurb:
      'Project state files, training row count, eval pass rate, drop queue, next GPU action — seeded from real project facts, marked mock.',
  },
] as const;

export default function TdeWorkbench() {
  return (
    <main className={styles.wrap}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Kudbee TDE</h1>
          <p className={styles.subtitle}>HERMES Workbench / Task-Driven Environment</p>
        </div>
        <span className={styles.statusBadge}>Suggest-only prototype</span>
      </header>

      <p className={styles.safetyNote}>
        <span className={styles.safetyDot} aria-hidden />
        <span>
          No live execution yet — every panel below renders mock, read-only state.
          No APIs are called, no keys are required, no agents run. The live-execution
          gate is documented in <code>docs/kudbee-tde-roadmap.md</code>.
        </span>
      </p>

      <section className={styles.grid} aria-label="Workbench panels">
        <MissionPanel />
        <RepoPanel />
        {PANELS.map((p) => (
          <article key={p.key} className={styles.slot} data-tone={p.tone}>
            <div className={styles.slotHead}>
              <h2 className={styles.slotName}>{p.name}</h2>
              <span className={styles.slotArrives}>{p.arrives}</span>
            </div>
            <p className={styles.slotBlurb}>{p.blurb}</p>
            <p className={styles.slotEmpty}>Panel not built yet — reserved slot.</p>
          </article>
        ))}
      </section>
    </main>
  );
}
