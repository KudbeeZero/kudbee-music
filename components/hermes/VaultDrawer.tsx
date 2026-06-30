'use client';

import { useRef } from 'react';
import type { SongPackage } from '@/lib/hermes/types';
import { exportVault, importVault } from '@/lib/hermes/storage';
import styles from './hermes.module.css';

export default function VaultDrawer({
  songs,
  onOpen,
  onClose,
  onDelete,
  onImported,
}: {
  songs: SongPackage[];
  onOpen: (id: string) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
  onImported?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function doExport() {
    const blob = new Blob([exportVault()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'hermes-vault.json'; a.click();
    URL.revokeObjectURL(url);
  }
  function doImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((txt) => { importVault(txt, 'merge'); onImported?.(); }).catch(() => {});
    e.target.value = '';
  }

  return (
    <div className={styles.drawerWrap}>
      <div className={styles.scrim} onClick={onClose} />
      <div className={styles.drawer} role="dialog" aria-label="Song vault">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div className={styles.panelTitle} style={{ marginBottom: 0 }}>Vault · {songs.length}</div>
          <button className={styles.ghostBtn} onClick={onClose}>Close</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button className={styles.copyBtn} style={{ marginLeft: 0 }} onClick={doExport}>⬇ Export vault</button>
          <button className={styles.copyBtn} style={{ marginLeft: 0 }} onClick={() => fileRef.current?.click()}>⬆ Import</button>
          <input ref={fileRef} type="file" accept="application/json" onChange={doImport} style={{ display: 'none' }} />
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
