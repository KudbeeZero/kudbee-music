'use client';

import { useMemo, useState } from 'react';
import type { SongInputs, SongPackage } from '@/lib/hermes/types';
import {
  LYRIC_PROCESS, guideStep, artistContext, choiceSignals, type StepGuidance,
} from '@/lib/hermes/process';
import { PERSONAS, suggestPersona, persona as personaById, type Persona } from '@/lib/hermes/personas';
import styles from './hermes.module.css';

export interface CraftLogEntry { stepId: string; title: string; choice: string; custom: boolean; }

const DEFAULT_INPUTS: SongInputs = {
  title: '', theme: '', mood: '', genre: 'aggressive boom-bap hip-hop',
  tempoMin: 86, tempoMax: 96, voice: 'gritty', audience: '',
  doNotUse: [], references: '', structure: 'full-song',
};

/**
 * The Lyric Lab — the Writers-Room made visible. Pick a craft persona, then walk
 * the 9 craft steps: each one poses the question, proposes options WITH REASONS,
 * and the artist commits a choice (or writes their own). Choices train the voice
 * (recordTaste); the committed hook becomes the song's real hook on generate.
 */
export default function LyricLab({
  songs, seedInputs, onClose, onGenerate, onRecordTaste,
}: {
  songs: SongPackage[];
  seedInputs?: Partial<SongInputs>;
  onClose: () => void;
  onGenerate: (args: { inputs: SongInputs; persona: Persona; forcedHook: string; craftLog: CraftLogEntry[] }) => void;
  onRecordTaste: (kept: string[], dropped: string[]) => void;
}) {
  const [inputs, setInputs] = useState<SongInputs>({ ...DEFAULT_INPUTS, ...seedInputs });
  const artist = useMemo(() => artistContext(songs), [songs]);
  const [personaId, setPersonaId] = useState<string>(() => suggestPersona({ ...DEFAULT_INPUTS, ...seedInputs }).persona.id);
  const [stepIdx, setStepIdx] = useState(0);
  // committed choice per step + the options shown (so we know what was passed over)
  const [log, setLog] = useState<Record<string, { choice: string; custom: boolean; passed: string[] }>>({});
  const [draft, setDraft] = useState('');         // the free-write box
  const [started, setStarted] = useState(false);  // brief screen → steps

  const persona = personaById(personaId)!;
  const step = LYRIC_PROCESS[stepIdx];
  const guidance: StepGuidance = useMemo(
    () => guideStep(step.id, { inputs, artist, persona, seed: 7 }),
    [step.id, inputs, artist, persona],
  );
  const committed = log[step.id]?.choice ?? '';

  function set<K extends keyof SongInputs>(k: K, v: SongInputs[K]) { setInputs((p) => ({ ...p, [k]: v })); }

  function commit(choice: string, custom: boolean) {
    if (!choice.trim()) return;
    const passed = guidance.options.map((o) => o.text).filter((t) => t !== choice);
    setLog((prev) => ({ ...prev, [step.id]: { choice: choice.trim(), custom, passed } }));
    setDraft('');
  }

  function go(dir: 1 | -1) {
    const next = stepIdx + dir;
    if (next < 0 || next >= LYRIC_PROCESS.length) return;
    setStepIdx(next);
    setDraft('');
  }

  function finish() {
    // train the voice: words the artist kept vs the options they passed over
    const kept: string[] = [];
    const dropped: string[] = [];
    const craftLog: CraftLogEntry[] = [];
    for (const s of LYRIC_PROCESS) {
      const e = log[s.id];
      if (!e) continue;
      craftLog.push({ stepId: s.id, title: s.title, choice: e.choice, custom: e.custom });
      const sig = choiceSignals(e.choice, e.passed);
      kept.push(...sig.kept); dropped.push(...sig.dropped);
    }
    onRecordTaste(kept, dropped);
    const forcedHook = log['hook']?.choice ?? '';
    // fold the persona + concept into the brief so generation reflects the session
    const concept = log['concept']?.choice;
    const finalInputs: SongInputs = {
      ...inputs,
      references: [inputs.references, concept, `feel of ${persona.name}`].filter(Boolean).join(' · '),
    };
    onGenerate({ inputs: finalInputs, persona, forcedHook, craftLog });
  }

  const briefReady = inputs.title.trim() && inputs.theme.trim() && inputs.genre.trim();
  const committedCount = LYRIC_PROCESS.filter((s) => log[s.id]).length;

  return (
    <div className={styles.drawerWrap}>
      <div className={styles.scrim} onClick={onClose} />
      <div className={`${styles.drawer} ${styles.labDrawer}`} role="dialog" aria-label="Lyric Lab">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div className={styles.panelTitle} style={{ marginBottom: 0 }}>✍️ Lyric Lab — write <em>with</em> the brain</div>
          <button className={styles.ghostBtn} onClick={onClose}>Close</button>
        </div>
        <p className={styles.hint} style={{ marginTop: 0, marginBottom: 14 }}>{artist.note}</p>

        {!started ? (
          /* ---- brief + persona ---- */
          <div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="lab-title">Working title</label>
              <input id="lab-title" className={styles.input} value={inputs.title} onChange={(e) => set('title', e.target.value)} placeholder="Cold Hard Gold" />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="lab-theme">What's it really about?</label>
              <textarea id="lab-theme" className={styles.textarea} value={inputs.theme} onChange={(e) => set('theme', e.target.value)} placeholder="the come-up from nothing, proving my worth" />
            </div>
            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="lab-mood">Mood</label>
                <input id="lab-mood" className={styles.input} value={inputs.mood} onChange={(e) => set('mood', e.target.value)} placeholder="hard, defiant" />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="lab-aud">For who?</label>
                <input id="lab-aud" className={styles.input} value={inputs.audience} onChange={(e) => set('audience', e.target.value)} placeholder="my brother" />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="lab-genre">Genre</label>
              <input id="lab-genre" className={styles.input} value={inputs.genre} onChange={(e) => set('genre', e.target.value)} />
            </div>

            <div className={styles.panelTitle} style={{ marginTop: 16 }}>Pick a craft persona</div>
            <p className={styles.hint} style={{ marginTop: 0 }}>The brain wears this mind's craft-DNA — never a name, never lyrics.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  className={styles.personaChip}
                  data-on={p.id === personaId}
                  onClick={() => setPersonaId(p.id)}
                >
                  {p.name.replace('The ', '')}
                </button>
              ))}
            </div>
            <div className={styles.hookCard}>
              <div style={{ fontWeight: 700, marginBottom: 3 }}>{persona.name}</div>
              <div className={styles.hint} style={{ marginBottom: 6 }}>{persona.essence}</div>
              <div className={styles.hint}>
                {persona.rhyme.scheme} · {persona.rhyme.density} density{persona.rhyme.internal ? ' · internal rhyme' : ''} · {persona.cadence}
              </div>
            </div>

            <button className={styles.runBtn} disabled={!briefReady} onClick={() => setStarted(true)}>
              Enter the writers-room →
            </button>
            {!briefReady && <div className={styles.hint} style={{ marginTop: 6 }}>Add a title, theme, and genre to start.</div>}
          </div>
        ) : (
          /* ---- the 9-step writers-room ---- */
          <div>
            {/* step rail */}
            <div className={styles.stepRail}>
              {LYRIC_PROCESS.map((s, i) => (
                <button
                  key={s.id}
                  className={styles.stepDot}
                  data-state={i === stepIdx ? 'current' : log[s.id] ? 'done' : 'idle'}
                  onClick={() => setStepIdx(i)}
                  title={s.title}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0 2px' }}>
              <span className={styles.stepNum}>Step {stepIdx + 1}/9</span>
              <strong>{step.title}</strong>
              {guidance.belief && <span className={styles.beliefChip}>{guidance.belief.title}</span>}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, margin: '8px 0' }}>{guidance.prompt}</div>
            <p className={styles.hint} style={{ marginTop: 0 }}>💡 {guidance.coaching}</p>

            {guidance.options.map((o, i) => (
              <div
                key={i}
                className={styles.hookCard}
                data-chosen={committed === o.text}
                style={{ cursor: 'pointer' }}
                onClick={() => commit(o.text, false)}
              >
                <div style={{ fontWeight: 600 }}>{o.text}</div>
                <div className={styles.hint} style={{ marginTop: 3 }}>→ {o.why}</div>
              </div>
            ))}

            <div className={styles.field} style={{ marginTop: 6 }}>
              <label className={styles.label} htmlFor="lab-draft">…or write your own</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  id="lab-draft" className={styles.input} value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') commit(draft, true); }}
                  placeholder={step.id === 'hook' ? 'your actual hook line' : 'your own answer'}
                />
                <button className={styles.copyBtn} onClick={() => commit(draft, true)}>Commit</button>
              </div>
            </div>

            {committed && (
              <div className={styles.committedBox}>
                ✓ Committed: <strong>{committed}</strong>
                {step.id === 'hook' && <div className={styles.hint}>This becomes the song's actual hook.</div>}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, gap: 8 }}>
              <button className={styles.ghostBtn} disabled={stepIdx === 0} onClick={() => go(-1)}>← Back</button>
              <span className={styles.hint}>{committedCount}/9 committed</span>
              {stepIdx < LYRIC_PROCESS.length - 1 ? (
                <button className={styles.ghostBtn} onClick={() => go(1)}>Next →</button>
              ) : (
                <button className={styles.runBtn} style={{ width: 'auto', marginTop: 0 }} disabled={!log['hook']} onClick={finish}>
                  Generate the song ▸
                </button>
              )}
            </div>
            {stepIdx === LYRIC_PROCESS.length - 1 && !log['hook'] && (
              <div className={styles.hint} style={{ marginTop: 6 }}>Commit a hook (step 5) before generating — it becomes the song's hook.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
