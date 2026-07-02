'use client';

// The inline "try it right here" playground — a visitor types one line and watches
// the REAL brain generate a song, above the fold, no navigation, no signup. This is
// genuine work: runPipeline runs all 10 agents client-side (~1-2s), and a COMPACT
// BrainScan replays the agentOutputs region-by-region, exactly like the studio deck.
//
// Determinism/portability: we generate with bannedWords = allAvoidWords([]) and no
// priorSongs (matching HermesHitFactory's reproduce path), and we CAPTURE the seed
// we passed, so the "Share this" link reproduces THIS exact song at /hermes?s=.
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { AgentOutput, SongPackage } from '@/lib/hermes/types';
import { runPipeline } from '@/lib/hermes/pipeline';
import { allAvoidWords } from '@/lib/hermes/memory';
import { encodeShare, shareUrl } from '@/lib/hermes/shareLink';
import { inputsFromLine, PLAYGROUND_GENRES } from '@/lib/hermes/livePlayground';
import BrainScan from '@/components/hermes/BrainScan';
import styles from './landing.module.css';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export default function LivePlayground() {
  const reduced = usePrefersReducedMotion();
  const [line, setLine] = useState('');
  const [genre, setGenre] = useState(PLAYGROUND_GENRES[0].id);
  const [running, setRunning] = useState(false);
  const [outputs, setOutputs] = useState<Record<string, AgentOutput>>({});
  const [pkg, setPkg] = useState<SongPackage | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // guards against a stale run painting over a newer one if the visitor re-fires
  const runIdRef = useRef(0);

  async function generate() {
    const text = line.trim();
    if (!text || running) return;
    const myRun = ++runIdRef.current;
    setRunning(true);
    setError(null);
    setPkg(null);
    setOutputs({});
    setCopied(false);
    setShareToken(null);
    try {
      const inputs = inputsFromLine(text, genre);
      // A fresh uint32 seed — captured so the share link reproduces THIS take. Kept
      // in [0, 2^32) so encodeShare's `seed >>> 0` is a no-op (byte-stable token).
      const seed = Math.floor(Math.random() * 0x100000000);
      const { pkg: result } = await runPipeline(inputs, {
        seed,
        bannedWords: allAvoidWords([]), // portable avoid-list (not a browser's custom one)
        priorSongs: [], // no vault → the song depends only on inputs + seed
      });
      if (myRun !== runIdRef.current) return; // superseded by a newer run

      // Replay the pipeline agent-by-agent so the Brain Scan lights up region-by-region.
      // Reduced motion → skip the per-agent delay and reveal the final state at once.
      if (reduced) {
        const map: Record<string, AgentOutput> = {};
        for (const o of result.agentOutputs) map[o.id] = o;
        setOutputs(map);
      } else {
        for (const o of result.agentOutputs) {
          if (myRun !== runIdRef.current) return;
          setOutputs((prev) => ({ ...prev, [o.id]: { ...o, status: 'running' } }));
          await sleep(140);
          if (myRun !== runIdRef.current) return;
          setOutputs((prev) => ({ ...prev, [o.id]: o }));
          await sleep(90);
        }
      }
      if (myRun !== runIdRef.current) return;
      setShareToken(encodeShare(inputs, seed));
      setPkg(result);
    } catch (e) {
      if (myRun !== runIdRef.current) return;
      console.error('HERMES playground run failed', e);
      setError(e instanceof Error ? e.message : 'Generation failed — please try again.');
    } finally {
      if (myRun === runIdRef.current) setRunning(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void generate();
    }
  }

  async function copyShare() {
    if (!shareToken) return;
    try {
      await navigator.clipboard?.writeText(shareUrl(shareToken));
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setError('Could not copy — your browser blocked clipboard access.');
    }
  }

  const hook = pkg?.chosenHook?.text;
  const score = pkg?.score;
  const showStage = running || !!pkg || !!error;

  return (
    <div className={styles.playground}>
      <div className={styles.playControls}>
        <label className={styles.playInputWrap}>
          <span className={styles.srOnly}>Describe your song in one line</span>
          <input
            className={styles.playInput}
            type="text"
            value={line}
            onChange={(e) => setLine(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="a song about…"
            maxLength={200}
            disabled={running}
            aria-label="Describe your song in one line"
          />
        </label>
        <button
          className={styles.playGenerate}
          onClick={() => void generate()}
          disabled={running || !line.trim()}
        >
          {running ? 'Thinking…' : 'Generate →'}
        </button>
      </div>

      <div className={styles.playChips} role="group" aria-label="Genre">
        {PLAYGROUND_GENRES.map((g) => (
          <button
            key={g.id}
            type="button"
            className={styles.playChip}
            data-on={g.id === genre || undefined}
            aria-pressed={g.id === genre}
            disabled={running}
            onClick={() => setGenre(g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>

      {showStage && (
        <div className={styles.playStage}>
          <div className={styles.playBrain}>
            <BrainScan outputs={outputs} running={running} />
            {running && (
              <p className={styles.playThinking} role="status">
                <span className={styles.playSpinner} aria-hidden="true" />
                the brain is thinking — running all 10 agents…
              </p>
            )}
          </div>

          <div className={styles.playResult}>
            {error ? (
              <div className={styles.playError} role="alert">
                ⚠ {error}
              </div>
            ) : pkg ? (
              <>
                <p className={styles.playResultKicker}>Lead hook</p>
                <blockquote className={styles.playHook}>“{hook}”</blockquote>
                {score && (
                  <div className={styles.playScore}>
                    <span className={styles.playScoreBig}>{score.total}</span>
                    <span className={styles.playScoreOf}>/ 100</span>
                    <span className={styles.playVerdict}>{score.verdict}</span>
                  </div>
                )}
                <div className={styles.playActions}>
                  <button className={styles.playActionGhost} onClick={() => void copyShare()}>
                    {copied ? '✓ Link copied' : '🔗 Share this'}
                  </button>
                  {shareToken && (
                    <Link
                      className={styles.playActionPrimary}
                      href={`/hermes?s=${shareToken}`}
                    >
                      Open in the full studio →
                    </Link>
                  )}
                </div>
              </>
            ) : (
              <p className={styles.playResultPending}>
                Assembling the song package — hook, score, and a shareable link land here.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
