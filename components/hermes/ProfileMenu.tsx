'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './hermes.module.css';
import authStyles from '../auth/auth.module.css';
import type { Profile } from '@/lib/hermes/identity';

// Header-overcrowding fix, phases 2-5 (brain/uiDesignLanguage.json
// knownGapsBacklog["header-overcrowding"]). The profile chip becomes the single
// trigger for everything that isn't the one primary header action (✨ New):
// Agent, Lyric Lab, Crossroads, TDE, Albums, and — separated by a divider,
// deliberately de-emphasized rather than hidden — Sign out. Reuses the existing
// drawerWrap/scrim/drawer bottom-sheet convention (VaultDrawer.tsx) so it becomes
// a real bottom sheet on phone for free, same as every other overlay in the app.
export default function ProfileMenu({
  profile,
  albumCount,
  onClose,
  onAgent,
  onLyricLab,
  onAlbums,
  onSignOut,
}: {
  profile: Profile;
  albumCount: number;
  onClose: () => void;
  onAgent: () => void;
  onLyricLab: () => void;
  onAlbums: () => void;
  onSignOut: () => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, [onClose]);

  return (
    <div className={styles.drawerWrap}>
      <div className={styles.scrim} onClick={onClose} />
      <div className={styles.drawer} role="dialog" aria-label="Account menu">
        <div className={styles.menuHead}>
          <span className={authStyles.profileChip}>
            {profile.name}
            {profile.kind === 'dev' && <span className={authStyles.devBadge}>dev</span>}
          </span>
          <button className={styles.ghostBtn} onClick={onClose} aria-label="Close menu">✕</button>
        </div>

        <nav className={styles.menuList} aria-label="Account and navigation">
          <button
            className={styles.menuItem}
            onClick={() => { onAgent(); onClose(); }}
            title="Your Agent — your Claude key, your brain, install to your phone"
          >
            🚀 Agent
          </button>
          <button className={styles.menuItem} onClick={() => { onLyricLab(); onClose(); }}>
            ✍️ Lyric Lab
          </button>
          <Link
            href="/crossroads"
            className={styles.menuItem}
            data-active={pathname === '/crossroads' || undefined}
            onClick={onClose}
          >
            🧭 Crossroads
          </Link>
          <Link
            href="/tde"
            className={styles.menuItem}
            data-active={pathname === '/tde' || undefined}
            onClick={onClose}
            title="Kudbee TDE — the agent workbench (suggest-only prototype)"
          >
            🛰️ TDE
          </Link>
          <button className={styles.menuItem} onClick={() => { onAlbums(); onClose(); }}>
            📀 Albums <span className={styles.menuCount}>{albumCount}</span>
          </button>
        </nav>

        <div className={styles.menuDivider} />

        <button
          className={styles.menuItem}
          data-tone="danger"
          onClick={() => { onSignOut(); onClose(); }}
          title="Sign out — your vault stays on this device"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
