'use client';

import { useEffect, useState } from 'react';
import { loadMissions, saveMissions } from './tdeStorage';
import styles from './tde.module.css';

// TDE Mission panel — Branch 02 (docs/kudbee-tde-roadmap.md). Suggest-only:
// submitting a mission appends a mock card and (since Branch 10) persists the
// queue to the visitor's own localStorage via tdeStorage.ts. No network, no
// execution — the saved cards are suggestions, never commands.

export const MISSION_TYPES = [
  'Code',
  'SCRIBE',
  'Training',
  'GPU Eval',
  'Memory',
  'GitHub PR',
  'Visual/Creative',
] as const;

export type MissionType = (typeof MISSION_TYPES)[number];

export interface MockMission {
  id: number;
  type: MissionType;
  text: string;
  status: 'queued (mock)' | 'suggested';
  note: string;
}

// Pre-seeded history so the queue reads real on first paint — all mock.
const SEED_MISSIONS: MockMission[] = [
  {
    id: 3,
    type: 'Training',
    text: 'Prepare the next SCRIBE training-row drop from the golden + synthetic songs.',
    status: 'queued (mock)',
    note: 'Would route to: Lightning RTX 6000 lane · approval required',
  },
  {
    id: 2,
    type: 'GPU Eval',
    text: 'Score the KUDBEECODEV0-MINI eval set and refresh the pass-rate board.',
    status: 'queued (mock)',
    note: 'Would route to: Lightning T4 lane · approval required',
  },
  {
    id: 1,
    type: 'GitHub PR',
    text: 'Draft the branch ledger audit summary for the open TDE branches.',
    status: 'queued (mock)',
    note: 'Would route to: read-only GitHub contract (Branch 09) · no writes',
  },
];

export default function MissionPanel() {
  const [missionText, setMissionText] = useState('');
  const [missionType, setMissionType] = useState<MissionType>('Code');
  const [missions, setMissions] = useState<MockMission[]>(SEED_MISSIONS);

  // Hydration-safe restore: first paint always shows the seeds (matches the
  // prerendered HTML), then the visitor's saved queue loads in an effect.
  useEffect(() => {
    const stored = loadMissions();
    if (stored && stored.length > 0) setMissions(stored);
  }, []);

  const submit = () => {
    const text = missionText.trim();
    if (!text) return;
    setMissions((prev) => {
      const next: MockMission[] = [
        {
          id: (prev[0]?.id ?? 0) + 1,
          type: missionType,
          text,
          status: 'suggested' as const,
          note: 'Suggest-only — recorded in this browser, executed nowhere.',
        },
        ...prev,
      ];
      saveMissions(next);
      return next;
    });
    setMissionText('');
  };

  return (
    <section className={styles.missionPanel} data-tone="cyan" aria-label="Mission panel">
      <div className={styles.slotHead}>
        <h2 className={styles.slotName}>Mission</h2>
        <span className={styles.suggestOnlyTag}>Suggest-only · no execution</span>
      </div>

      <div className={styles.missionForm}>
        <textarea
          className={styles.missionInput}
          value={missionText}
          onChange={(e) => setMissionText(e.target.value)}
          placeholder="Describe a mission for the Kudbee agents… (it will only be suggested, never run)"
          rows={3}
          maxLength={500}
        />
        <div className={styles.missionControls}>
          <div className={styles.typeRow} role="radiogroup" aria-label="Mission type">
            {MISSION_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={missionType === t}
                className={styles.typeChip}
                data-selected={missionType === t || undefined}
                onClick={() => setMissionType(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.missionSubmit}
            onClick={submit}
            disabled={!missionText.trim()}
          >
            Suggest mission
          </button>
        </div>
      </div>

      <ol className={styles.missionList} aria-label="Mission queue (mock)">
        {missions.map((m) => (
          <li key={m.id} className={styles.missionCard}>
            <div className={styles.missionCardHead}>
              <span className={styles.missionType}>{m.type}</span>
              <span className={styles.missionStatus} data-live={m.status === 'suggested' || undefined}>
                {m.status}
              </span>
            </div>
            <p className={styles.missionText}>{m.text}</p>
            <p className={styles.missionNote}>{m.note}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
