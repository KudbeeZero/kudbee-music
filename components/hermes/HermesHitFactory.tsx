'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { SongInputs, SongPackage, AgentOutput, HookOption, CritiqueKey } from '@/lib/hermes/types';
import { AGENT_DEFINITIONS } from '@/lib/hermes/agents';
import { runPipeline } from '@/lib/hermes/pipeline';
import { withChosenHook } from '@/lib/hermes/rescore';
import { keywords } from '@/lib/hermes/text';
import { listSongs, saveSong, getSong, deleteSong, priorSongsForOriginality, loadBannedWords, saveBannedWords, listAlbums, saveAlbum, deleteAlbum, loadTaste, recordTaste, type Taste } from '@/lib/hermes/storage';
import { allAvoidWords, newLearnedExclusions } from '@/lib/hermes/memory';
import { diffEdit, parseSections } from '@/lib/hermes/edits';
import { demoSong } from '@/lib/hermes/exampleSong';
import type { Album } from '@/lib/hermes/album';
import type { ExpansionPack } from '@/lib/hermes/expansionPacks';
import SongLabForm from './SongLabForm';
import AgentBoard from './AgentBoard';
import Council from './Council';
import SongPackageView from './SongPackageView';
import BangerScoreCard from './BangerScoreCard';
import UniquenessReportView from './UniquenessReport';
import VaultDrawer from './VaultDrawer';
import RecommendationsPanel from './RecommendationsPanel';
import ArtistCard from './ArtistCard';
import Rack from './Rack';
import AlbumView from './AlbumView';
import LyricLab from './LyricLab';
import BrainScan from './BrainScan';
import VoiceMirror from './VoiceMirror';
import { createNervousSystem, signalForAgent } from '@/lib/hermes/nervousSystem';
import { createWorkingMemory } from '@/lib/hermes/workingMemory';
import { brainHeat } from '@/lib/hermes/heat';
import { deriveEmotion } from '@/lib/hermes/emotion';
import { voiceMirror } from '@/lib/hermes/becomingYou';
import styles from './hermes.module.css';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function HermesHitFactory() {
  const [running, setRunning] = useState(false);
  const [outputs, setOutputs] = useState<Record<string, AgentOutput>>({});
  const [pkg, setPkg] = useState<SongPackage | null>(null);
  const [vault, setVault] = useState<SongPackage[]>([]);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [banned, setBanned] = useState<string[]>(() => allAvoidWords());
  const [showAvoid, setShowAvoid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumOpen, setAlbumOpen] = useState(false);
  const [labOpen, setLabOpen] = useState(false);
  const [preset, setPreset] = useState<Partial<{ genre: string; mood: string; references: string }> | null>(null);
  const [taste, setTaste] = useState<Taste | undefined>(undefined);
  // words just auto-excluded this session (cut twice in an edit) — surfaced as a
  // visible, undo-able notice so learning never silently overrides the artist.
  const [autoExcluded, setAutoExcluded] = useState<string[]>([]);
  const regenRef = useRef(0); // bumps each run so the same idea yields a fresh take
  const nsRef = useRef(createNervousSystem());      // the nervous system (signal bus)
  const wmRef = useRef(createWorkingMemory(16));     // short-term (working) memory
  const [wmSize, setWmSize] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);     // the brain/result column (scroll target on mobile)

  // how much of the current song is the artist's learned voice (feeds heat + the artist card)
  const becomingYou = useMemo(
    () => (pkg ? voiceMirror(pkg, taste, vault.filter((s) => s.id !== pkg.id)).youPercent : 0),
    [pkg, vault, taste],
  );
  // the artist's thermal brain signature — drives the Brain Scan heat-map ($0, local)
  const heat = useMemo(() => {
    const emo = pkg ? deriveEmotion(pkg.inputs) : { intensity: 0.3, valence: 0 };
    return brainHeat({
      songCount: vault.length,
      edits: taste?.edits ?? 0,
      emotionIntensity: emo.intensity,
      emotionValence: emo.valence,
      becomingYou,
    });
  }, [pkg, vault, taste, becomingYou]);

  // hydrate from local storage on mount (client only — avoids SSR mismatch)
  useEffect(() => {
    setVault(listSongs());
    setAlbums(listAlbums());
    setBanned(loadBannedWords(allAvoidWords()));
    setTaste(loadTaste());
  }, []);

  // On mobile/tablet the deck stacks (form/tools above the brain), so when a run
  // starts, bring the brain-scan + result into view — the generation "moment"
  // shouldn't happen off-screen below the form. No-op on desktop (side-by-side).
  useEffect(() => {
    if (!running || typeof window === 'undefined') return;
    if (window.matchMedia('(max-width: 1180px)').matches) {
      stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [running]);

  // learn-from-edits: diff the rewrite into taste signals, update the song + vault
  function saveLyricEdit(newText: string) {
    if (!pkg) return;
    const edit = diffEdit(pkg.finalLyrics, newText);
    if (edit.changed) {
      const t = recordTaste(edit.added, edit.removed);
      setTaste(t);
      // a word cut twice is a real signal, not a fluke — exclude it automatically
      // instead of waiting on a manual "+ exclude" tap, but never silently: it's
      // announced below with an undo, so the artist still has the final say.
      for (const w of edit.removed) {
        if ((t.disliked[w] ?? 0) >= 2 && !banned.includes(w)) {
          addExclusion(w);
          setAutoExcluded((prev) => (prev.includes(w) ? prev : [...prev, w]));
        }
      }
    }
    const updated = { ...pkg, finalLyrics: newText, sections: parseSections(newText) };
    saveSong(updated);
    setVault(listSongs());
    setPkg(getSong(updated.id) ?? updated);
  }

  // choose-your-lead-hook: re-pick the hook, re-score honestly, learn the pick as voice
  function chooseHook(h: HookOption) {
    if (!pkg || pkg.chosenHook?.text === h.text) return;
    const updated = withChosenHook(pkg, h);
    setTaste(recordTaste(keywords(h.text), []));
    saveSong(updated);
    setVault(listSongs());
    setPkg(getSong(updated.id) ?? updated);
  }

  function applyPack(pack: ExpansionPack) {
    setPreset({ genre: pack.style.split(',')[0].trim(), mood: pack.description, references: `${pack.title} expansion — ${pack.hookGuidance}` });
  }

  async function run(inputs: SongInputs, runOpts?: { forcedHook?: string; cognitionFeedback?: CritiqueKey[] }) {
    setRunning(true);
    setPkg(null);
    setOutputs({});
    setError(null);
    try {
      // Compare against the vault, but never against earlier versions of THIS
      // song — regenerating the same title shouldn't read as copying itself.
      const priorSongs = priorSongsForOriginality().filter(
        (s) => s.title.trim().toLowerCase() !== inputs.title.trim().toLowerCase(),
      );
      const seed = (Date.now() ^ (regenRef.current++ * 0x9e3779b1)) >>> 0;
      const { pkg: result } = await runPipeline(inputs, { priorSongs, bannedWords: banned, seed, forcedHook: runOpts?.forcedHook, cognitionFeedback: runOpts?.cognitionFeedback });

      // new session: clear working memory, seed it with the committed hook
      const wm = wmRef.current; const ns = nsRef.current;
      wm.clear(); setWmSize(0);
      if (result.chosenHook?.text) wm.note({ kind: 'choice', text: result.chosenHook.text });

      // play the pipeline back so the board + brain scan update agent-by-agent;
      // each firing sends a signal down the nervous system into working memory
      for (const o of result.agentOutputs) {
        setOutputs((prev) => ({ ...prev, [o.id]: { ...o, status: 'running' } }));
        const sig = signalForAgent(o.id, o.finding || o.name);
        if (sig) { ns.fire(sig); wm.note({ kind: 'signal', text: `${sig.region}: ${sig.note}` }); setWmSize(wm.size()); }
        await sleep(150);
        setOutputs((prev) => ({ ...prev, [o.id]: o }));
        await sleep(110);
      }

      const saved = saveSong(result);
      setPkg(saved);
      setVault(listSongs());
      // consolidate short-term → long-term: the session's salient words become voice
      const { keep } = wm.consolidate();
      if (keep.length) setTaste(recordTaste(keep, []));
    } catch (e) {
      // never leave the deck stuck on "working…" — surface the failure
      console.error('HERMES pipeline failed', e);
      setError(e instanceof Error ? e.message : 'Generation failed — please try again.');
    } finally {
      setRunning(false);
    }
  }

  // Seed the deck with the flagship example so a first-time visitor sees a real,
  // finished package (scores, agents, lyrics) before generating their own.
  function loadDemo() {
    const existing = getSong('example-cold-hard-gold');
    const s = existing ?? saveSong(demoSong());
    setVault(listSongs());
    setError(null);
    setPkg(s);
    const map: Record<string, AgentOutput> = {};
    for (const o of s.agentOutputs) map[o.id] = o;
    setOutputs(map);
  }

  function openFromVault(id: string) {
    const s = getSong(id);
    if (!s) return;
    setPkg(s);
    const map: Record<string, AgentOutput> = {};
    for (const o of s.agentOutputs) map[o.id] = o;
    setOutputs(map);
    setVaultOpen(false);
  }

  function removeFromVault(id: string) {
    deleteSong(id);
    setVault(listSongs());
    if (pkg?.id === id) setPkg(null);
  }

  function saveAvoid(raw: string) {
    const words = raw.split(/[,\n]/).map((w) => w.trim()).filter(Boolean);
    setBanned(words);
    saveBannedWords(words);
  }

  // recommendation action: remember a new exclusion the brain suggested
  function addExclusion(word: string) {
    const next = Array.from(new Set([...banned, word.toLowerCase()]));
    setBanned(next);
    saveBannedWords(next);
  }

  // undo for an auto-excluded word (from the notice banner) — the artist always
  // gets the final say, even on a word the brain excluded on its own.
  function removeExclusion(word: string) {
    const next = banned.filter((w) => w !== word.toLowerCase());
    setBanned(next);
    saveBannedWords(next);
    setAutoExcluded((prev) => prev.filter((w) => w !== word));
  }

  function dismissAutoExcludedNotice(word: string) {
    setAutoExcluded((prev) => prev.filter((w) => w !== word));
  }

  // one-tap bridge from session-local learning to the durable, version-controlled
  // record — copies the words this browser has learned that aren't in the
  // committed brain/memory.json yet, so they survive a cleared browser or a
  // different device instead of staying stuck in this one's localStorage.
  const learnedToRemember = newLearnedExclusions(banned);
  function copyLearnedExclusions() {
    const payload = JSON.stringify(learnedToRemember, null, 2);
    navigator.clipboard?.writeText(
      `Add these to brain/memory.json's exclusions.words to remember them everywhere:\n${payload}`,
    ).catch(() => {});
  }

  const doneCount = Object.values(outputs).filter((o) => o.status === 'done' || o.status === 'warning').length;
  // Compose (calm, focal input) until there's something to study; Studio (the full
  // analytical deck) once a run is under way or a package exists.
  const mode: 'compose' | 'studio' = running || pkg ? 'studio' : 'compose';

  function newSong() { setPkg(null); setOutputs({}); setError(null); }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brandMark}>H</div>
        <div className={styles.brandText}>
          <span className={styles.kicker}>HERMES</span>
          <h1 className={styles.title}>Hit Factory</h1>
          <span className={styles.subtitle}>Lyrical Combinator Brain · {AGENT_DEFINITIONS.length} agents</span>
        </div>
        <div className={styles.headerSpacer} />
        <span className={styles.modeBadge}>● V1 · local mock — no API key</span>
        {mode === 'studio' && <button className={styles.ghostBtn} onClick={newSong}>✨ New</button>}
        <button className={styles.ghostBtn} onClick={() => setLabOpen(true)}>✍️ Lyric Lab</button>
        <button className={styles.ghostBtn} onClick={() => setAlbumOpen(true)}>Albums ({albums.length})</button>
        <button className={styles.ghostBtn} onClick={() => setVaultOpen(true)}>Vault ({vault.length})</button>
      </header>

      {error && mode === 'compose' && (
        <div role="alert" style={{ border: '1px solid rgba(255,93,108,0.5)', background: 'rgba(255,93,108,0.10)', color: 'var(--bad)', borderRadius: 12, padding: '10px 14px', margin: '4px auto 0', maxWidth: 620, fontSize: 13 }}>⚠ {error}</div>
      )}

      {mode === 'compose' ? (
        <div className={styles.composeStage}>
          <div className={styles.composeHero}>
            <div className={styles.composeEyebrow}>Lyrical Combinator · {AGENT_DEFINITIONS.length} agents · $0 local</div>
            <h2 className={styles.composeTitle}>What do you want to make?</h2>
            <p className={styles.composeSub}>
              Describe a song — a feeling, a story, a genre. {AGENT_DEFINITIONS.length} cross-checking
              agents turn it into a complete original package: hooks, lyrics, production, and a Suno prompt.
            </p>
            <SongLabForm running={running} onRun={run} preset={preset} />
            <div className={styles.composeDivider}>or</div>
            <div className={styles.composeDemo}>
              <button className={styles.ghostBtn} onClick={loadDemo}>▶ See a finished example — “Cold Hard Gold” (99/100)</button>
            </div>
          </div>
        </div>
      ) : (
      <>
      {/* pipeline rail */}
      <div className={styles.rail}>
        {AGENT_DEFINITIONS.map((d) => (
          <span key={d.id} className={styles.railDot} data-on={outputs[d.id]?.status ?? 'idle'}>
            <span className={styles.statusPip} data-status={outputs[d.id]?.status ?? 'idle'} />
            {d.name.replace('HERMES ', '')}
          </span>
        ))}
        {running && <span className={styles.railDot}>{doneCount}/{AGENT_DEFINITIONS.length}</span>}
      </div>

      {error && (
        <div
          role="alert"
          style={{
            border: '1px solid rgba(255,93,108,0.5)', background: 'rgba(255,93,108,0.10)',
            color: 'var(--bad)', borderRadius: 12, padding: '10px 14px', margin: '4px 0 14px', fontSize: 13,
          }}
        >
          ⚠ {error}
        </div>
      )}

      {autoExcluded.map((w) => (
        <div
          key={w}
          role="status"
          style={{
            display: 'flex', alignItems: 'center', gap: 10, border: '1px solid var(--line-strong)',
            background: 'rgba(210,75,255,0.08)', borderRadius: 12, padding: '10px 14px', margin: '4px 0 14px', fontSize: 13,
          }}
        >
          <span style={{ flex: 1 }}>🧠 Added &ldquo;{w}&rdquo; to your avoid list — you&rsquo;ve cut it twice.</span>
          <button className={styles.ghostBtn} onClick={() => removeExclusion(w)}>Undo</button>
          <button className={styles.ghostBtn} onClick={() => dismissAutoExcludedNotice(w)}>×</button>
        </div>
      ))}

      <div className={styles.deck}>
        {/* left column — input + avoid words */}
        <div className={styles.col}>
          <SongLabForm running={running} onRun={run} preset={preset} />

          <div className={styles.panel}>
            <div className={styles.panelTitle} style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setShowAvoid((s) => !s)}>
              <span>Avoid-words ({banned.length})</span>
              <span>{showAvoid ? '–' : '+'}</span>
            </div>
            {showAvoid && (
              <>
                <p className={styles.hint}>Warned, never blocked. Edit freely — saved locally.</p>
                <textarea
                  key={banned.join('|')}
                  className={styles.textarea}
                  style={{ minHeight: 110 }}
                  defaultValue={banned.join(', ')}
                  onBlur={(e) => saveAvoid(e.target.value)}
                  aria-label="Avoid-words, comma separated"
                />
                {learnedToRemember.length > 0 && (
                  <button className={styles.copyBtn} style={{ marginLeft: 0, marginTop: 7 }} onClick={copyLearnedExclusions}>
                    📋 copy {learnedToRemember.length} new word{learnedToRemember.length > 1 ? 's' : ''} to remember permanently
                  </button>
                )}
              </>
            )}
          </div>

          <ArtistCard songs={vault} taste={taste} becomingYou={becomingYou} />
          <Rack />
          <RecommendationsPanel songs={vault} taste={taste} banned={banned} onAddExclusion={addExclusion} onApplyPack={applyPack} />
        </div>

        {/* center column — brain scan + agent board + package */}
        <div className={styles.col} ref={stageRef}>
          <BrainScan outputs={outputs} running={running} workingMemory={wmSize} heat={heat} />
          <AgentBoard outputs={outputs} />
          {pkg && <Council outputs={outputs} pkg={pkg} />}
          {pkg ? (
            <SongPackageView pkg={pkg} onSaveEdit={saveLyricEdit} onChooseHook={chooseHook}
              onRegenerateFromCritiques={(keys) => run(pkg.inputs, { cognitionFeedback: keys })} />
          ) : (
            <div className={styles.panel}>
              <div className={styles.emptyState}>
                The brain is composing — routing your idea through all {AGENT_DEFINITIONS.length} agents.
                Your full song package will assemble here.
              </div>
            </div>
          )}
        </div>

        {/* right column — scores + release */}
        <div className={styles.col}>
          {pkg ? (
            <>
              <BangerScoreCard score={pkg.score} />
              <VoiceMirror pkg={pkg} taste={taste} priorSongs={vault.filter((s) => s.id !== pkg.id)} />
              <UniquenessReportView report={pkg.uniqueness} />
              <div className={styles.panel}>
                <div className={styles.panelTitle}>Release Readiness</div>
                {pkg.release.map((r, i) => (
                  <div key={i} className={styles.check}>
                    <span className={`${styles.checkMark} ${r.ok ? styles.checkOk : styles.checkNo}`}>{r.ok ? '✓' : '!'}</span>
                    <span>
                      {r.label}
                      {r.note && <div className={styles.checkNote}>{r.note}</div>}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.panel}>
              <div className={styles.panelTitle}>Release Readiness</div>
              <div className={styles.emptyState}>Scores appear after generation.</div>
            </div>
          )}
        </div>
      </div>
      </>
      )}

      {vaultOpen && (
        <VaultDrawer
          songs={vault}
          onOpen={openFromVault}
          onClose={() => setVaultOpen(false)}
          onDelete={removeFromVault}
          onImported={() => { setVault(listSongs()); setAlbums(listAlbums()); }}
        />
      )}

      {albumOpen && (
        <AlbumView
          songs={vault}
          albums={albums}
          onClose={() => setAlbumOpen(false)}
          onSave={(a) => { saveAlbum(a); setAlbums(listAlbums()); }}
          onDelete={(id) => { deleteAlbum(id); setAlbums(listAlbums()); }}
        />
      )}

      {labOpen && (
        <LyricLab
          songs={vault}
          onClose={() => setLabOpen(false)}
          onRecordTaste={(kept, dropped) => setTaste(recordTaste(kept, dropped))}
          onGenerate={({ inputs, forcedHook }) => { setLabOpen(false); run(inputs, { forcedHook }); }}
        />
      )}
    </div>
  );
}
