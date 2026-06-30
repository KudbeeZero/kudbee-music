'use client';

import type { SongPackage } from '@/lib/hermes/types';
import styles from './hermes.module.css';

export default function VaultDrawer({
  songs,
  onOpen,
  onClose,
  onDelete,
}: {
  songs: SongPackage[];
  onOpen: (id: string) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className={styles.drawerWrap}>
      <div className={styles.scrim} onClick={onClose} />
      <div className={styles.drawer} role="dialog" aria-label="Song vault">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div className={styles.panelTitle} style={{ marginBottom: 0 }}>Vault · {songs.length}</div>
          <button className={styles.ghostBtn} onClick={onClose}>Close</button>
        </div>

        {songs.length === 0 ? (
          <div className={styles.emptyState}>No saved songs yet.<br />Generate a package and it lands here.</div>
        ) : (
          songs.map((s) => (
            <div key={s.id} className={styles.vaultItem} onClick={() => onOpen(s.id)}>
              <div className={styles.vaultTitle}>
                <span>{s.title}</span>
                <span className={styles.ver}>v{s.version}</span>
              </div>
              <div className={styles.vaultMeta}>
                {new Date(s.createdAt).toLocaleString()} · score {s.score.total} · unique {s.uniqueness.score}
              </div>
              <button
                className={styles.copyBtn}
                style={{ marginLeft: 0, marginTop: 6 }}
                onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
              >
                delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
