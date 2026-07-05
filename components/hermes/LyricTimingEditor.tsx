'use client';

import { useState, useEffect, useRef } from 'react';
import type { SongPackage } from '@/lib/hermes/types';
import { toSrt, toSyncJson, toMidiCc } from '@/lib/hermes/lyricSync';
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updatePos = () => setAudioPos(audio.currentTime * 1000);
    const updateDuration = () => setDuration(audio.duration * 1000);

    audio.addEventListener('timeupdate', updatePos);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', () => setIsPlaying(false));

    return () => {
      audio.removeEventListener('timeupdate', updatePos);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', () => setIsPlaying(false));
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !duration) return;
    drawWaveform();
  }, [audioPos, duration]);

  function drawWaveform() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-1').trim();
    const lineColor = getComputedStyle(document.documentElement).getPropertyValue('--line').trim();
    const cyanColor = getComputedStyle(document.documentElement).getPropertyValue('--cyan').trim();

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    const barWidth = Math.max(2, w / 200);
    const barGap = 2;
    let x = 0;
    while (x < w) {
      const hue = Math.sin((x / w) * Math.PI) * 0.5 + 0.5;
      const barHeight = hue * h * 0.4;
      ctx.fillStyle = `hsla(${Math.random() * 60 + 180}, 70%, 50%, 0.6)`;
      ctx.fillRect(x, h / 2 - barHeight / 2, barWidth, barHeight);
      x += barWidth + barGap;
    }

    const playheadX = (audioPos / duration) * w;
    ctx.strokeStyle = cyanColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, h);
    ctx.stroke();
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const ms = Number(e.target.value);
    setAudioPos(ms);
    if (audioRef.current) {
      audioRef.current.currentTime = ms / 1000;
    }
  }

  function uploadAudio(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      if (audioRef.current) {
        audioRef.current.src = url;
      }
    }
  }

  const section = sections[selectedSection];

  function markStart() {
    if (selectedLineIdx === null || !section) return;
    setSections((prev) => {
      const next = [...prev];
      next[selectedSection].markers[selectedLineIdx].startMs = Math.round(audioPos);
      return next;
    });
  }

  function markEnd() {
    if (selectedLineIdx === null || !section) return;
    setSections((prev) => {
      const next = [...prev];
      next[selectedSection].markers[selectedLineIdx].endMs = Math.round(audioPos);
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

  function exportFormat(format: 'srt' | 'json' | 'csv') {
    const syncSections = sections.map((s) => ({
      label: s.label,
      lines: s.markers.map((m) => ({ text: m.text, startMs: m.startMs, endMs: m.endMs })),
    }));

    let content = '';
    let filename = '';

    if (format === 'srt') {
      content = toSrt(syncSections);
      filename = `${pkg?.title || 'lyrics'}.srt`;
    } else if (format === 'json') {
      content = toSyncJson(syncSections);
      filename = `${pkg?.title || 'lyrics'}-sync.json`;
    } else if (format === 'csv') {
      content = toMidiCc(syncSections);
      filename = `${pkg?.title || 'lyrics'}-midi.csv`;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!pkg) {
    return <div className={`${styles.panel}`}>No song loaded.</div>;
  }

  return (
    <div id={id} className={`${styles.panel} ${styles.flowFocus}`} data-active={active}>
      <div className={styles.panelTitle}>⏱️ Lyric Timing Editor — Phase 2</div>

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
          {/* Audio upload */}
          {!audioUrl && (
            <div style={{ marginBottom: 12, padding: 12, background: 'var(--bg-2)', borderRadius: 8 }}>
              <label style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                Upload audio:
                <input
                  type="file"
                  accept="audio/*"
                  onChange={uploadAudio}
                  style={{ marginLeft: 6 }}
                />
              </label>
            </div>
          )}

          {/* Waveform canvas */}
          {audioUrl && (
            <div style={{ marginBottom: 12, borderRadius: 8, overflow: 'hidden' }}>
              <canvas
                ref={canvasRef}
                width={400}
                height={100}
                style={{ width: '100%', display: 'block', background: 'var(--bg-1)' }}
              />
            </div>
          )}

          {/* Playback controls */}
          {audioUrl && (
            <div style={{ marginBottom: 12, padding: 12, background: 'var(--bg-1)', borderRadius: 8 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button
                  onClick={togglePlay}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--cyan)',
                    background: 'var(--cyan)',
                    color: 'var(--bg-0)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  {isPlaying ? '⏸ Pause' : '▶ Play'}
                </button>
                <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {(audioPos / 1000).toFixed(2)}s / {(duration / 1000).toFixed(2)}s
                </div>
              </div>
              <input
                type="range"
                min="0"
                max={Math.ceil(duration)}
                value={audioPos}
                onChange={handleSeek}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
          )}

          {/* Lyric list */}
          <div style={{ maxHeight: 250, overflowY: 'auto', marginBottom: 12, border: '1px solid var(--line)', borderRadius: 8, padding: 8 }}>
            {section.markers.map((m, idx) => {
              const isSelected = selectedLineIdx === idx;
              const isPlayingLine = isPlaying && m.startMs !== undefined && m.endMs !== undefined && audioPos >= m.startMs && audioPos <= m.endMs;
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedLineIdx(idx)}
                  style={{
                    padding: 8,
                    marginBottom: 4,
                    borderRadius: 6,
                    border: `1px solid ${isPlayingLine ? 'var(--good)' : isSelected ? 'var(--cyan)' : 'var(--line)'}`,
                    background: isPlayingLine ? 'rgba(76,175,80,0.1)' : isSelected ? 'var(--bg-2)' : 'var(--bg-0)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>Line {idx + 1}</div>
                  <input
                    type="text"
                    value={m.text}
                    onChange={(e) => updateText(idx, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
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

          {/* Mark buttons */}
          {selectedLineIdx !== null && (
            <div style={{ marginBottom: 12, display: 'flex', gap: 6 }}>
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
          )}

          {/* Save & Export buttons */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <button
              onClick={save}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 6,
                border: '1px solid var(--cyan)',
                background: 'var(--cyan)',
                color: 'var(--bg-0)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              Save Map
            </button>
            <button
              onClick={() => exportFormat('srt')}
              style={{
                padding: '10px 12px',
                borderRadius: 6,
                border: '1px solid var(--line)',
                background: 'var(--bg-1)',
                color: 'var(--ink)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              .srt
            </button>
            <button
              onClick={() => exportFormat('json')}
              style={{
                padding: '10px 12px',
                borderRadius: 6,
                border: '1px solid var(--line)',
                background: 'var(--bg-1)',
                color: 'var(--ink)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              .json
            </button>
            <button
              onClick={() => exportFormat('csv')}
              style={{
                padding: '10px 12px',
                borderRadius: 6,
                border: '1px solid var(--line)',
                background: 'var(--bg-1)',
                color: 'var(--ink)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              .csv
            </button>
          </div>

          <audio ref={audioRef} />
        </>
      )}
    </div>
  );
}
