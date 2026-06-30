'use client';

import { useEffect, useRef, useState } from 'react';
import type { SongInputs, SongPackage, AgentOutput } from '@/lib/hermes/types';
import { AGENT_DEFINITIONS } from '@/lib/hermes/agents';
import { runPipeline } from '@/lib/hermes/pipeline';
import { listSongs, saveSong, getSong, deleteSong, priorSongsForOriginality, loadBannedWords, saveBannedWords } from '@/lib/hermes/storage';
import { allAvoidWords } from '@/lib/hermes/memory';
import SongLabForm from './SongLabForm';
import AgentBoard from './AgentBoard';
import SongPackageView from './SongPackageView';
import BangerScoreCard from './BangerScoreCard';
import UniquenessReportView from './UniquenessReport';
import VaultDrawer from './VaultDrawer';
import RecommendationsPanel from './RecommendationsPanel';
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
  const regenRef = useRef(0); // bumps each run so the same idea yields a fresh take

  // hydrate from local storage on mount (client only — avoids SSR mismatch)
  useEffect(() => {
    setVault(listSongs());
    setBanned(loadBannedWords(allAvoidWords()));
  }, []);

  async function run(inputs: SongInputs) {
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
      const { pkg: result } = await runPipeline(inputs, { priorSongs, bannedWords: banned, seed });

      // play the pipeline back so the board updates agent-by-agent
      for (const o of result.agentOutputs) {
        setOutputs((prev) => ({ ...prev, [o.id]: { ...o, status: 'running' } }));
        await sleep(150);
        setOutputs((prev) => ({ ...prev, [o.id]: o }));
        await sleep(110);
      }

      const saved = saveSong(result);
      setPkg(saved);
      setVault(listSongs());
    } catch (e) {
      // never leave the deck stuck on "working…" — surface the failure
      console.error('HERMES pipeline failed', e);
      setError(e instanceof Error ? e.message : 'Generation failed — please try again.');
    } finally {
      setRunning(false);
    }
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

  const doneCount = Object.values(outputs).filter((o) => o.status === 'done' || o.status === 'warning').length;

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
        <button className={styles.ghostBtn} onClick={() => setVaultOpen(true)}>Vault ({vault.length})</button>
      </header>

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

      <div className={styles.deck}>
        {/* left column — input + avoid words */}
        <div className={styles.col}>
          <SongLabForm running={running} onRun={run} />

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
              </>
            )}
          </div>

          <RecommendationsPanel songs={vault} onAddExclusion={addExclusion} />
        </div>

        {/* center column — agent board + package */}
        <div className={styles.col}>
          <AgentBoard outputs={outputs} />
          {pkg ? (
            <SongPackageView pkg={pkg} />
          ) : (
            <div className={styles.panel}>
              <div className={styles.emptyState}>
                Enter a song idea and hit <b>Generate</b>.<br />
                HERMES will route it through all {AGENT_DEFINITIONS.length} agents and assemble a full song package here.
              </div>
            </div>
          )}
        </div>

        {/* right column — scores + release */}
        <div className={styles.col}>
          {pkg ? (
            <>
              <BangerScoreCard score={pkg.score} />
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

      {vaultOpen && (
        <VaultDrawer
          songs={vault}
          onOpen={openFromVault}
          onClose={() => setVaultOpen(false)}
          onDelete={removeFromVault}
        />
      )}
    </div>
  );
}
