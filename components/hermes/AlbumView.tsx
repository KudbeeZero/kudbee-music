'use client';

import { useMemo, useState } from 'react';
import type { SongPackage } from '@/lib/hermes/types';
import { buildAlbum, albumGaps, suggestSequence, type Album } from '@/lib/hermes/album';
import { albumSunoExport } from '@/lib/hermes/suno';
import styles from './hermes.module.css';

export default function AlbumView({
  songs,
  albums,
  onClose,
  onSave,
  onDelete,
}: {
  songs: SongPackage[];
  albums: Album[];
  onClose: () => void;
  onSave: (album: Album) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const byId = useMemo(() => new Map(songs.map((s) => [s.id, s])), [songs]);

  function toggle(id: string) {
    setPicked((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function create() {
    const chosen = songs.filter((s) => picked.has(s.id));
    if (!chosen.length) return;
    const album = buildAlbum(title.trim() || 'Untitled Album', chosen);
    onSave(album);
    setTitle(''); setPicked(new Set()); setOpenId(album.id);
  }
  function copyExport(album: Album) {
    const text = albumSunoExport(album, songs);
    navigator.clipboard?.writeText(text).then(() => { setCopied(album.id); setTimeout(() => setCopied(null), 1500); }).catch(() => {});
  }

  return (
    <div className={styles.drawerWrap}>
      <div className={styles.scrim} onClick={onClose} />
      <div className={styles.drawer} role="dialog" aria-label="Albums">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div className={styles.panelTitle} style={{ marginBottom: 0 }}>Albums · {albums.length}</div>
          <button className={styles.ghostBtn} onClick={onClose}>Close</button>
        </div>

        {/* create */}
        <div className={styles.panel} style={{ marginBottom: 14 }}>
          <div className={styles.panelTitle}>New album</div>
          {songs.length === 0 ? (
            <div className={styles.emptyState}>Generate a few songs first — they show up here to assemble.</div>
          ) : (
            <>
              <input className={styles.input} placeholder="Album title" value={title} onChange={(e) => setTitle(e.target.value)} style={{ marginBottom: 8 }} />
              <div style={{ maxHeight: 160, overflowY: 'auto', marginBottom: 8 }}>
                {songs.map((s) => (
                  <label key={s.id} className={styles.check} style={{ cursor: 'pointer', alignItems: 'center' }}>
                    <input type="checkbox" checked={picked.has(s.id)} onChange={() => toggle(s.id)} />
                    <span>{s.title} <span className={styles.checkNote}>· {s.score.total}/100 · {s.production.tempoBpm} BPM</span></span>
                  </label>
                ))}
              </div>
              <button className={styles.runBtn} style={{ padding: 11 }} disabled={!picked.size} onClick={create}>
                Create album ({picked.size})
              </button>
            </>
          )}
        </div>

        {/* existing albums */}
        {albums.map((a) => {
          const tracks = a.trackIds.map((id) => byId.get(id)).filter(Boolean) as SongPackage[];
          const open = openId === a.id;
          const seq = open ? suggestSequence(tracks) : [];
          const gaps = open ? albumGaps(tracks) : [];
          return (
            <div key={a.id} className={styles.vaultItem} style={{ cursor: 'default' }}>
              <div className={styles.vaultTitle} style={{ cursor: 'pointer' }} onClick={() => setOpenId(open ? null : a.id)}>
                <span>{a.title}</span>
                <span className={styles.ver}>{a.trackIds.length} tracks</span>
              </div>
              <div className={styles.vaultMeta}>{a.concept}</div>
              {open && (
                <div style={{ marginTop: 10 }}>
                  <div className={styles.pkgLabel}>Suggested sequence</div>
                  <ol className={styles.list}>{seq.map((t) => <li key={t.id}>{t.title} <span className={styles.checkNote}>· {t.production.tempoBpm} BPM</span></li>)}</ol>
                  <div className={styles.pkgLabel} style={{ marginTop: 8 }}>Gaps to close</div>
                  <ul className={styles.list}>{gaps.map((g, i) => <li key={i}>{g}</li>)}</ul>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button className={styles.runBtn} style={{ padding: 10, width: 'auto', flex: 1 }} onClick={() => copyExport(a)}>
                      {copied === a.id ? 'Copied all Suno prompts ✓' : 'Copy all Suno prompts'}
                    </button>
                    <button className={styles.ghostBtn} onClick={() => onDelete(a.id)}>Delete</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
