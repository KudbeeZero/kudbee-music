'use client';

import { useState } from 'react';
import { TDE_ROUTE_RULES, routeTask, type TdeTaskType } from './modelRouter';
import styles from './tde.module.css';

// TDE Model Router panel — Branch 08 (docs/kudbee-tde-roadmap.md). Renders the
// typed routing policy from modelRouter.ts and lets you probe it: pick a task
// type, see the recommendation. The lookup is a pure function over static
// data — no model is called, nothing executes.

export default function ModelRouterPanel() {
  const [probe, setProbe] = useState<TdeTaskType>('coding');
  const picked = routeTask(probe);

  return (
    <section className={styles.wideSlot} data-tone="cyan" aria-label="Model router panel">
      <div className={styles.slotHead}>
        <h2 className={styles.slotName}>Model Router</h2>
        <span className={styles.suggestOnlyTag}>Typed policy · pure lookup, no calls</span>
      </div>

      <div className={styles.routerProbe}>
        <label className={styles.routerProbeLabel} htmlFor="tde-router-probe">
          Probe the policy
        </label>
        <select
          id="tde-router-probe"
          className={styles.routerSelect}
          value={probe}
          onChange={(e) => setProbe(e.target.value as TdeTaskType)}
        >
          {TDE_ROUTE_RULES.map((r) => (
            <option key={r.task} value={r.task}>
              {r.label}
            </option>
          ))}
        </select>
        <p className={styles.routerAnswer}>
          → <strong>{picked.routeTo}</strong> · {picked.reason}{' '}
          <span className={styles.riskBadge} data-risk={picked.risk}>
            {picked.risk}
          </span>{' '}
          {picked.approvalRequired ? (
            <span className={styles.approvalTag}>founder approval required</span>
          ) : (
            <span className={styles.autoTag}>auto-allowed</span>
          )}
        </p>
      </div>

      <div className={styles.routerTable} role="table" aria-label="Routing rules">
        <div className={styles.routerHead} role="row">
          <span role="columnheader">Task</span>
          <span role="columnheader">Routed to</span>
          <span role="columnheader">Why</span>
          <span role="columnheader">Risk</span>
          <span role="columnheader">Approval</span>
        </div>
        {TDE_ROUTE_RULES.map((r) => (
          <div key={r.task} className={styles.routerRow} role="row" data-active={r.task === probe || undefined}>
            <span role="cell" className={styles.routerTask}>{r.label}</span>
            <span role="cell" className={styles.routerTo}>{r.routeTo}</span>
            <span role="cell" className={styles.routerWhy}>{r.reason}</span>
            <span role="cell">
              <span className={styles.riskBadge} data-risk={r.risk}>{r.risk}</span>
            </span>
            <span role="cell">
              {r.approvalRequired ? (
                <span className={styles.approvalTag}>required</span>
              ) : (
                <span className={styles.autoTag}>auto</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
