'use client';

import { useEffect, useState } from 'react';
import { ENGINE_UNITS } from '@/lib/hermes/engines';
import { getClaudeKey, setClaudeKey, clearClaudeKey, isClaudeEngineActive, setClaudeEngineActive } from '@/lib/hermes/claudeKey';
import { getLightningEndpoint, setLightningEndpoint, getLightningApiKey, setLightningApiKey, clearLightningConfig, lightningConfigured } from '@/lib/hermes/lightningKey';
import { testClaudeKey, type ClaudeKeyTestResult } from '@/lib/hermes/providers/claudeLyricsProvider';
import { hasSeenRackTour, markRackTourSeen } from '@/lib/hermes/rackTour';
import KeyUnlockRow from './KeyUnlockRow';
import styles from './hermes.module.css';

// The Pro Studio Rack — the lyrical engines as a DAW-style rack of modular units.
// The free Local Combinator is lit and active; Claude Engine is a bring-your-own-key
// slot — paste a key, it lives only in this browser, and this browser calls Anthropic
// directly (see the claudeKey.ts header comment for why that's the $0-safe design).

export default function Rack() {
  // Read from localStorage after mount only — server-rendered HTML has no
  // localStorage, so this starts "locked" and hydrates to the real state.
  const [hasClaudeKey, setHasClaudeKey] = useState(false);
  const [claudeActive, setClaudeActive] = useState(false);
  const [claudeKeyInput, setClaudeKeyInput] = useState('');
  const [claudeEditing, setClaudeEditing] = useState(false);
  const [claudeTesting, setClaudeTesting] = useState(false);
  const [claudeTestResult, setClaudeTestResult] = useState<ClaudeKeyTestResult | null>(null);

  const [hasLightningConfig, setHasLightningConfig] = useState(false);
  const [lightningEndpointInput, setLightningEndpointInput] = useState('');
  const [lightningKeyInput, setLightningKeyInput] = useState('');
  const [lightningEditing, setLightningEditing] = useState(false);

  const [tourSeen, setTourSeen] = useState(true); // default hidden until hydrated, so SSR never flashes it

  useEffect(() => {
    setHasClaudeKey(!!getClaudeKey());
    setClaudeActive(isClaudeEngineActive());
    setHasLightningConfig(lightningConfigured());
    setTourSeen(hasSeenRackTour());
  }, []);

  function dismissTour() {
    markRackTourSeen();
    setTourSeen(true);
  }

  function unlockClaude() {
    const trimmed = claudeKeyInput.trim();
    if (!trimmed) return;
    setClaudeKey(trimmed);
    setClaudeEngineActive(true);
    setHasClaudeKey(true);
    setClaudeActive(true);
    setClaudeKeyInput('');
    setClaudeEditing(false);
  }

  function toggleClaudeActive() {
    const next = !claudeActive;
    setClaudeEngineActive(next);
    setClaudeActive(next);
  }

  function forgetClaude() {
    clearClaudeKey();
    setHasClaudeKey(false);
    setClaudeActive(false);
    setClaudeEditing(false);
    setClaudeTestResult(null);
  }

  function unlockLightning() {
    const endpoint = lightningEndpointInput.trim();
    const key = lightningKeyInput.trim();
    if (!endpoint || !key) return;
    setLightningEndpoint(endpoint);
    setLightningApiKey(key);
    setHasLightningConfig(true);
    setLightningEndpointInput('');
    setLightningKeyInput('');
    setLightningEditing(false);
  }

  function forgetLightning() {
    clearLightningConfig();
    setHasLightningConfig(false);
    setLightningEditing(false);
  }

  // Explicit, opt-in only — never runs automatically. A real network call from
  // this browser to Anthropic using the visitor's own key, so they can confirm
  // "does my key actually work" before generating a full song with it.
  async function testClaudeKeyFn() {
    setClaudeTesting(true);
    setClaudeTestResult(null);
    try {
      const result = await testClaudeKey({ apiKey: getClaudeKey() ?? undefined });
      setClaudeTestResult(result);
    } finally {
      setClaudeTesting(false);
    }
  }

  return (
    <div className={`${styles.panel} ${styles.rackChassis}`}>
      <div className={styles.panelTitle}>🎛️ Engine Rack</div>
      <div className={styles.hint}>Swappable lyrical engines. The free unit drives everything; Claude Engine unlocks with your own Anthropic key.</div>

      {!tourSeen && (
        <div className={styles.rackTour}>
          <div className={styles.rackTourTitle}>How the rack works</div>
          <div className={styles.rackTourBody}>
            Each unit below is a lyrical engine — think of it like outboard gear in a
            recording studio. The <strong>Local Combinator</strong> is always on and free.
            The other slots unlock when you connect your own key: paste it, hit Unlock,
            and that engine lights up green and starts driving generation. Nothing you
            paste ever leaves your browser except straight to the provider it's for.
          </div>
          <button className={styles.ghostBtn} onClick={dismissTour}>Got it</button>
        </div>
      )}

      {/* Purely cosmetic — a power-strip fixture at the top of the chassis, like the
          conditioner unit at the top of a real studio rack. No function yet; a natural
          spot to grow into (e.g. session status) once there's something real to show. */}
      <div className={styles.rackPower} aria-hidden="true">
        <span className={styles.rackPowerLabel}>HERMES</span>
        <span className={styles.rackPowerVents} />
        <span className={styles.rackPowerLed} />
      </div>

      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ENGINE_UNITS.map((u) => {
          const isClaude = u.id === 'claude-engine';
          const isLightning = u.id === 'lightning-engine';

          const locked = isClaude ? !hasClaudeKey : isLightning ? !hasLightningConfig : u.locked;
          const isActive = isClaude ? hasClaudeKey && claudeActive : isLightning ? false : u.active;

          return (
            <div
              key={u.id}
              className={`${styles.flag} ${styles.rackUnit}`}
              style={{
                borderLeft: `3px solid ${isActive ? 'var(--good)' : locked ? 'var(--line-strong)' : 'var(--amber)'}`,
                opacity: locked ? 0.6 : 1,
              }}
            >
              <div className={styles.flagKind} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{locked ? '🔒 ' : isActive ? '🟢 ' : ''}{u.label}</span>
                <span
                  className={styles.chip}
                  style={{
                    marginLeft: 0,
                    color: isActive ? 'var(--good)' : u.tier === 'free' ? 'var(--cyan)' : 'var(--amber)',
                    borderColor: isActive ? 'rgba(87, 217, 138, 0.4)' : u.tier === 'free' ? 'rgba(54, 224, 212, 0.4)' : 'rgba(255, 177, 78, 0.4)',
                  }}
                >
                  {isActive ? 'active' : u.tier === 'free' ? 'free' : 'upgrade'}
                </span>
              </div>
              <div className={styles.hint} style={{ marginTop: 2 }}>{u.blurb}</div>
              {locked && u.unlockHint && (
                <div className={styles.hint} style={{ marginTop: 2, color: 'var(--amber)' }}>↑ {u.unlockHint}</div>
              )}

              {isClaude && (
                <KeyUnlockRow
                  promptLabel="🔑 Enter your Anthropic key"
                  locked={locked}
                  editing={claudeEditing}
                  onStartEdit={() => setClaudeEditing(true)}
                  onCancelEdit={() => { setClaudeEditing(false); setClaudeKeyInput(''); }}
                  onUnlock={unlockClaude}
                  unlockDisabled={!claudeKeyInput.trim()}
                  fields={[{ value: claudeKeyInput, onChange: setClaudeKeyInput, placeholder: 'sk-ant-...', type: 'password' }]}
                  configuredContent={
                    <>
                      <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className={styles.ghostBtn} onClick={toggleClaudeActive}>{claudeActive ? 'Turn off' : 'Turn on'}</button>
                        <button className={styles.ghostBtn} onClick={testClaudeKeyFn} disabled={claudeTesting} title="Makes one small, real request to api.anthropic.com with your key to confirm it works">
                          {claudeTesting ? 'Testing…' : '🔌 Test key'}
                        </button>
                        <button className={styles.ghostBtn} onClick={forgetClaude}>Forget key</button>
                      </div>
                      {claudeTestResult && (
                        <div className={styles.hint} style={{ marginTop: 4, color: claudeTestResult.ok ? 'var(--good)' : 'var(--bad)' }}>
                          {claudeTestResult.ok ? '✓ Claude API is working — connection confirmed.' : `✗ ${claudeTestResult.message}`}
                        </div>
                      )}
                    </>
                  }
                />
              )}

              {isLightning && (
                <KeyUnlockRow
                  promptLabel="⚡ Enter your Lightning endpoint"
                  locked={locked}
                  editing={lightningEditing}
                  onStartEdit={() => setLightningEditing(true)}
                  onCancelEdit={() => { setLightningEditing(false); setLightningEndpointInput(''); setLightningKeyInput(''); }}
                  onUnlock={unlockLightning}
                  unlockDisabled={!lightningEndpointInput.trim() || !lightningKeyInput.trim()}
                  fields={[
                    { value: lightningEndpointInput, onChange: setLightningEndpointInput, placeholder: 'https://your-lightning-endpoint.com/predict', type: 'url' },
                    { value: lightningKeyInput, onChange: setLightningKeyInput, placeholder: 'your-api-key', type: 'password' },
                  ]}
                  configuredContent={
                    <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className={styles.ghostBtn} onClick={forgetLightning}>Disconnect endpoint</button>
                      <span className={styles.hint} style={{ marginTop: 0 }}>🟢 Lightning endpoint configured</span>
                    </div>
                  }
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
