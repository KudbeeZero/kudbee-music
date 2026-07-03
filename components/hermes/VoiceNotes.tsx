'use client';

import { useEffect, useRef, useState } from 'react';
import type { AudioClipMeta } from '@/lib/hermes/audioVault';
import { saveClip, listClips, loadClipBlob, deleteClip } from '@/lib/hermes/audioVault';
import styles from './hermes.module.css';

// Voice Notes + Bring Your Own Sound — record a quick take with the mic OR upload an
// existing audio file (an instrumental, a riff, a reference) and attach it to this song.
// Pure attachment: neither ever feeds the generation pipeline (see audioVault.ts's note
// on why that's fine for the determinism contract). Recording saves a 'voice' clip;
// upload saves a 'riff' clip — both share the same store, cap, and player. (roadmap 3.6)
export default function VoiceNotes({ songId }: { songId: string }) {
  const [clips, setClips] = useState<AudioClipMeta[]>([]);
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const uploadRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    listClips(songId).then((c) => { if (!cancelled) setClips(c); });
    return () => { cancelled = true; };
  }, [songId]);

  useEffect(() => () => { if (tickRef.current) clearInterval(tickRef.current); }, []);

  async function startRecording() {
    setError(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('This browser doesn’t support microphone recording.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
      };
      recorder.start();
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      setRecording(true);
      tickRef.current = setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 200);
    } catch {
      setError('Microphone access was blocked or unavailable.');
    }
  }

  function stopRecording(): Promise<Blob> {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder) { resolve(new Blob()); return; }
      const priorOnStop = recorder.onstop as (() => void) | null;
      recorder.onstop = () => {
        priorOnStop?.call(recorder);
        resolve(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }));
      };
      recorder.stop();
    });
  }

  async function finishRecording() {
    const blob = await stopRecording();
    setRecording(false);
    const durationMs = Date.now() - startedAtRef.current;
    recorderRef.current = null;
    if (blob.size === 0) return;
    const label = `Take ${clips.length + 1}`;
    const result = await saveClip(songId, 'voice', label, blob, durationMs);
    if (result.error === 'too-many') setError('This song already has 6 voice notes — delete one to record another.');
    else if (result.error === 'too-large') setError('That take is too long to store — try a shorter one.');
    else if (result.error) setError('Couldn’t save the recording.');
    else if (result.clip) setClips((prev) => [...prev, result.clip!]);
  }

  // Read an audio file's duration off a throwaway <audio> element's metadata — some
  // container formats report Infinity/NaN, so fall back to 0 (the label still shows).
  function readDuration(file: Blob): Promise<number> {
    return new Promise((resolve) => {
      if (typeof document === 'undefined') { resolve(0); return; }
      const url = URL.createObjectURL(file);
      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      let settled = false;
      // A file that fires neither loadedmetadata nor error (a stalling decode) must not hang
      // the upload forever — fall back to 0 after a short wait, revoking the URL exactly once.
      const finish = (ms: number) => { if (settled) return; settled = true; clearTimeout(timer); URL.revokeObjectURL(url); resolve(ms); };
      const timer = setTimeout(() => finish(0), 5000);
      audio.onloadedmetadata = () => { const d = audio.duration; finish(Number.isFinite(d) ? Math.round(d * 1000) : 0); };
      audio.onerror = () => finish(0);
      audio.src = url;
    });
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    if (!file.type.startsWith('audio/')) { setError('Please choose an audio file.'); return; }
    const durationMs = await readDuration(file);
    const label = file.name.replace(/\.[^.]+$/, '').slice(0, 60) || 'Uploaded sound';
    const result = await saveClip(songId, 'riff', label, file, durationMs);
    if (result.error === 'too-many') setError('This song already has 6 sounds — delete one to add another.');
    else if (result.error === 'too-large') setError('That file is too large to store — try a shorter clip.');
    else if (result.error) setError('Couldn’t save that sound.');
    else if (result.clip) setClips((prev) => [...prev, result.clip!]);
  }

  async function remove(id: string) {
    await deleteClip(id);
    setClips((prev) => prev.filter((c) => c.id !== id));
    if (playingId === id) setPlayingId(null);
  }

  async function play(id: string) {
    const blob = await loadClipBlob(id);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingId(id);
    audio.onended = () => { setPlayingId(null); URL.revokeObjectURL(url); };
    audio.play().catch(() => { setPlayingId(null); URL.revokeObjectURL(url); });
  }

  function fmt(ms: number): string {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {!recording ? (
          <button
            className={styles.copyBtn}
            style={{ marginLeft: 0 }}
            onClick={startRecording}
            disabled={clips.length >= 6}
            title="Record a quick voice take with your mic — attached to this song, never fed into generation."
          >
            🎙️ Record a take
          </button>
        ) : (
          <button className={styles.copyBtn} style={{ marginLeft: 0, borderColor: 'rgba(255,93,108,0.5)', color: 'var(--bad)' }} onClick={finishRecording}>
            ⏹ Stop ({fmt(elapsedMs)})
          </button>
        )}
        {!recording && (
          <button
            className={styles.copyBtn}
            style={{ marginLeft: 0 }}
            onClick={() => uploadRef.current?.click()}
            disabled={clips.length >= 6}
            title="Upload an existing audio file (an instrumental, a riff, a reference) — attached to this song, never fed into generation."
          >
            ⬆️ Upload a sound
          </button>
        )}
        <input ref={uploadRef} type="file" accept="audio/*" onChange={onUpload} style={{ display: 'none' }} />
        {clips.length >= 6 && !recording && <span className={styles.hint}>6/6 — delete one to add another</span>}
      </div>
      {error && <div className={styles.hint} style={{ color: 'var(--bad)', marginTop: 4 }}>{error}</div>}
      {clips.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {clips.map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className={styles.copyBtn} style={{ marginLeft: 0 }} onClick={() => play(c.id)} disabled={playingId === c.id}>
                {playingId === c.id ? '▶ playing…' : '▶ play'}
              </button>
              <span className={styles.hint} style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.kind === 'riff' ? '🎵' : '🎙️'} {c.label}{c.durationMs > 0 ? ` · ${fmt(c.durationMs)}` : ''}
              </span>
              <button className={styles.copyBtn} style={{ marginLeft: 0 }} onClick={() => remove(c.id)} title="Delete this take">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
