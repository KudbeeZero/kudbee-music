'use client';

import { useMemo, useState } from 'react';
import type { SongPackage } from '@/lib/hermes/types';
import { learnProfile } from '@/lib/hermes/learn';
import { recommend } from '@/lib/hermes/recommend';
import { getExpansionPack, type ExpansionPack } from '@/lib/hermes/expansionPacks';
import styles from './hermes.module.css';

export default function RecommendationsPanel({
  songs,
  onAddExclusion,
  onApplyPack,
}: {
  songs: SongPackage[];
  onAddExclusion: (word: string) => void;
  onApplyPack?: (pack: ExpansionPack) => void;
}) {
  const profile = useMemo(() => learnProfile(songs), [songs]);
  const recs = useMemo(() => recommend(profile, songs), [profile, songs]);
  const [copied, setCopied] = useState<string | null>(null);

  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>Brain · Recommendations</div>

      {profile.songCount > 0 && (
        <div className={styles.hint} style={{ marginBottom: 10, lineHeight: 1.5 }}>
          Learned from {profile.songCount} song{profile.songCount > 1 ? 's' : ''}:
          {profile.topGenres[0] ? <> lane <b style={{ color: 'var(--ink)' }}>{profile.topGenres[0]}</b>,</> : null}
          {' '}{profile.leansDark ? 'leans dark' : 'mixed mood'}, avg banger <b style={{ color: 'var(--ink)' }}>{profile.avgBanger}</b>.
        </div>
      )}

      {recs.map((r, i) => (
        <div key={i} className={styles.flag} style={{ borderColor: 'var(--line-strong)' }}>
          <div className={styles.flagKind} style={{ color: 'var(--cyan)' }}>{r.kind.replace('-', ' ')}</div>
          <div style={{ fontWeight: 600, fontSize: 12.5 }}>{r.title}</div>
          <div className={styles.hint} style={{ marginTop: 3 }}>{r.detail}</div>

          {r.action?.type === 'add-exclusion' && (
            <button className={styles.copyBtn} style={{ marginLeft: 0, marginTop: 7 }}
              onClick={() => onAddExclusion(r.action!.value)}>
              + exclude “{r.action.value}”
            </button>
          )}
          {r.action?.type === 'apply-pack' && (() => {
            const pack = getExpansionPack(r.action!.value);
            if (!pack) return null;
            return (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 7 }}>
                <button className={styles.copyBtn} style={{ marginLeft: 0 }}
                  onClick={() => { navigator.clipboard?.writeText(pack.style).then(() => { setCopied(pack.name); setTimeout(() => setCopied(null), 1400); }).catch(() => {}); }}>
                  {copied === pack.name ? 'Suno style copied ✓' : `copy “${pack.title}” Suno style`}
                </button>
                {onApplyPack && (
                  <button className={styles.copyBtn} style={{ marginLeft: 0 }} onClick={() => onApplyPack(pack)}>
                    → send to Song Lab
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      ))}
    </div>
  );
}
