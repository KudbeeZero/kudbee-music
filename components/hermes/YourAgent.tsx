'use client';

import { useEffect, useState } from 'react';
import type { SongPackage } from '@/lib/hermes/types';
import { exportBrain, type Taste } from '@/lib/hermes/storage';
import { currentProfile, type Profile } from '@/lib/hermes/identity';
import { getClaudeKey, setClaudeKey, clearClaudeKey, isClaudeEngineActive, setClaudeEngineActive } from '@/lib/hermes/claudeKey';
import { testClaudeKey, type ClaudeKeyTestResult } from '@/lib/hermes/providers/claudeLyricsProvider';
import { computeBadges } from '@/lib/hermes/badges';
import styles from './hermes.module.css';

// The minimal shape of the beforeinstallprompt event (not in lib.dom yet).
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * "Your Agent" — makes the founder's "the user can launch their own HERMES Music mobile
 * agent" real by tying the already-shipped pieces into one surface: who you're signed in
 * as, whether your own Claude brain is generating, how much memory you've built, and the
 * two ways to take your agent with you (export your Brain · install to your phone). The
 * founder-gated upgrades (cross-device account sync, a Lightning-powered agent) are shown
 * as honest locked rows — the same "never fake it" seam the OAuth buttons and the Rack's
 * Lightning slot already hold — so the path is visible without pretending it's live.
 */
