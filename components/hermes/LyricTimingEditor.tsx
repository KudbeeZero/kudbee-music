'use client';

import { useState, useEffect } from 'react';
import type { SongPackage } from '@/lib/hermes/types';
import styles from './hermes.module.css';

export interface LyricMarker {
  lineIdx: number;
  text: string;
  startMs?: number;
  endMs?: number;
}

export interface SectionMarkers {
  label: string;
  markers: LyricMarker[];
}

export default function LyricTimingEditor({
  pkg,
  onSave,
  id,
  active,
}: {
  pkg: SongPackage | null;
  onSave?: (sections: SectionMarkers[]) => void;
  id?: string;
  active?: boolean;
}) {
  const [sections, setSections] = useState<SectionMarkers[]>([]);
  const [selectedSection, setSelectedSection] = useState(0);
  const [selectedLineIdx, setSelectedLineIdx] = useState<number | null>(null);
  const [audioPos, setAudioPos] = useState(0);

  useEffect(() => {
    if (!pkg) return;
    const init = pkg.sections.map((s) => ({
      label: s.label,
      markers: s.lines.map((line, idx) => ({
        lineIdx: idx,
        text: line,
        startMs: undefined,
        endMs: undefined,
      })),
    }));
    setSections(init);
  }, [pkg]);

  const section = sections[selectedSection];

  function markStart() {
    if (!selectedLineIdx || !section) return;
    setSections((prev) => {
      const next = [...prev];
      next[selectedSection].markers[selectedLineIdx].startMs = audioPos;
      return next;
    });
  }

  function markEnd() {
    if (selectedLineIdx === null || !section) return;
    setSections((prev) => {
      const next = [...prev];
      next[selectedSection].markers[selectedLineIdx].endMs = audioPos;
      return next;
    });
  }

  function clearMark(idx: number) {
    setSections((prev) => {
      const next = [...prev];
      next[selectedSection].markers[idx] = { ...next[selectedSection].markers[idx], startMs: undefined, endMs: undefined };
      return next;
    });
  }

  function updateText(idx: number, text: string) {
    setSections((prev) => {
      const next = [...prev];
      next[selectedSection].markers[idx].text = text;
      return next;
    });
  }

  function save() {
    if (onSave) onSave(sections);
  }

  if (!pkg) {
    return <div className={`${styles.panel}`}>No song loaded.</div>;
  }

  return (
    <div id={id} className={`${styles.panel} ${styles.flowFocus}`} data-active={active}>
      <div className={styles.panelTitle}>⏱️ Lyric Timing Editor — Phase 1</div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '10px 2px', marginBottom: 12 }}>
        {sections.map((s, i) => (
          <button
            key={s.label}
            onClick={() => { setSelectedSection(i); setSelectedLineIdx(null); }}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: `1px solid var(--line)`,
              background: selectedSection === i ? 'var(--cyan)' : 'var(--bg-1)',
              color: selectedSection === i ? 'var(--bg-0)' : 'var(--ink)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section && (
        <>
          {/* Lyric list */}
          <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16, border: '1px solid var(--line)', borderRadius: 8, padding: 8 }}>
            {section.markers.map((m, idx) => {
              const isSelected = selectedLineIdx === idx;
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedLineIdx(idx)}
                  style={{
                    padding: 8,
                    marginBottom: 4,
                    borderRadius: 6,
                    border: `1px solid ${isSelected ? 'var(--cyan)' : 'var(--line)'}`,
                    background: isSelected ? 'var(--bg-2)' : 'var(--bg-0)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>Line {idx + 1}</div>
                  <input
                    type="text"
                    value={m.text}
                    onChange={(e) => updateText(idx, e.target.value)}
                    style={{
                      width: '100%',
                      padding: 6,
                      borderRadius: 4,
                      border: '1px solid var(--line)',
                      background: 'var(--bg-1)',
                      color: 'var(--ink)',
                      fontSize: 13,
                      marginBottom: 6,
                    }}
                    placeholder="Lyric text"
                  />
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11 }}>
                    <span>{m.startMs !== undefined ? `${(m.startMs / 1000).toFixed(2)}s` : '—'}</span>
                    <span>→</span>
                    <span>{m.endMs !== undefined ? `${(m.endMs / 1000).toFixed(2)}s` : '—'}</span>
                    {(m.startMs !== undefined || m.endMs !== undefined) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); clearMark(idx); }}
                        style={{
                          marginLeft: 'auto',
                          padding: '2px 6px',
                          fontSize: 11,
                          borderRadius: 4,
                          border: '1px solid var(--warn)',
                          background: 'transparent',
                          color: 'var(--warn)',
                          cursor: 'pointer',
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Controls */}
          {selectedLineIdx !== null && (
            <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-1)', borderRadius: 8 }}>
              <div style={{ fontSize: 12, marginBottom: 8 }}>
                Position: <strong>{(audioPos / 1000).toFixed(2)}s</strong>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={markStart}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--good)',
                    background: 'var(--good)',
                    color: 'var(--bg-0)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  Mark Start
                </button>
                <button
                  onClick={markEnd}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--good)',
                    background: 'var(--good)',
                    color: 'var(--bg-0)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  Mark End
                </button>
              </div>
            </div>
          )}

          {/* Audio controls (placeholder) */}
          <div style={{ padding: 12, background: 'var(--bg-1)', borderRadius: 8, marginBottom: 16 }}>
            <div style={{ fontSize: 12, marginBottom: 8 }}>Audio Playback (Phase 2)</div>
            <input
              type="range"
              min="0"
              max="180000"
              value={audioPos}
              onChange={(e) => setAudioPos(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 6 }}>
              Drag to set playback position (waveform visualization in phase 2)
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={save}
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: 6,
              border: '1px solid var(--cyan)',
              background: 'var(--cyan)',
              color: 'var(--bg-0)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Save Timing Map
          </button>
        </>
      )}
    </div>
  );
}
