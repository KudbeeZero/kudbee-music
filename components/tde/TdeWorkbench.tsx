'use client';

import Link from 'next/link';
import MemoryTrainingPanel from './MemoryTrainingPanel';
import SafetyGatePanel from './SafetyGatePanel';
import MissionPanel from './MissionPanel';
import ModelGpuPanel from './ModelGpuPanel';
import ModelRouterPanel from './ModelRouterPanel';
import AgentMapPanel from './AgentMapPanel';
import RepoPanel from './RepoPanel';
import TrainingProgressPanel from './TrainingProgressPanel';
import styles from './tde.module.css';

// The Kudbee TDE (Task-Driven Environment) shell — Branch 01 of the TDE track
// (docs/kudbee-tde-roadmap.md). A window, not a lever: every panel renders mock
// state only; the live-execution gate in the roadmap defines what must exist
// before any panel gets a real button. All five panels are live (Branches 02-06).

export default function TdeWorkbench() {
  return (
    <main className={styles.wrap}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Kudbee TDE</h1>
          <p className={styles.subtitle}>
            HERMES Workbench / Task-Driven Environment ·{' '}
            <Link href="/hermes" className={styles.backLink}>← Hit Factory</Link>
          </p>
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
        <TrainingProgressPanel />
        <RepoPanel />
        <AgentMapPanel />
        <ModelGpuPanel />
        <MemoryTrainingPanel />
        <SafetyGatePanel />
        <ModelRouterPanel />
      </section>
    </main>
  );
}
