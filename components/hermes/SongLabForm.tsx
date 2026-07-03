'use client';

import { useEffect, useState } from 'react';
import type { SongInputs, SongStructure, RhymeSchemeId } from '@/lib/hermes/types';
import { PATTERN_PACKS, findPatternPack } from '@/lib/hermes/patternPacks';
import { OCCASION_PACKS, findOccasionPack } from '@/lib/hermes/occasionPacks';
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

const RHYME_SCHEMES: { value: RhymeSchemeId; label: string }[] = [
  { value: 'AABB', label: 'AABB — couplets' },
  { value: 'ABAB', label: 'ABAB — alternating' },
  { value: 'ABBA', label: 'ABBA — enclosed' },
  { value: 'AAAA', label: 'AAAA — monorhyme' },
  { value: 'XAXA', label: 'XAXA — ballad meter' },
];

// A new visitor starts with a blank page — no preloaded words. Only neutral
// craft settings (tempo/structure/rhyme) carry a default.
const DEFAULTS: SongInputs = {
  title: '',
  theme: '',
  mood: '',
  genre: '',
  tempoMin: 130,
  tempoMax: 145,
  voice: '',
  audience: '',
  doNotUse: [],
  references: '',
  structure: 'hook-first',
  rhymeTemp: 'balanced',
  rhymeScheme: 'AABB',
};

/** The rich example brief — loaded only on an explicit click, never preloaded. */
export const EXAMPLE_BRIEF: SongInputs = {
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
  rhymeScheme: 'AABB',
};

/** A small pool of varied starter briefs across genre/mood/structure/rhyme — "Surprise
 *  me" picks one at random so a blank-page visitor sees real variety, not just the one
 *  fixed EXAMPLE_BRIEF every time. Never preloaded; only ever loaded on an explicit click. */
