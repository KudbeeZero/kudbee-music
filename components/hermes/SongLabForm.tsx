'use client';

import { useEffect, useState } from 'react';
import type { SongInputs, SongStructure } from '@/lib/hermes/types';
import styles from './hermes.module.css';

const STRUCTURES: { value: SongStructure; label: string }[] = [
  { value: 'hook-first', label: 'Hook-first' },
  { value: 'verse-first', label: 'Verse-first' },
  { value: 'radio-edit', label: 'Radio edit' },
  { value: 'short-form', label: 'Short-form (TikTok)' },
  { value: 'full-song', label: 'Full song' },
];

type RhymeTempOpt = NonNullable<SongInputs['rhymeTemp']>;
const RHYME_TEMPS: { value: RhymeTempOpt; label: string }[] = [
  { value: 'tight', label: 'Tight — perfect rhymes' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'loose', label: 'Loose — slant / near-rhyme' },
];

const DEFAULTS: SongInputs = {
  title: 'Out the Mud',
  theme: 'Chicago pain song for my daughter — made it out the struggle, still carry the block',
  mood: 'street but emotional, melodic',
  genre: '808 trap',
  tempoMin: 130,
  tempoMax: 145,
  voice: 'real, grounded, not corny',
  audience: 'my daughter',
  doNotUse: [],
  references: 'melodic hook energy, emotional storytelling — feel only, never copy',
  structure: 'hook-first',
  rhymeTemp: 'balanced',
};

export default function SongLabForm({
  running,
  onRun,
  preset,
}: {
  running: boolean;
  onRun: (inputs: SongInputs) => void;
  preset?: Partial<Pick<SongInputs, 'genre' | 'mood' | 'references'>> | null;
}) {
  const [v, setV] = useState<SongInputs>(DEFAULTS);
  const [doNotUseRaw, setDoNotUseRaw] = useState('');

  const set = <K extends keyof SongInputs>(k: K, val: SongInputs[K]) => setV((p) => ({ ...p, [k]: val }));

  // a recommendation (e.g. an expansion pack) can prefill the lab
  useEffect(() => {
    if (preset) setV((p) => ({ ...p, ...preset }));
  }, [preset]);

  function submit() {
    const doNotUse = doNotUseRaw.split(',').map((s) => s.trim()).filter(Boolean);
    onRun({ ...v, doNotUse });
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>Song Lab</div>

      <Field label="Song title" htmlFor="hf-title">
        <input id="hf-title" className={styles.input} value={v.title} onChange={(e) => set('title', e.target.value)} placeholder="Working title" />
      </Field>

      <Field label="Theme / idea" htmlFor="hf-theme">
        <textarea id="hf-theme" className={styles.textarea} value={v.theme} onChange={(e) => set('theme', e.target.value)} placeholder="What's the song about?" />
      </Field>

      <div className={styles.row2}>
        <Field label="Mood" htmlFor="hf-mood">
          <input id="hf-mood" className={styles.input} value={v.mood} onChange={(e) => set('mood', e.target.value)} />
        </Field>
        <Field label="Genre" htmlFor="hf-genre">
          <input id="hf-genre" className={styles.input} value={v.genre} onChange={(e) => set('genre', e.target.value)} />
        </Field>
      </div>

      <div className={styles.row2}>
        <Field label="Tempo min (BPM)" htmlFor="hf-tmin">
          <input id="hf-tmin" className={styles.input} type="number" value={v.tempoMin} onChange={(e) => set('tempoMin', Number(e.target.value))} />
        </Field>
        <Field label="Tempo max (BPM)" htmlFor="hf-tmax">
          <input id="hf-tmax" className={styles.input} type="number" value={v.tempoMax} onChange={(e) => set('tempoMax', Number(e.target.value))} />
        </Field>
      </div>

      <div className={styles.row2}>
        <Field label="Voice / persona" htmlFor="hf-voice">
          <input id="hf-voice" className={styles.input} value={v.voice} onChange={(e) => set('voice', e.target.value)} />
        </Field>
        <Field label="Audience" htmlFor="hf-audience">
          <input id="hf-audience" className={styles.input} value={v.audience} onChange={(e) => set('audience', e.target.value)} />
        </Field>
      </div>

      <Field label="References / inspiration (feel only — never copied)" htmlFor="hf-refs">
        <textarea id="hf-refs" className={styles.textarea} value={v.references} onChange={(e) => set('references', e.target.value)} />
      </Field>

      <Field label="Do-not-use words (comma separated)" htmlFor="hf-dnu">
        <input id="hf-dnu" className={styles.input} value={doNotUseRaw} onChange={(e) => setDoNotUseRaw(e.target.value)} placeholder="corny, generic, ..." />
      </Field>

      <div className={styles.row2}>
        <Field label="Structure" htmlFor="hf-structure">
          <select id="hf-structure" className={styles.select} value={v.structure} onChange={(e) => set('structure', e.target.value as SongStructure)}>
            {STRUCTURES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Rhyme" htmlFor="hf-rhyme">
          <select id="hf-rhyme" className={styles.select} value={v.rhymeTemp ?? 'balanced'} onChange={(e) => set('rhymeTemp', e.target.value as RhymeTempOpt)}>
            {RHYME_TEMPS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </Field>
      </div>

      <button className={styles.runBtn} disabled={running} onClick={submit}>
        {running ? 'HERMES is working…' : 'Generate Song Package ▸'}
      </button>
      <p className={styles.hint} style={{ marginTop: 8 }}>
        V1 uses local mock generation — original combinator output, no API key, no copyrighted material.
      </p>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}
