'use client';

import { useState } from 'react';
import type { SongPackage } from '@/lib/hermes/types';
import { loadArtistAlias, saveArtistAlias, type Taste } from '@/lib/hermes/storage';
import { deriveArtist } from '@/lib/hermes/artist';
import { nextUnlock, type StoryProgress } from '@/lib/hermes/story';
import { computeBadges } from '@/lib/hermes/badges';
import styles from './hermes.module.css';

// Create-your-own-artist (v1) — your identity grows from what you make. Name it; the
// bio, hemisphere, signature words, and Story chapter come from the vault + taste.
export default function ArtistCard({ songs, taste, becomingYou }: { songs: SongPackage[]; taste?: Taste; becomingYou: number }) {
  const [alias, setAlias] = useState<string>(() => (typeof window === 'undefined' ? '' : loadArtistAlias()));
  const a = deriveArtist(songs, taste, { alias, becomingYou });
  const bestScore = songs.reduce((m, s) => Math.max(m, s.score?.total ?? 0), 0);
  const progress: StoryProgress = { songCount: songs.length, becomingYou, bestScore };
  const nu = nextUnlock(progress);
  const badges = computeBadges(songs, taste, progress);

  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>🎭 Your Artist</div>
      <input
        className={styles.input}
        placeholder="Name your artist…"
        value={alias}
        onChange={(e) => setAlias(e.target.value)}
        onBlur={() => saveArtistAlias(alias)}
        aria-label="Artist alias"
      />
      <div className={styles.hint} style={{ marginTop: 6 }}>{a.bio}</div>
      <div className={styles.hint} style={{ marginTop: 6 }}>
        📖 Chapter: <strong>{a.chapter}</strong>{nu ? ` · next: ${nu.chapter.title} — ${nu.goal}` : ' · story complete 🏆'}
      </div>
      {a.signatureWords.length > 0 && (
        <div style={{ marginTop: 6 }}>{a.signatureWords.map((w) => <span key={w} className={styles.chip}>{w}</span>)}</div>
      )}
      {badges.length > 0 ? (
        <div style={{ marginTop: 8 }}>
          <div className={styles.hint}>🏅 Badges ({badges.length})</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 5 }}>
            {badges.map((b) => (
              <span key={b.id} className={styles.chip} title={b.blurb}>{b.emoji} {b.label}</span>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.hint} style={{ marginTop: 8 }}>🏅 Badges appear as you create — your first is one song away.</div>
      )}
    </div>
  );
}
