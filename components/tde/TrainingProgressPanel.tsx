'use client';

import styles from './tde.module.css';
import { familyTrainingProgress, GATE_STAGES, CONFIRM_RUNS, budgetPhases, staleModels, BudgetPhase } from '@/lib/hermes/modelFamily';

// TDE Training Progress dashboard — the cockpit's view into how much each KUDBEE
// model has been trained. Slice 1: gate progress + training volume + eval quality.
// Dashboard: gate-progress track (7-step), training-volume bar chart (sequential hue),
// eval-quality gauge (with unconfirmed badge). Plain HTML/SVG, no new deps. Validated
// palette (--cyan, --amber used sequentially for data, not as categorical series).

const data = familyTrainingProgress();

// Filter out the teacher (SIDECAR) for the main dashboard; it's not trained.
const trainedModels = data.filter((m) => m.family !== 'SIDECAR');

// Palette: sequential hue for training volume (cyan → darker cyan via opacity/saturation).
// Single-hue ramp: cyan at full intensity decreases as rows decrease, never a second hue.
const SEQUENTIAL_RAMPS = {
  dark: ['#0a3f3a', '#1a6b63', '#2a978c', '#36e0d4', '#5ff0e0'],
  light: ['#1a3a37', '#2a6963', '#3a9d8d', '#36e0d4', '#5ff0e0'],
};

// Status colors (locked palette): good, warn, bad. Reserved, never reused for series.
const STATUS_COLORS = {
  good: 'var(--good)',
  warn: 'var(--warn)',
  bad: 'var(--bad)',
};

function getGateColor(cleared: boolean): string {
  return cleared ? 'var(--good)' : 'var(--line-strong)';
}

function getSequentialColor(ratio: number): string {
  // Map ratio (0–1) to a cyan ramp step; higher ratio = brighter.
  const darkMode = true; // Always use dark mode in this TDE context.
  const ramp = darkMode ? SEQUENTIAL_RAMPS.dark : SEQUENTIAL_RAMPS.light;
  const idx = Math.floor(ratio * (ramp.length - 1));
  return ramp[Math.max(0, Math.min(ramp.length - 1, idx))];
}