export const STARTER_BRIEFS: SongInputs[] = [
  EXAMPLE_BRIEF,
  {
    title: 'Golden Hour',
    theme: 'falling for someone during a slow, lingering summer',
    mood: 'warm, dreamy, a little nervous',
    genre: 'indie pop',
    tempoMin: 96,
    tempoMax: 108,
    voice: 'breathy, conversational',
    audience: 'someone you just met',
    doNotUse: [],
    references: 'sun-soaked synths, breezy guitar — feel only, never copy',
    structure: 'verse-first',
    rhymeTemp: 'balanced',
    rhymeScheme: 'ABAB',
  },
  {
    title: 'Dirt Road Home',
    theme: "leaving the small town you swore you'd never miss",
    mood: 'nostalgic, bittersweet',
    genre: 'country',
    tempoMin: 84,
    tempoMax: 96,
    voice: 'plainspoken, warm',
    audience: 'the town you grew up in',
    doNotUse: [],
    references: 'porch-light storytelling, steel guitar ache — feel only, never copy',
    structure: 'verse-first',
    rhymeTemp: 'tight',
    rhymeScheme: 'AABB',
  },
  {
    title: 'Static',
    theme: 'a relationship going quiet, both people too proud to say it first',
    mood: 'moody, tense',
    genre: 'alt R&B',
    tempoMin: 70,
    tempoMax: 82,
    voice: 'restrained, a little cold',
    audience: 'the person going quiet on you',
    doNotUse: [],
    references: 'dark synth pads, minimal drums — feel only, never copy',
    structure: 'hook-first',
    rhymeTemp: 'loose',
    rhymeScheme: 'ABBA',
  },
  {
    title: 'Bright Lights, Long Nights',
    theme: "chasing a dream in a city that doesn't care if you make it",
    mood: 'defiant, hungry',
    genre: 'pop-rock',
    tempoMin: 128,
    tempoMax: 140,
    voice: 'anthemic, gritty',
    audience: 'everyone who doubted you',
    doNotUse: [],
    references: 'stadium chorus energy, driving guitars — feel only, never copy',
    structure: 'hook-first',
    rhymeTemp: 'balanced',
    rhymeScheme: 'AABB',
  },
  {
    title: 'Slow Bloom',
    theme: 'healing at your own pace after a hard year',
    mood: 'gentle, hopeful',
    genre: 'lo-fi soul',
    tempoMin: 72,
    tempoMax: 84,
    voice: 'soft, intimate',
    audience: 'yourself, a year from now',
    doNotUse: [],
    references: 'warm vinyl crackle, Rhodes keys — feel only, never copy',
    structure: 'verse-first',
    rhymeTemp: 'loose',
    rhymeScheme: 'XAXA',
  },
];

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

  function loadExample() {
    setV(EXAMPLE_BRIEF);
    setDoNotUseRaw('');
  }

  // Picks a different starter brief than whatever's showing now, so two clicks in a
  // row never look like a no-op. Pure UI convenience — never part of generation, so
  // Math.random() here doesn't touch the determinism contract.
  function surpriseMe() {
    const others = STARTER_BRIEFS.filter((b) => b.title !== v.title);
    const pool = others.length ? others : STARTER_BRIEFS;
    setV(pool[Math.floor(Math.random() * pool.length)]);
    setDoNotUseRaw('');
  }

  // A Pattern Pack sets structure + rhyme scheme together as one choice — a
  // quick way to try "a different pattern" instead of tuning two dropdowns.
  // Not its own field on SongInputs; it just writes the two underlying dials.
  function applyPatternPack(id: string) {
    const pack = findPatternPack(id);
    if (pack) setV((p) => ({ ...p, structure: pack.structure, rhymeScheme: pack.rhymeScheme }));
  }

  // An Occasion Pack sets the mood/genre/references/structure/rhyme dials AND the
  // occasion field itself (unlike a Pattern Pack, occasion carries real new
  // vocabulary the mock provider consults — see occasionPacks.ts). Audience/title/
  // theme stay the visitor's own — the recipient's name and story are never preset.
  function applyOccasionPack(id: string) {
    const pack = findOccasionPack(id);
    if (!pack) return;
    setV((p) => ({
      ...p,
      occasion: pack.id,
      mood: pack.moodPreset,
      genre: pack.genrePreset,
      references: pack.referencesPreset,
      structure: pack.structure,
      rhymeScheme: pack.rhymeScheme,
    }));
  }

  // same readiness rule as the Lyric Lab: a brief needs a title, theme, and genre
  const briefReady = Boolean(v.title.trim() && v.theme.trim() && v.genre.trim());

  // Cmd/Ctrl+Enter submits from anywhere in the form — same "chat app" convention
  // as Slack/Discord — without stealing plain Enter from the theme textarea.
  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && briefReady && !running) {
        e.preventDefault();
        submit();
      }
    }
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, [briefReady, running, submit]);

  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span>Song Lab</span>
        <span style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className={styles.copyBtn}
            style={{ marginLeft: 0, textTransform: 'none', letterSpacing: 'normal' }}
            onClick={surpriseMe}
            title="Fill the brief with a random starter idea — a different genre/mood/structure combo each time"
          >
            🎲 Surprise me
          </button>
          <button type="button" className={styles.copyBtn} style={{ marginLeft: 0, textTransform: 'none', letterSpacing: 'normal' }} onClick={loadExample}>
            ✨ Load an example brief
          </button>
        </span>
      </div>

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
          <input id="hf-tmin" className={styles.input} type="number" min={40} max={260} value={v.tempoMin} onChange={(e) => set('tempoMin', Number(e.target.value))} />
        </Field>
        <Field label="Tempo max (BPM)" htmlFor="hf-tmax">
          <input id="hf-tmax" className={styles.input} type="number" min={40} max={260} value={v.tempoMax} onChange={(e) => set('tempoMax', Number(e.target.value))} />
        </Field>
      </div>

      <Field label="Occasion — write it for someone, for a moment" htmlFor="hf-occasion">
        <select
          id="hf-occasion"
          className={styles.select}
          value={v.occasion ?? ''}
          onChange={(e) => { if (e.target.value) applyOccasionPack(e.target.value); else set('occasion', undefined); }}
        >
          <option value="">No occasion — a regular song</option>
          {OCCASION_PACKS.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.label}</option>)}
        </select>
        {v.occasion && (
          <p className={styles.hint} style={{ marginTop: 5 }}>
            {findOccasionPack(v.occasion)?.blurb} Mood, genre, form, and rhyme are set — Audience below becomes who it&rsquo;s dedicated to.
          </p>
        )}
      </Field>

      <div className={styles.row2}>
        <Field label="Voice / persona" htmlFor="hf-voice">
          <input id="hf-voice" className={styles.input} value={v.voice} onChange={(e) => set('voice', e.target.value)} />
        </Field>
        <Field label={v.occasion ? 'Dedicated to (name)' : 'Audience'} htmlFor="hf-audience">
          <input id="hf-audience" className={styles.input} value={v.audience} onChange={(e) => set('audience', e.target.value)} placeholder={v.occasion ? 'e.g. Mom' : ''} />
        </Field>
      </div>

      <Field label="References / inspiration (feel only — never copied)" htmlFor="hf-refs">
        <textarea id="hf-refs" className={styles.textarea} value={v.references} onChange={(e) => set('references', e.target.value)} />
      </Field>

      <Field label="Do-not-use words (comma separated)" htmlFor="hf-dnu">
        <input id="hf-dnu" className={styles.input} value={doNotUseRaw} onChange={(e) => setDoNotUseRaw(e.target.value)} placeholder="corny, generic, ..." />
      </Field>

      <Field label="Pattern pack — apply a form + rhyme-scheme preset at once" htmlFor="hf-pack">
        <select
          id="hf-pack"
          className={styles.select}
          value=""
          onChange={(e) => { if (e.target.value) applyPatternPack(e.target.value); e.target.value = ''; }}
        >
          <option value="">Choose a pattern pack…</option>
          {PATTERN_PACKS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
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

      <Field label="Rhyme scheme" htmlFor="hf-scheme">
        <select id="hf-scheme" className={styles.select} value={v.rhymeScheme ?? 'AABB'} onChange={(e) => set('rhymeScheme', e.target.value as RhymeSchemeId)}>
          {RHYME_SCHEMES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </Field>

      <button className={styles.runBtn} disabled={running || !briefReady} onClick={submit}>
        {running ? 'HERMES is working…' : 'Generate Song Package ▸'}
      </button>
      {!briefReady && <p className={styles.hint} style={{ marginTop: 6 }}>Add a title, theme, and genre to start.</p>}
      {briefReady && !running && <p className={styles.hint} style={{ marginTop: 6 }}>Tip: ⌘/Ctrl + Enter generates from anywhere in the form.</p>}
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
