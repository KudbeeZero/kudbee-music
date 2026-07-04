'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { SongInputs, SongPackage, AgentOutput, HookOption, CritiqueKey } from '@/lib/hermes/types';
import { AGENT_DEFINITIONS } from '@/lib/hermes/agents';
import { runPipeline, buildClips } from '@/lib/hermes/pipeline';
import { mockProviders } from '@/lib/hermes/providers/mockProviders';
import { createClaudeLyricsProvider, ClaudeProviderError } from '@/lib/hermes/providers/claudeLyricsProvider';
import { getClaudeKey, claudeEngineReady } from '@/lib/hermes/claudeKey';
import { withChosenHook } from '@/lib/hermes/rescore';
import { keywords } from '@/lib/hermes/text';
import { listSongs, saveSong, getSong, deleteSong, duplicateSong, renameSong, recordRecentlyViewed, priorSongsForOriginality, loadBannedWords, saveBannedWords, listAlbums, saveAlbum, deleteAlbum, loadTaste, recordTaste, type Taste } from '@/lib/hermes/storage';
import { allAvoidWords, newLearnedExclusions } from '@/lib/hermes/memory';
import { diffEdit, parseSections } from '@/lib/hermes/edits';
import { demoSong } from '@/lib/hermes/exampleSong';
import type { Album } from '@/lib/hermes/album';
import type { ExpansionPack } from '@/lib/hermes/expansionPacks';
import SongLabForm from './SongLabForm';
import AgentBoard from './AgentBoard';
import Council from './Council';
import SongPackageView from './SongPackageView';
import Studio from './Studio';
import BottomNav from './BottomNav';
import YourAgent from './YourAgent';
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
import { createNervousSystem, signalForAgent, type Signal } from '@/lib/hermes/nervousSystem';
import { createWorkingMemory } from '@/lib/hermes/workingMemory';
import { brainHeat } from '@/lib/hermes/heat';
import { deriveEmotion, emotionClarity } from '@/lib/hermes/emotion';
import { checkOriginality } from '@/lib/hermes/originality';
import { scoreSong } from '@/lib/hermes/scoring';
import { voiceMirror } from '@/lib/hermes/becomingYou';
import { currentProfile, signInGuest, signOut, type Profile } from '@/lib/hermes/identity';
import { decodeShare } from '@/lib/hermes/shareLink';
import { findOccasionPack, type OccasionPack } from '@/lib/hermes/occasionPacks';
import { useDevice } from './useDevice';
import WelcomeGate from '../auth/WelcomeGate';
import authStyles from '../auth/auth.module.css';
import styles from './hermes.module.css';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function HermesHitFactory() {
  // Device intelligence — "recognizes what phone or browser and it adjusts". The
  // profile/adaptations land as data- attributes on the shell so the CSS can key
  // CAPABILITY-driven rules (touch, form factor, animation budget) instead of only
  // viewport width — a landscape phone at 852px still gets 44px touch targets.
  const device = useDevice();
  // Header nav active-state — Crossroads is a real route, so its current-view indicator
  // is just a pathname check (no client-side routing state to track).
  const pathname = usePathname();
  // identity gate — null until hydrated (client-only, avoids SSR mismatch)
  const [profile, setProfile] = useState<Profile | null>(null);
  const [identityReady, setIdentityReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [outputs, setOutputs] = useState<Record<string, AgentOutput>>({});
  const [pkg, setPkg] = useState<SongPackage | null>(null);
  const [vault, setVault] = useState<SongPackage[]>([]);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [banned, setBanned] = useState<string[]>(() => allAvoidWords());
  const [showAvoid, setShowAvoid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [engineNotice, setEngineNotice] = useState<string | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumOpen, setAlbumOpen] = useState(false);
  const [labOpen, setLabOpen] = useState(false);
  const [preset, setPreset] = useState<Partial<{ genre: string; mood: string; references: string }> | null>(null);
  const [taste, setTaste] = useState<Taste | undefined>(undefined);
  // words just auto-excluded this session (cut twice in an edit) — surfaced as a
  // visible, undo-able notice so learning never silently overrides the artist.
  const [autoExcluded, setAutoExcluded] = useState<string[]>([]);
  // True when the last vault write didn't land (localStorage full/unavailable) — the
  // song on screen would silently vanish on reload, so the user gets an honest banner.
  const [vaultWriteFailed, setVaultWriteFailed] = useState(false);
  // Song Gifts (phase 2): set when an opened share link decodes to a package with an
  // Occasion Pack + a dedicated name — the "gift reveal" moment before the brain scan.
  const [giftReveal, setGiftReveal] = useState<{ pack: OccasionPack; who: string } | null>(null);
  const regenRef = useRef(0); // bumps each run so the same idea yields a fresh take
  const nsRef = useRef(createNervousSystem());      // the nervous system (signal bus)
  const wmRef = useRef(createWorkingMemory(16));     // short-term (working) memory
  const [wmSize, setWmSize] = useState(0);
  // A live window onto the nervous system's signal bus — the Agent Board's connection
  // lines and terminal ticker both read off this, capped so a long session can't grow
  // it unbounded. Subscribed once; nsRef itself is stable for the component's life.
  const [signalLog, setSignalLog] = useState<Signal[]>([]);
  useEffect(() => {
    const unsub = nsRef.current.subscribe((s) => setSignalLog((log) => [...log.slice(-39), s]));
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const stageRef = useRef<HTMLDivElement>(null);     // the brain/result column (scroll target on mobile)
  // Measured so the sticky Studio Flow rail (phone-only) can sit flush under the sticky
  // header instead of overlapping it — the header wraps to a different height depending
  // on how many action buttons fit per row, so a hardcoded offset would drift.
  const headerRef = useRef<HTMLElement>(null);
  const [headerH, setHeaderH] = useState(0);
  useEffect(() => {
    if (!device.ui.singleColumn || !headerRef.current) return;
    const el = headerRef.current;
    const ro = new ResizeObserver(() => setHeaderH(el.getBoundingClientRect().height));
    ro.observe(el);
    return () => ro.disconnect();
  }, [device.ui.singleColumn]);
  // Studio Flow: a Review -> Refine -> Keep -> Release rail over the existing studio-mode
  // panels. A focus state, not a wall — every panel stays rendered and reachable; a tab
  // click just scrolls to + highlights the panels for that stage of the journey.
  const [flowStage, setFlowStage] = useState<'review' | 'refine' | 'keep' | 'release' | 'studio'>('review');
  const FLOW_ANCHOR: Record<typeof flowStage, string> = {
    review: 'stage-review',
    refine: 'song-lyrics',
    keep: 'stage-keep',
    release: 'song-toolbar',
    studio: 'stage-studio',
  };
  function focusFlowStage(s: typeof flowStage) {
    setFlowStage(s);
    document.getElementById(FLOW_ANCHOR[s])?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  // Bottom nav (phone-only) — Lab/Vault work with or without a song; Council/Studio/
  // Package reuse the exact same Studio Flow focus mechanism the rail tabs use, so the
  // Council is one tap away from anywhere instead of buried in the Review stage only.
  function scrollToLab() {
    document.getElementById('song-lab-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

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
    setProfile(currentProfile());
    setIdentityReady(true);
    setVault(listSongs());
    setAlbums(listAlbums());
    setBanned(loadBannedWords(allAvoidWords()));
    setTaste(loadTaste());
  }, []);

  // "HERMES Live" share link: a ?s= token deterministically REPRODUCES the exact
  // song it encodes. On arrival we auto-enter as a guest (zero friction — the whole
  // point is the visitor immediately watches the brain think), reproduce with the
  // decoded seed, and strip the param so a reload doesn't re-fire. Runs once.
  const sharedRef = useRef(false);
  useEffect(() => {
    if (!identityReady || sharedRef.current || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('s');
    if (!token) return;
    sharedRef.current = true;
    const decoded = decodeShare(token);
    // strip ?s= regardless (malformed or not) so reloads/back don't retrigger
    const url = new URL(window.location.href);
    url.searchParams.delete('s');
    window.history.replaceState({}, '', url.toString());
    if (!decoded) return; // hostile/garbage token → app just loads normally
    if (!currentProfile()) setProfile(signInGuest());
    const giftPack = findOccasionPack(decoded.inputs.occasion);
    const who = decoded.inputs.audience.trim();
    if (giftPack && who) setGiftReveal({ pack: giftPack, who });
    void run(decoded.inputs, { seed: decoded.seed });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityReady]);

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
    // Re-derive everything downstream of the lyrics so an edit ripples through
    // the whole panel instead of leaving Banger Score/Uniqueness/clips stale —
    // the same pure functions the pipeline itself uses, just replayed against
    // the edited text. (Council's ranking already reads pkg.sections fresh on
    // every render, so it needed no fix here.)
    const sections = parseSections(newText);
    const uniqueness = checkOriginality(newText, { bannedWords: banned, priorSongs: priorSongsForOriginality(pkg.id) });
    const viralClips = buildClips(sections, pkg.chosenHook);
    const clarity = emotionClarity(pkg.inputs, sections);
    const score = scoreSong({
      inputs: pkg.inputs, chosenHook: pkg.chosenHook, sections, uniqueness,
      visuals: pkg.visuals, viralClips, emotionClarity: clarity,
    });
    const updated = { ...pkg, finalLyrics: newText, sections, uniqueness, viralClips, score };
    setVaultWriteFailed(!saveSong(updated).persisted);
    setVault(listSongs());
    setPkg(getSong(updated.id) ?? updated);
  }

  // choose-your-lead-hook: re-pick the hook, re-score honestly, learn the pick as voice
  function chooseHook(h: HookOption) {
    if (!pkg || pkg.chosenHook?.text === h.text) return;
    const updated = withChosenHook(pkg, h);
    setTaste(recordTaste(keywords(h.text), []));
    setVaultWriteFailed(!saveSong(updated).persisted);
    setVault(listSongs());
    setPkg(getSong(updated.id) ?? updated);
  }

  function applyPack(pack: ExpansionPack) {
    setPreset({ genre: pack.style.split(',')[0].trim(), mood: pack.description, references: `${pack.title} expansion — ${pack.hookGuidance}` });
  }

  async function run(inputs: SongInputs, runOpts?: { forcedHook?: string; cognitionFeedback?: CritiqueKey[]; seed?: number }) {
    setRunning(true);
    setPkg(null);
    setOutputs({});
    setError(null);
    setEngineNotice(null);
    try {
      // Reproducing a shared song (an explicit seed): make it PORTABLE + byte-identical
      // for every viewer — use the deterministic default avoid-list (not this browser's
      // custom one) and an empty prior-vault (not the viewer's), so the reproduced song
      // depends only on the encoded inputs + seed, never on local state. That also means
      // it must never depend on THIS visitor's own Claude Engine toggle — always mock.
      const reproduce = runOpts?.seed !== undefined;
      // Compare against the vault, but never against earlier versions of THIS
      // song — regenerating the same title shouldn't read as copying itself.
      const priorSongs = reproduce ? [] : priorSongsForOriginality().filter(
        (s) => s.title.trim().toLowerCase() !== inputs.title.trim().toLowerCase(),
      );
      const seed = runOpts?.seed ?? ((Date.now() ^ (regenRef.current++ * 0x9e3779b1)) >>> 0);
      const bannedForRun = reproduce ? allAvoidWords(inputs.doNotUse ?? []) : banned;
      const runOptions = { priorSongs, bannedWords: bannedForRun, seed, forcedHook: runOpts?.forcedHook, cognitionFeedback: runOpts?.cognitionFeedback };

      // Claude Engine (bring-your-own-key): opt-in per visitor, per browser. Never
      // used to reproduce a shared song — a permalink must render identically for
      // everyone regardless of whether the viewer has a key plugged in.
      let result: SongPackage;
      if (!reproduce && claudeEngineReady()) {
        try {
          const claudeProviders = { ...mockProviders, lyrics: createClaudeLyricsProvider({ apiKey: getClaudeKey() ?? undefined }) };
          ({ pkg: result } = await runPipeline(inputs, { ...runOptions, providers: claudeProviders }));
        } catch (claudeErr) {
          // Never leave the artist stuck because their own key/quota failed —
          // fall back to the free engine for this take and say so honestly.
          const reason = claudeErr instanceof ClaudeProviderError ? claudeErr.message : 'the Claude Engine request failed';
          setEngineNotice(`Claude Engine unavailable (${reason}) — used the free Local Combinator for this take.`);
          ({ pkg: result } = await runPipeline(inputs, runOptions));
        }
      } else {
        ({ pkg: result } = await runPipeline(inputs, runOptions));
      }

      // new session: clear working memory, seed it with the committed hook
      const wm = wmRef.current; const ns = nsRef.current;
      wm.clear(); setWmSize(0); setSignalLog([]);
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

      const { song: saved, persisted } = saveSong(result);
      setVaultWriteFailed(!persisted);
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
    let s = existing;
    if (!s) {
      const res = saveSong(demoSong());
      s = res.song;
      setVaultWriteFailed(!res.persisted); // keep the quota banner truthful here too
    }
    setVault(listSongs());
    setError(null);
    setPkg(s);
    const map: Record<string, AgentOutput> = {};
    for (const o of s.agentOutputs) map[o.id] = o;
    setOutputs(map);
    // The demo is the most common first-touch entry point, so it needs to be an
    // honest replay of what actually happened — not an empty nervous system. Feed
    // this song's own already-computed agentOutputs through the same signal path
    // run() uses, so the Agent Board's connection lines + terminal ticker have
    // something real to show instead of staying idle.
    setSignalLog([]);
    for (const o of s.agentOutputs) {
      const sig = signalForAgent(o.id, o.finding || o.name);
      if (sig) nsRef.current.fire(sig);
    }
  }

  function openFromVault(id: string) {
    const s = getSong(id);
    if (!s) return;
    recordRecentlyViewed(id);
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

  // Fork a stored song into its own independent entry — "(copy)" title, version 1,
  // no bearing on the original. Lets an artist branch a version to try a wild edit
  // without risking the one they already like.
  function duplicateInVault(id: string) {
    const clone = duplicateSong(id);
    setVault(listSongs());
    return clone;
  }

  function renameInVault(id: string, title: string) {
    const renamed = renameSong(id, title);
    if (!renamed) return;
    setVault(listSongs());
    if (pkg?.id === id) setPkg(renamed);
  }

  function saveAvoid(raw: string) {
    const words = raw.split(/[,\n]/).map((w) => w.trim()).filter(Boolean);
    setBanned(words);
    saveBannedWords(words);
  }

  // A learned list can grow large over many songs — confirm before wiping it,
  // same caution as "Restore from backup" elsewhere in the app.
  function clearAvoidWords() {
    if (!banned.length) return;
    const ok = window.confirm(`Clear all ${banned.length} avoid-words? This can't be undone.`);
    if (!ok) return;
    setBanned([]);
    saveBannedWords([]);
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

  function newSong() { setPkg(null); setOutputs({}); setError(null); setEngineNotice(null); }

  // sign-out returns to the gate; the vault deliberately stays on this device
  function handleSignOut() {
    signOut();
    setProfile(null);
    setVaultOpen(false); setAlbumOpen(false); setLabOpen(false);
    newSong();
  }

  return (
    <div
      className={styles.shell}
      data-touch={device.profile.touch || undefined}
      data-form={device.profile.formFactor}
      data-anim={device.ui.animation}
      data-bottomnav={(profile && device.ui.singleColumn) || undefined}
      data-sticky-header={(profile && device.ui.singleColumn) || undefined}
      data-sticky-rail={(profile && device.ui.singleColumn) || undefined}
    >
      <header className={styles.header} ref={headerRef}>
        <div className={styles.brandMark}>H</div>
        <div className={styles.brandText}>
          <span className={styles.kicker}>HERMES</span>
          <h1 className={styles.title}>Hit Factory</h1>
          <span className={styles.subtitle}>Lyrical Combinator Brain · {AGENT_DEFINITIONS.length} agents</span>
        </div>
        <div className={styles.headerSpacer} />
        {/* header stays minimal on the welcome gate — actions appear after entry */}
        {profile && (
          <>
            <span className={styles.modeBadge}>● V1 · local mock — no API key</span>
            <button
              className={styles.navUtility}
              onClick={() => {
                if (mode === 'studio') focusFlowStage('keep');
                document.getElementById('your-agent')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              title="Your Agent — your Claude key, your brain, install to your phone"
            >
              🚀 Agent
            </button>
            {mode === 'studio' && <button className={styles.navPrimary} onClick={newSong}>✨ New</button>}
            <button className={styles.navPrimary} onClick={() => setLabOpen(true)}>✍️ Lyric Lab</button>
            <Link href="/crossroads" className={styles.navPrimary} data-active={pathname === '/crossroads' || undefined}>🧭 Crossroads</Link>
            <button className={styles.navUtility} onClick={() => setAlbumOpen(true)}>Albums ({albums.length})</button>
            <button className={styles.navUtility} onClick={() => setVaultOpen(true)}>Vault ({vault.length})</button>
            <span className={authStyles.profileChip} title={`Signed in as ${profile.name} (${profile.kind}) — local to this browser`}>
              {profile.name}
              {profile.kind === 'dev' && <span className={authStyles.devBadge}>dev</span>}
            </span>
            <button
              className={styles.navUtility}
              data-tone="danger"
              onClick={handleSignOut}
              title="Sign out — your vault stays on this device"
            >
              Sign out
            </button>
          </>
        )}
      </header>

      {!identityReady ? null : !profile ? (
        <WelcomeGate onEnter={setProfile} />
      ) : (
      <>
      {error && mode === 'compose' && (
        <div role="alert" style={{ border: '1px solid rgba(255,93,108,0.5)', background: 'rgba(255,93,108,0.10)', color: 'var(--bad)', borderRadius: 12, padding: '10px 14px', margin: '4px auto 0', maxWidth: 620, fontSize: 13 }}>⚠ {error}</div>
      )}
      {engineNotice && mode === 'compose' && (
        <div role="status" style={{ border: '1px solid rgba(255,177,78,0.5)', background: 'rgba(255,177,78,0.10)', color: 'var(--amber)', borderRadius: 12, padding: '10px 14px', margin: '4px auto 0', maxWidth: 620, fontSize: 13 }}>ℹ {engineNotice}</div>
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
            <div id="song-lab-anchor"><SongLabForm running={running} onRun={run} preset={preset} /></div>
            <div className={styles.composeDivider}>or</div>
            <div className={styles.composeDemo}>
              <button className={styles.ghostBtn} onClick={loadDemo}>▶ See a finished example — “Cold Hard Gold” (99/100)</button>
            </div>
            {/* Bring-your-own-Claude-key up front — enter it here and your very first
                song generates with your own Claude brain, no throwaway song first. */}
            <div style={{ marginTop: 18, textAlign: 'left' }}>
              <YourAgent songs={vault} taste={taste} becomingYou={becomingYou} id="your-agent" />
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

      {pkg && (
        <div
          className={styles.flowRail}
          role="tablist"
          aria-label="Song workflow stage"
          style={device.ui.singleColumn ? { top: headerH || undefined } : undefined}
        >
          {([
            { id: 'review', label: '① Review', title: 'Hooks, scores, and the Council verdict' },
            { id: 'refine', label: '② Refine', title: 'Edit the lyrics, regenerate from critiques' },
            { id: 'keep', label: '③ Keep', title: 'Artist profile, the crate, recommendations — save what you like' },
            { id: 'release', label: '④ Release', title: 'Share link, PNG card, Suno prompt, exports' },
            { id: 'studio', label: '🎚️ Studio', title: 'The arrangement timeline, the Engine Rack, and the Brain Scan as one workspace' },
          ] as const).map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={flowStage === s.id}
              className={styles.flowTab}
              data-active={flowStage === s.id}
              title={s.title}
              onClick={() => focusFlowStage(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

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

      {engineNotice && (
        <div
          role="status"
          style={{
            border: '1px solid rgba(255,177,78,0.5)', background: 'rgba(255,177,78,0.10)',
            color: 'var(--amber)', borderRadius: 12, padding: '10px 14px', margin: '4px 0 14px', fontSize: 13,
          }}
        >
          ℹ {engineNotice}
        </div>
      )}

      {giftReveal && (
        <div
          role="status"
          style={{
            display: 'flex', alignItems: 'center', gap: 10, border: '1px solid rgba(210,75,255,0.4)',
            background: 'rgba(210,75,255,0.08)', borderRadius: 12, padding: '10px 14px', margin: '4px 0 14px', fontSize: 13,
          }}
        >
          <span style={{ flex: 1 }}>
            {giftReveal.pack.emoji} A <b>{giftReveal.pack.label}</b> song, written for <b>{giftReveal.who}</b> —
            watch the brain write it below.
          </span>
          <button className={styles.ghostBtn} onClick={() => setGiftReveal(null)}>×</button>
        </div>
      )}

      {vaultWriteFailed && (
        <div
          role="alert"
          style={{
            display: 'flex', alignItems: 'center', gap: 10, border: '1px solid rgba(255,206,90,0.5)',
            background: 'rgba(255,206,90,0.1)', borderRadius: 12, padding: '10px 14px', margin: '4px 0 14px', fontSize: 13,
          }}
        >
          <span style={{ flex: 1 }}>
            ⚠️ Couldn&rsquo;t save to this browser&rsquo;s storage (it may be full). Your song is on
            screen but <b>won&rsquo;t survive a reload</b> — open the Vault and Export now, then clear
            some space.
          </span>
          <button className={styles.ghostBtn} onClick={() => setVaultOpen(true)}>Open Vault</button>
          <button className={styles.ghostBtn} onClick={() => setVaultWriteFailed(false)}>×</button>
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
          <div id="song-lab-anchor"><SongLabForm running={running} onRun={run} preset={preset} /></div>

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
                {banned.length > 0 && (
                  <button className={styles.copyBtn} style={{ marginLeft: 0, marginTop: 7 }} onClick={clearAvoidWords}>
                    🗑 clear all
                  </button>
                )}
              </>
            )}
          </div>

          <div id="stage-keep" className={`${styles.col} ${styles.flowFocus}`} style={{ gap: 16, padding: 0 }} data-active={pkg != null && (flowStage === 'keep' || flowStage === 'studio')}>
            <YourAgent songs={vault} taste={taste} becomingYou={becomingYou} id="your-agent" />
            <ArtistCard songs={vault} taste={taste} becomingYou={becomingYou} />
            <Rack />
            <RecommendationsPanel songs={vault} taste={taste} banned={banned} onAddExclusion={addExclusion} onApplyPack={applyPack} />
          </div>
        </div>

        {/* center column — brain scan + agent board + package */}
        <div className={styles.col} ref={stageRef}>
          <div className={styles.flowFocus} data-active={flowStage === 'studio'}>
            <BrainScan outputs={outputs} running={running} workingMemory={wmSize} heat={heat} />
          </div>
          <Studio key={pkg?.id ?? 'no-song'} pkg={pkg} outputs={outputs} id="stage-studio" active={flowStage === 'studio'} />
          <AgentBoard outputs={outputs} signalLog={signalLog} />
          {pkg && (
            <div id="stage-review" className={styles.flowFocus} data-active={flowStage === 'review'}>
              <Council outputs={outputs} pkg={pkg} taste={taste} />
            </div>
          )}
          {pkg ? (
            <SongPackageView pkg={pkg} onSaveEdit={saveLyricEdit} onChooseHook={chooseHook}
              onRegenerateFromCritiques={(keys) => run(pkg.inputs, { cognitionFeedback: keys })}
              flowStage={flowStage} />
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
              <div className={styles.flowFocus} data-active={flowStage === 'review'}>
                <BangerScoreCard score={pkg.score} />
              </div>
              <VoiceMirror pkg={pkg} taste={taste} priorSongs={vault.filter((s) => s.id !== pkg.id)} />
              <UniquenessReportView report={pkg.uniqueness} />
              <div className={`${styles.panel} ${styles.flowFocus}`} data-active={flowStage === 'release'}>
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
          onDuplicate={duplicateInVault}
          onRename={renameInVault}
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

      <BottomNav
        visible={device.ui.singleColumn}
        hasPkg={pkg != null}
        active={
          vaultOpen ? 'vault'
          : mode === 'compose' ? 'lab'
          : flowStage === 'studio' ? 'studio'
          : flowStage === 'release' ? 'package'
          : 'council'
        }
        onLab={scrollToLab}
        onCouncil={() => focusFlowStage('review')}
        onStudio={() => focusFlowStage('studio')}
        onPackage={() => focusFlowStage('release')}
        onVault={() => setVaultOpen(true)}
      />
      </>
      )}
    </div>
  );
}