export default function TrainingProgressPanel() {
  const maxRows = Math.max(...trainedModels.map((m) => m.datasetRows || 0), 1);

  return (
    <section className={styles.wideSlot} data-tone="cyan" aria-label="Training progress dashboard">
      <div className={styles.slotHead}>
        <h2 className={styles.slotName}>Training Progress</h2>
        <span className={styles.suggestOnlyTag}>Live catalog view</span>
      </div>

      {/* Section 1: GATE PROGRESS — 7-step track per model */}
      <div className={styles.dashboardSection}>
        <h3 className={styles.sectionTitle}>Gate Progress (G0→G6)</h3>
        <div className={styles.gateProgressList}>
          {trainedModels.map((m) => (
            <div key={m.id} className={styles.gateRow}>
              <div className={styles.gateLabel}>
                <span className={styles.modelId}>{m.id}</span>
              </div>
              <div className={styles.gateTrack} role="progressbar" aria-label={`${m.id} gate progress`}>
                <svg
                  width="100%"
                  height="24"
                  viewBox={`0 0 ${GATE_STAGES.length * 16 + 8} 24`}
                  className={styles.gateSvg}
                >
                  {GATE_STAGES.map((stage, idx) => {
                    const x = idx * 16 + 4;
                    const isCleared = idx < m.gateIndex;
                    const isCurrent = idx === m.gateIndex;
                    const color = isCleared || isCurrent ? 'var(--good)' : 'var(--line)';
                    return (
                      <g key={stage}>
                        {/* Gate step circle */}
                        <circle
                          cx={x + 8}
                          cy="12"
                          r={isCurrent ? '6' : '4'}
                          fill={color}
                          opacity={isCleared ? 1 : 0.4}
                        />
                        {/* Connecting line to next stage */}
                        {idx < GATE_STAGES.length - 1 && (
                          <line
                            x1={x + 12}
                            y1="12"
                            x2={x + 16}
                            y2="12"
                            stroke={color}
                            strokeWidth="1"
                            opacity={isCleared ? 1 : 0.4}
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
              <div className={styles.gatePercent}>{m.gatePercent}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: TRAINING VOLUME — bar chart of datasetRows (sequential hue) */}
      <div className={styles.dashboardSection}>
        <h3 className={styles.sectionTitle}>Training Volume</h3>
        <div className={styles.volumeChart}>
          <svg
            width="100%"
            height={Math.max(trainedModels.length * 32 + 40, 200)}
            viewBox={`0 0 400 ${Math.max(trainedModels.length * 32 + 40, 200)}`}
            className={styles.volumeSvg}
          >
            {/* Axis labels + grid */}
            {trainedModels.map((m, idx) => {
              const y = 40 + idx * 32 + 12;
              return (
                <g key={`label-${m.id}`}>
                  <text x="0" y={y} fontSize="11" fill="var(--ink-dim)" textAnchor="start">
                    {m.id}
                  </text>
                </g>
              );
            })}

            {/* Bar chart */}
            {trainedModels.map((m, idx) => {
              const rows = m.datasetRows ?? 0;
              const ratio = rows / maxRows;
              const color = getSequentialColor(ratio);
              const barWidth = Math.max(ratio * 300, 4); // Min width so empty bars are visible
              const y = 40 + idx * 32;
              return (
                <g key={`bar-${m.id}`}>
                  {/* Bar fill */}
                  <rect
                    x="60"
                    y={y}
                    width={barWidth}
                    height="20"
                    fill={color}
                    rx="4"
                    ry="4"
                  />
                  {/* Value label */}
                  <text
                    x={65 + Math.max(barWidth, 0)}
                    y={y + 14}
                    fontSize="12"
                    fill="var(--ink)"
                    textAnchor="start"
                  >
                    {rows} rows
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Section 3: EVAL QUALITY — pass rate gauge + unconfirmed badge */}
      <div className={styles.dashboardSection}>
        <h3 className={styles.sectionTitle}>Eval Quality</h3>
        <div className={styles.evalGrid}>
          {trainedModels.map((m) => {
            const passRate = m.evalPassRate;
            const runs = m.evalRuns;
            const isConfirmed = m.evalConfirmed;
            const numConfirmed = runs >= CONFIRM_RUNS ? runs : 0;
            const numUnconfirmed = runs < CONFIRM_RUNS ? runs : 0;

            return (
              <div key={m.id} className={styles.evalCard}>
                <div className={styles.evalCardHead}>
                  <span className={styles.evalModelId}>{m.id}</span>
                </div>

                {/* Pass rate gauge */}
                {passRate !== null ? (
                  <div className={styles.evalGauge}>
                    <svg width="100%" height="60" viewBox="0 0 100 60" className={styles.gaugeSvg}>
                      {/* Background arc */}
                      <path
                        d="M 20 50 A 30 30 0 0 1 80 50"
                        stroke="var(--line-strong)"
                        strokeWidth="2"
                        fill="none"
                      />
                      {/* Filled arc */}
                      <path
                        d={`M 20 50 A 30 30 0 0 1 ${20 + (passRate / 100) * 60} 50`}
                        stroke={passRate >= 0.8 ? STATUS_COLORS.good : passRate >= 0.5 ? STATUS_COLORS.warn : STATUS_COLORS.bad}
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                      />
                      {/* Value text */}
                      <text x="50" y="40" fontSize="14" fontWeight="700" fill="var(--ink)" textAnchor="middle">
                        {Math.round(passRate * 100)}%
                      </text>
                    </svg>
                  </div>
                ) : (
                  <div className={styles.evalEmpty}>
                    <span className={styles.evalEmptyText}>Never evaluated</span>
                  </div>
                )}

                {/* Unconfirmed badge */}
                {runs > 0 && !isConfirmed && numUnconfirmed > 0 && (
                  <div className={styles.evalBadge} data-status="warn">
                    <span className={styles.badgeIcon}>⚠</span>
                    <span className={styles.badgeText}>
                      {numUnconfirmed}/{CONFIRM_RUNS} unconfirmed
                    </span>
                  </div>
                )}
                {runs > 0 && isConfirmed && (
                  <div className={styles.evalBadge} data-status="good">
                    <span className={styles.badgeIcon}>✓</span>
                    <span className={styles.badgeText}>{runs} confirmed</span>
                  </div>
                )}

                {/* Val loss (if available) */}
                {m.valLoss !== null && (
                  <div className={styles.evalMeta}>
                    <span className={styles.metaLabel}>Val loss:</span>
                    <span className={styles.metaValue}>{m.valLoss.toFixed(3)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 4: BUDGET — GPU-hours and $ spent vs cap */}
      <div className={styles.dashboardSection}>
        <h3 className={styles.sectionTitle}>Budget Utilization</h3>
        <p className={styles.sectionNote}>Per-phase GPU hours and USD spent vs caps</p>
        <div className={styles.budgetGrid}>
          {budgetPhases()
            .filter((p: BudgetPhase) => p.gpuHoursCap > 0 || p.usdCap > 0) // Hide zero-cap phases (SIDECAR)
            .map((phase: BudgetPhase) => {
                const gpuRatio = phase.gpuHoursCap > 0 ? phase.spentGpuHours / phase.gpuHoursCap : 0;
                const usdRatio = phase.usdCap > 0 ? phase.spentUsd / phase.usdCap : 0;
                const gpuStatus = gpuRatio >= 1 ? 'bad' : gpuRatio >= 0.8 ? 'warn' : 'good';
                const usdStatus = usdRatio >= 1 ? 'bad' : usdRatio >= 0.8 ? 'warn' : 'good';
                return (
                  <div key={phase.id} className={styles.budgetPhase}>
                    <h4 className={styles.phaseTitle}>{phase.id}</h4>
                    <p className={styles.phaseNote}>{phase.covers}</p>

                    {/* GPU Hours gauge */}
                    {phase.gpuHoursCap > 0 && (
                      <div className={styles.budgetLine}>
                        <span className={styles.budgetLabel}>GPU Hours</span>
                        <div className={styles.gaugeContainer}>
                          <svg
                            width="100%"
                            height="20"
                            viewBox="0 0 200 20"
                            className={styles.budgetGaugeSvg}
                          >
                            {/* Background */}
                            <rect
                              x="0"
                              y="4"
                              width="200"
                              height="12"
                              fill="var(--line-strong)"
                              rx="6"
                              ry="6"
                            />
                            {/* Filled bar */}
                            <rect
                              x="0"
                              y="4"
                              width={Math.min(200, (gpuRatio * 200))}
                              height="12"
                              fill={
                                gpuStatus === 'bad'
                                  ? 'var(--bad)'
                                  : gpuStatus === 'warn'
                                    ? 'var(--warn)'
                                    : 'var(--good)'
                              }
                              rx="6"
                              ry="6"
                            />
                          </svg>
                        </div>
                        <span
                          className={styles.budgetValue}
                          style={{
                            color:
                              gpuStatus === 'bad'
                                ? 'var(--bad)'
                                : gpuStatus === 'warn'
                                  ? 'var(--warn)'
                                  : 'var(--good)',
                          }}
                        >
                          {phase.spentGpuHours.toFixed(1)} / {phase.gpuHoursCap}h
                        </span>
                      </div>
                    )}

                    {/* USD gauge */}
                    {phase.usdCap > 0 && (
                      <div className={styles.budgetLine}>
                        <span className={styles.budgetLabel}>USD</span>
                        <div className={styles.gaugeContainer}>
                          <svg
                            width="100%"
                            height="20"
                            viewBox="0 0 200 20"
                            className={styles.budgetGaugeSvg}
                          >
                            {/* Background */}
                            <rect
                              x="0"
                              y="4"
                              width="200"
                              height="12"
                              fill="var(--line-strong)"
                              rx="6"
                              ry="6"
                            />
                            {/* Filled bar */}
                            <rect
                              x="0"
                              y="4"
                              width={Math.min(200, (usdRatio * 200))}
                              height="12"
                              fill={
                                usdStatus === 'bad'
                                  ? 'var(--bad)'
                                  : usdStatus === 'warn'
                                    ? 'var(--warn)'
                                    : 'var(--good)'
                              }
                              rx="6"
                              ry="6"
                            />
                          </svg>
                        </div>
                        <span
                          className={styles.budgetValue}
                          style={{
                            color:
                              usdStatus === 'bad'
                                ? 'var(--bad)'
                                : usdStatus === 'warn'
                                  ? 'var(--warn)'
                                  : 'var(--good)',
                          }}
                        >
                          ${phase.spentUsd} / ${phase.usdCap}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
        </div>
      </div>

      {/* Section 5: ITERATIONS — activity bar per model */}
      <div className={styles.dashboardSection}>
        <h3 className={styles.sectionTitle}>Training Activity (Decision Depth)</h3>
        <p className={styles.sectionNote}>Number of logged decisions per model</p>
        <div className={styles.iterationsList}>
          {trainedModels.map((m) => {
            const maxIterations = Math.max(...trainedModels.map((x) => x.iterations), 1);
            const ratio = m.iterations / maxIterations;
            return (
              <div key={m.id} className={styles.iterationRow}>
                <span className={styles.iterModelId}>{m.id}</span>
                <div className={styles.iterationBar}>
                  <div
                    className={styles.iterationFill}
                    style={{
                      width: `${ratio * 100}%`,
                      backgroundColor: ratio > 0.6 ? 'var(--good)' : ratio > 0.3 ? 'var(--cyan)' : 'var(--line-strong)',
                    }}
                  />
                </div>
                <span className={styles.iterationCount}>{m.iterations}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 6: ROSTER — summary stat row */}
      <div className={styles.dashboardSection}>
        <h3 className={styles.sectionTitle}>Model Family Roster</h3>
        <div className={styles.rosterRow}>
          {(() => {
            const byStatus: Record<string, number> = {};
            let served = 0;
            let totalRows = 0;
            const staleCount = staleModels('2026-07-07').length; // Use current date

            for (const m of trainedModels) {
              byStatus[m.status] = (byStatus[m.status] || 0) + 1;
              if (m.served) served++;
              if (m.datasetRows) totalRows += m.datasetRows;
            }

            return [
              { label: 'Total Models', value: trainedModels.length, icon: '📊' },
              { label: 'Trained', value: Object.keys(byStatus).length, icon: '✓' },
              { label: 'Served', value: served, icon: '🚀' },
              { label: 'Stale', value: staleCount, icon: '⏸️' },
              { label: 'Total Training Rows', value: totalRows, icon: '📈' },
            ].map((stat, idx) => (
              <div key={idx} className={styles.rosterStat}>
                <span className={styles.rosterIcon}>{stat.icon}</span>
                <div className={styles.rosterValue}>{stat.value}</div>
                <div className={styles.rosterLabel}>{stat.label}</div>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Table fallback view */}
      <details className={styles.tableViewToggle}>
        <summary className={styles.tableViewSummary}>Table view</summary>
        <div className={styles.tableViewContainer}>
          <table className={styles.dashboardTable}>
            <thead>
              <tr>
                <th>Model</th>
                <th>Family</th>
                <th>Status</th>
                <th>Gate Stage</th>
                <th>Gate %</th>
                <th>Rows</th>
                <th>Val Loss</th>
                <th>Eval Runs</th>
                <th>Pass Rate</th>
                <th>Confirmed</th>
                <th>Served</th>
              </tr>
            </thead>
            <tbody>
              {trainedModels.map((m) => (
                <tr key={m.id}>
                  <td>{m.id}</td>
                  <td>{m.family}</td>
                  <td>{m.status}</td>
                  <td>{m.gateStage ?? '—'}</td>
                  <td>{m.gatePercent}%</td>
                  <td>{m.datasetRows ?? '—'}</td>
                  <td>{m.valLoss !== null ? m.valLoss.toFixed(3) : '—'}</td>
                  <td>{m.evalRuns}</td>
                  <td>{m.evalPassRate !== null ? `${Math.round(m.evalPassRate * 100)}%` : '—'}</td>
                  <td>{m.evalConfirmed ? 'Yes' : 'No'}</td>
                  <td>{m.served ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
