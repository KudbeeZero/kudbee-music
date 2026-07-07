'use client';

import type { ReactNode } from 'react';
import styles from './hermes.module.css';

// Shared shape for every bring-your-own-key unlock slot in the app (the Rack's
// Claude/Lightning engines, and Your Agent's early-access Claude entry point —
// same flow, deliberately duplicated for reach, previously duplicated in JSX
// too. This is the one place that JSX lives now, so every slot stays in sync.
export interface UnlockField {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}

export interface KeyUnlockRowProps {
  promptLabel: string;
  locked: boolean;
  editing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUnlock: () => void;
  unlockDisabled: boolean;
  fields: UnlockField[];
  configuredContent: ReactNode;
}

export default function KeyUnlockRow({
  promptLabel, locked, editing, onStartEdit, onCancelEdit, onUnlock, unlockDisabled, fields, configuredContent,
}: KeyUnlockRowProps) {
  if (!locked) return <>{configuredContent}</>;

  if (!editing) {
    return (
      <button className={styles.ghostBtn} style={{ marginTop: 6 }} onClick={onStartEdit}>
        {promptLabel}
      </button>
    );
  }

  return (
    <div style={{ marginTop: 6, display: 'flex', flexDirection: fields.length > 1 ? 'column' : 'row', gap: 6, flexWrap: 'wrap' }}>
      {fields.map((f, i) => (
        <input
          key={i}
          type={f.type ?? 'text'}
          autoComplete="off"
          className={styles.input}
          placeholder={f.placeholder}
          value={f.value}
          onChange={(e) => f.onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onUnlock(); }}
          style={{ flex: fields.length > 1 ? undefined : 1, minWidth: fields.length > 1 ? undefined : 160, width: fields.length > 1 ? '100%' : undefined }}
          aria-label={f.placeholder}
        />
      ))}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className={styles.ghostBtn} onClick={onUnlock} disabled={unlockDisabled}>Unlock</button>
        <button className={styles.ghostBtn} onClick={onCancelEdit}>Cancel</button>
      </div>
    </div>
  );
}
