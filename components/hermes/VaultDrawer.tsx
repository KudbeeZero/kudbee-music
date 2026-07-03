'use client';

import { useEffect, useRef, useState } from 'react';
import type { SongPackage } from '@/lib/hermes/types';
import { exportVault, importVault, vaultBackupStatus, restoreFromBackup, loadFavorites, toggleFavorite, loadSongNotes, setSongNote, loadRecentlyViewed } from '@/lib/hermes/storage';
import styles from './hermes.module.css';

const count = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export default function VaultDrawer({
  songs,
  onOpen,
  onClose,
  onDelete,
  onDuplicate,
  onRename,
  onImported,
}: {
  songs: SongPackage[];
  onOpen: (id: string) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
  onDuplicate?: (id: string) => SongPackage | null | undefined;
  onRename?: (id: string, title: string) => void;
  onImported?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [restoreNote, setRestoreNote] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites());
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>(() => loadSongNotes());
  const [recentIds] = useState<string[]>(() => loadRecentlyViewed());
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [copiedAll, setCopiedAll] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  function startRename(s: SongPackage, e: React.MouseEvent) {
    e.stopPropagation();
    setRenamingId(s.id);
    setRenameDraft(s.title);
  }

  // Duplicate + rename used to be two separate clicks — fork it, scroll to find
  // the new "(copy)"-titled row, then open its rename box. One click now forks
  // AND opens the rename box on the new entry (pre-filled with its "(copy)"
  // title), since renaming the fork is almost always the very next thing done.
  function duplicateAndRename(s: SongPackage, e: React.MouseEvent) {
    e.stopPropagation();
    const clone = onDuplicate?.(s.id);
    if (clone) {
      setRenamingId(clone.id);
      setRenameDraft(clone.title);
    }
  }

  function commitRename() {
    if (renamingId) onRename?.(renamingId, renameDraft);
    setRenamingId(null);
  }

  function toggleFav(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setFavorites(new Set(toggleFavorite(id)));
  }

  function commitNote(id: string, text: string) {
    setNoteDrafts(setSongNote(id, text));
  }

  // Escape closes the drawer — same convention as the scrim click, just from the
  // keyboard, matching the pattern established for every modal-style overlay.
  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, [onClose]);

  // "/" jumps straight to the search box (GitHub/Slack convention) — only when
  // it's not already being typed somewhere else (an input/textarea/rename box),
  // so a normal "/" character never gets swallowed mid-note or mid-rename.
  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if (e.key !== '/') return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (!searchRef.current) return;
      e.preventDefault();
      searchRef.current.focus();
    }
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, []);

  // `songs` arrives newest-first from storage.ts's listSongs(); a sort mode
  // reorders within that before favorites float to the top, so "oldest"/"title"
  // change the base order without ever breaking the favorites-first promise.
  function bySortMode(a: SongPackage, b: SongPackage) {
    if (sortMode === 'oldest') return a.createdAt < b.createdAt ? -1 : 1;
    if (sortMode === 'title') return a.title.localeCompare(b.title);
    return a.createdAt < b.createdAt ? 1 : -1;
  }
  // Favorites float to the top; a stable sort keeps each group's chosen sort
  // order otherwise, so favoriting never reshuffles the rest.
  const sortedSongs = [...songs]
    .filter((s) => s.title.toLowerCase().includes(query.trim().toLowerCase()))
    .sort(bySortMode)
    .sort((a, b) => Number(favorites.has(b.id)) - Number(favorites.has(a.id)));
  const byId = new Map(songs.map((s) => [s.id, s]));
  // Filter out ids for songs that were since deleted — a stale recent-id is just
  // dropped, never shown as a broken chip.
  const recentSongs = recentIds.map((id) => byId.get(id)).filter((s): s is SongPackage => !!s);
  // Cheap localStorage reads — recomputed on each render so the line stays current.
  // Warn only when the mirror holds more than the live vault (missing/corrupt live
  // reads as 0 songs); a fresh, empty vault is not a warning state.
  const backup = vaultBackupStatus();
  const backupWarn = backup.backupSongs > backup.liveSongs;

  function doExport() {
    const blob = new Blob([exportVault()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'hermes-vault.json'; a.click();
    URL.revokeObjectURL(url);
  }

  // Copying one song's lyrics at a time (7.2) doesn't help someone archiving the
  // whole catalog at once — one clipboard copy of every song, title-headed and
  // separated, same [Section] format each song's own "Copy lyrics" button uses.
  function copyAllLyrics() {
    const text = songs
      .map((s) => `# ${s.title}\n\n${s.sections.map((sec) => `[${sec.label}]\n${sec.lines.join('\n')}`).join('\n\n')}`)
      .join('\n\n---\n\n');
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1600);
    }).catch(() => {});
  }
  function doImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((txt) => { importVault(txt, 'merge'); onImported?.(); }).catch(() => {});
    e.target.value = '';
  }
  function doRestore() {
    const ok = window.confirm(
      'Restore from backup replaces your live catalog (songs + albums) with the backup mirror. This cannot be undone. Continue?'
    );
    if (!ok) return;
    const { songs: nSongs, albums: nAlbums } = restoreFromBackup();
    onImported?.();
    setRestoreNote(
      nSongs || nAlbums
        ? `restored ${count(nSongs, 'song')} / ${count(nAlbums, 'album')} from the backup mirror`
        : 'no backup mirror found — nothing restored'
    );
    window.setTimeout(() => setRestoreNote(null), 5000);
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
          {songs.length > 0 && (
            <button className={styles.copyBtn} style={{ marginLeft: 0 }} onClick={copyAllLyrics} title="Copy every song's lyrics as plain text, title-headed and separated — for archiving the whole vault at once">
              {copiedAll ? 'all lyrics copied ✓' : '📋 Copy all lyrics'}
            </button>
          )}
        </div>
        <div
          className={backupWarn ? styles.backupWarn : styles.hint}
          style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}
        >
          <span style={{ flex: 1 }}>
            {backupWarn
              ? !backup.liveHealthy
                ? `⚠ live vault is unreadable — backup mirror holds ${count(backup.backupSongs, 'song')}`
                : `⚠ live vault (${count(backup.liveSongs, 'song')}) is behind its backup mirror (${backup.backupSongs})`
              : `🛟 backup mirror: ${count(backup.backupSongs, 'song')}`}
          </span>
          <button className={styles.copyBtn} style={{ marginLeft: 0, flex: 'none' }} onClick={doRestore}>
            Restore from backup
          </button>
        </div>
        {restoreNote && (
          <div className={styles.hint} style={{ marginBottom: 14 }} role="status">{restoreNote}</div>
        )}

        {songs.length > 5 && (
          <input
            ref={searchRef}
            className={styles.input}
            style={{ marginBottom: 14 }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title… (press / to focus)"
            aria-label="Search the vault by title"
          />
        )}

        {songs.length > 1 && (
          <select
            className={styles.select}
            style={{ marginBottom: 14 }}
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
            aria-label="Sort the vault"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">Title A–Z</option>
          </select>
        )}

        {recentSongs.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div className={styles.hint} style={{ marginBottom: 6 }}>🕐 Recently viewed</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {recentSongs.map((s) => (
                <button key={s.id} className={styles.copyBtn} style={{ marginLeft: 0 }} onClick={() => onOpen(s.id)} title={s.title}>
                  {s.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {songs.length === 0 ? (
          <div className={styles.emptyState}>No saved songs yet.<br />Generate a package and it lands here.</div>
        ) : sortedSongs.length === 0 ? (
          <div className={styles.emptyState}>No songs match "{query}".</div>
        ) : (
          sortedSongs.map((s) => (
            <div key={s.id} className={styles.vaultItem} onClick={() => onOpen(s.id)}>
              <div className={styles.vaultTitle}>
                {renamingId === s.id ? (
                  <span style={{ display: 'flex', gap: 6, flex: 1, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <input
                      autoFocus
                      className={styles.input}
                      style={{ fontSize: 13, padding: '4px 8px' }}
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        // stopPropagation on Escape: the drawer itself also closes on
                        // Escape (a separate tiny feature) — without this, cancelling a
                        // rename would also close the whole Vault out from under it.
                        if (e.key === 'Enter') commitRename();
                        if (e.key === 'Escape') { e.stopPropagation(); setRenamingId(null); }
                      }}
                    />
                    <button className={styles.copyBtn} style={{ marginLeft: 0 }} onClick={commitRename}>Save</button>
                    <button className={styles.copyBtn} style={{ marginLeft: 0 }} onClick={() => setRenamingId(null)}>Cancel</button>
                  </span>
                ) : (
                  <span>
                    <button
                      className={styles.copyBtn}
                      style={{ marginLeft: 0, marginRight: 6, padding: '2px 6px' }}
                      onClick={(e) => toggleFav(s.id, e)}
                      title={favorites.has(s.id) ? 'Unpin from favorites' : 'Pin as a favorite'}
                    >
                      {favorites.has(s.id) ? '⭐' : '☆'}
                    </button>
                    {s.title}
                    {onRename && (
                      <button className={styles.copyBtn} style={{ marginLeft: 6, padding: '2px 6px' }} onClick={(e) => startRename(s, e)} title="Rename this song">
                        ✎
                      </button>
                    )}
                  </span>
                )}
                <span className={styles.ver}>v{s.version}</span>
              </div>
              <div className={styles.vaultMeta}>
                {new Date(s.createdAt).toLocaleString()} · score {s.score.total} · unique {s.uniqueness.score}
              </div>
              <input
                className={styles.input}
                style={{ marginTop: 6, fontSize: 12.5, padding: '5px 8px' }}
                value={noteDrafts[s.id] ?? ''}
                placeholder="add a note — e.g. needs a bridge rewrite"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [s.id]: e.target.value }))}
                onBlur={(e) => commitNote(s.id, e.target.value)}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                {onDuplicate && (
                  <button
                    className={styles.copyBtn}
                    style={{ marginLeft: 0 }}
                    onClick={(e) => duplicateAndRename(s, e)}
                    title="Fork this song into a new, independently-versioned copy, then open a rename box for it right away — the original is untouched"
                  >
                    duplicate
                  </button>
                )}
                <button
                  className={styles.copyBtn}
                  style={{ marginLeft: 0 }}
                  onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                >
                  delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
