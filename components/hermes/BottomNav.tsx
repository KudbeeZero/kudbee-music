'use client';

import styles from './hermes.module.css';

// Suno-reference idea (2026-07-03): a persistent bottom nav so the Council — and every
// other major panel — is one tap away regardless of scroll position or Studio Flow
// stage, matching the app's existing device-adaptation intent (`device.ui.singleColumn`
// / `bottomSheets` in lib/hermes/device.ts, computed since the mobile pass but never
// wired to real UI until now). Phone-only; desktop already shows everything side by side.
const ITEMS = [
  { key: 'lab', icon: '🧪', label: 'Lab', always: true },
  { key: 'council', icon: '⚖️', label: 'Council', always: false },
  { key: 'studio', icon: '🎚️', label: 'Studio', always: false },
  { key: 'package', icon: '📦', label: 'Package', always: false },
  { key: 'vault', icon: '🎒', label: 'Vault', always: true },
] as const;

export default function BottomNav({ visible, hasPkg, active, onLab, onCouncil, onStudio, onPackage, onVault }: {
  visible: boolean;
  hasPkg: boolean;
  /** Current-view key, so the dock reads as real navigation (matching the mockup's Dock
   * Button) rather than a row of one-shot triggers. Optional — callers that don't track a
   * "current view" concept can omit it and every item stays in its resting state. */
  active?: (typeof ITEMS)[number]['key'];
  onLab: () => void;
  onCouncil: () => void;
  onStudio: () => void;
  onPackage: () => void;
  onVault: () => void;
}) {
  if (!visible) return null;
  const handlers: Record<(typeof ITEMS)[number]['key'], () => void> = {
    lab: onLab, council: onCouncil, studio: onStudio, package: onPackage, vault: onVault,
  };
  return (
    <nav className={styles.bottomNav} aria-label="Quick jump">
      {ITEMS.map((it) => {
        const enabled = it.always || hasPkg;
        return (
          <button
            key={it.key}
            className={styles.bottomNavItem}
            data-active={it.key === active || undefined}
            disabled={!enabled}
            onClick={handlers[it.key]}
            aria-label={it.label}
            aria-current={it.key === active ? 'page' : undefined}
            title={enabled ? it.label : `${it.label} — generate a song first`}
          >
            <span aria-hidden="true">{it.icon}</span>
            <span>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