export default function YourAgent({ songs, taste, becomingYou }: { songs: SongPackage[]; taste?: Taste; becomingYou: number }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [installEvt, setInstallEvt] = useState<InstallPromptEvent | null>(null);
  const [exported, setExported] = useState(false);
  // Claude Engine BYOK — same proven flow as Rack.tsx, surfaced here so the key can be
  // entered up front (from the first screen) instead of buried in the Rack behind a
  // throwaway song. Key lives only in this browser; the browser calls Anthropic directly.
  const [hasKey, setHasKey] = useState(false);
  const [active, setActive] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [editing, setEditing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ClaudeKeyTestResult | null>(null);
  const claudeOn = hasKey && active;

  // Everything here reads the live browser, so hydrate after mount (SSR renders the
  // signed-out shell, same idiom as Rack/ArtistCard).
  useEffect(() => {
    setProfile(currentProfile());
    setHasKey(!!getClaudeKey());
    setActive(isClaudeEngineActive());
    setStandalone(
      (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches) ||
      // iOS Safari's non-standard installed flag
      (typeof navigator !== 'undefined' && (navigator as unknown as { standalone?: boolean }).standalone === true),
    );
    const onPrompt = (e: Event) => { e.preventDefault(); setInstallEvt(e as InstallPromptEvent); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!profile) return null;

  const bestScore = songs.reduce((m, s) => Math.max(m, s.score?.total ?? 0), 0);
  const badgeCount = computeBadges(songs, taste, { songCount: songs.length, becomingYou, bestScore }).length;

  function doExport() {
    const blob = new Blob([exportBrain(currentProfile())], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'hermes-brain.json'; a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  }

  async function doInstall() {
    if (!installEvt) return;
    await installEvt.prompt();
    await installEvt.userChoice;
    setInstallEvt(null);
  }

  // --- Claude key management (mirrors Rack.tsx) ---
  function unlockKey() {
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    setClaudeKey(trimmed);
    setClaudeEngineActive(true);
    setHasKey(true); setActive(true);
    setKeyInput(''); setEditing(false);
  }
  function toggleActive() {
    const next = !active;
    setClaudeEngineActive(next);
    setActive(next);
  }
  function forgetKey() {
    clearClaudeKey();
    setHasKey(false); setActive(false); setEditing(false); setTestResult(null);
  }
  async function doTestKey() {
    setTesting(true); setTestResult(null);
    try { setTestResult(await testClaudeKey({ apiKey: getClaudeKey() ?? undefined })); }
    finally { setTesting(false); }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>🚀 Your Agent</div>
      <div className={styles.hint}>
        Signed in as <strong>{profile.name}</strong> — your local-first HERMES agent lives in this browser.
      </div>

      <div className={styles.flag} style={{ marginTop: 8, borderLeft: `3px solid ${claudeOn ? 'var(--good)' : 'var(--line-strong)'}` }}>
        <div className={styles.flagKind}>Lyric brain</div>
        <div className={styles.hint}>
          {claudeOn
            ? '🟢 Generating with your own Claude brain — your key, your browser, straight to Anthropic.'
            : hasKey
              ? 'Your Claude key is saved but the engine is off — turn it on to generate with your own Claude brain.'
              : 'Running the free Local Combinator. Paste your own Anthropic key to generate with your own Claude brain — it lives only in this browser and calls Anthropic directly.'}
        </div>

        {!hasKey && !editing && (
          <button className={styles.ghostBtn} style={{ marginTop: 6 }} onClick={() => setEditing(true)}>
            🔑 Enter your Anthropic key
          </button>
        )}
        {!hasKey && editing && (
          <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <input
              type="password"
              autoComplete="off"
              className={styles.input}
              placeholder="sk-ant-..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') unlockKey(); }}
              style={{ flex: 1, minWidth: 160 }}
              aria-label="Anthropic API key"
            />
            <button className={styles.ghostBtn} onClick={unlockKey} disabled={!keyInput.trim()}>Unlock</button>
            <button className={styles.ghostBtn} onClick={() => { setEditing(false); setKeyInput(''); }}>Cancel</button>
          </div>
        )}
        {hasKey && (
          <>
            <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className={styles.ghostBtn} onClick={toggleActive}>{active ? 'Turn off' : 'Turn on'}</button>
              <button className={styles.ghostBtn} onClick={doTestKey} disabled={testing} title="Makes one small, real request to api.anthropic.com with your key to confirm it works">
                {testing ? 'Testing…' : '🔌 Test key'}
              </button>
              <button className={styles.ghostBtn} onClick={forgetKey}>Forget key</button>
            </div>
            {testResult && (
              <div className={styles.hint} style={{ marginTop: 4, color: testResult.ok ? 'var(--good)' : 'var(--bad)' }}>
                {testResult.ok ? '✓ Claude API is working — connection confirmed.' : `✗ ${testResult.message}`}
              </div>
            )}
          </>
        )}
      </div>

      <div className={styles.hint} style={{ marginTop: 8 }}>
        🧠 Your memory: <strong>{songs.length}</strong> song{songs.length === 1 ? '' : 's'} · <strong>{badgeCount}</strong> badge{badgeCount === 1 ? '' : 's'}, saved to this browser.
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
        <button className={styles.copyBtn} style={{ marginLeft: 0 }} onClick={doExport} title="Download your whole agent as one portable document">
          {exported ? 'brain exported ✓' : '🧠 Export my Brain'}
        </button>
        {!standalone && installEvt && (
          <button className={styles.copyBtn} style={{ marginLeft: 0 }} onClick={doInstall} title="Install HERMES to your home screen as an app">
            📲 Install to your phone
          </button>
        )}
        {standalone && <span className={styles.chip} style={{ color: 'var(--good)', borderColor: 'rgba(87,217,138,0.4)' }}>📲 Installed</span>}
      </div>
      {!standalone && !installEvt && (
        <div className={styles.hint} style={{ marginTop: 6 }}>
          📲 On iPhone: tap Share → &ldquo;Add to Home Screen&rdquo; to launch HERMES as an app.
        </div>
      )}

      <div style={{ marginTop: 10, borderTop: '1px solid var(--line)', paddingTop: 8 }}>
        <div className={styles.hint} style={{ marginBottom: 4 }}>Upgrades — honest seams, not yet live:</div>
        <div className={styles.flag} style={{ opacity: 0.6 }}>
          <div className={styles.flagKind} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>🔒 ☁️ Cross-device account sync</span><span className={styles.chip} style={{ marginLeft: 0 }}>soon</span>
          </div>
          <div className={styles.hint}>Sign in and carry your brain across devices automatically. Needs a hosted account — for now, Export your Brain and import it anywhere.</div>
        </div>
        <div className={styles.flag} style={{ opacity: 0.6, marginTop: 6 }}>
          <div className={styles.flagKind} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>🔒 ⚡ Lightning-powered agent</span><span className={styles.chip} style={{ marginLeft: 0 }}>soon</span>
          </div>
          <div className={styles.hint}>Unlock your own agent on dedicated compute — a bigger brain, your own. Needs a connected Lightning endpoint.</div>
        </div>
      </div>
    </div>
  );
}
