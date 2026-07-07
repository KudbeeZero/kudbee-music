'use client';

import { useEffect, useState } from 'react';
import { ENGINE_UNITS } from '@/lib/hermes/engines';
import { getClaudeKey, setClaudeKey, clearClaudeKey, isClaudeEngineActive, setClaudeEngineActive } from '@/lib/hermes/claudeKey';
import { getLightningEndpoint, setLightningEndpoint, getLightningApiKey, setLightningApiKey, clearLightningConfig, lightningConfigured } from '@/lib/hermes/lightningKey';
import { testClaudeKey, type ClaudeKeyTestResult } from '@/lib/hermes/providers/claudeLyricsProvider';
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

  useEffect(() => {
    setHasClaudeKey(!!getClaudeKey());
    setClaudeActive(isClaudeEngineActive());
    setHasLightningConfig(lightningConfigured());
  }, []);

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
    <div className={styles.panel}>
      <div className={styles.panelTitle}>🎛️ Engine Rack</div>
      <div className={styles.hint}>Swappable lyrical engines. The free unit drives everything; Claude Engine unlocks with your own Anthropic key.</div>
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ENGINE_UNITS.map((u) => {
          const isClaude = u.id === 'claude-engine';
          const isLightning = u.id === 'lightning-engine';

          const locked = isClaude ? !hasClaudeKey : isLightning ? !hasLightningConfig : u.locked;
          const isActive = isClaude ? hasClaudeKey && claudeActive : isLightning ? false : u.active;

          return (
            <div
              key={u.id}
              className={styles.flag}
              style={{
                borderLeft: `3px solid ${isActive ? 'var(--good)' : locked ? 'var(--line-strong)' : 'var(--amber)'}`,
                opacity: locked ? 0.6 : 1,
              }}
            >
              <div className={styles.flagKind} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{locked ? '🔒 ' : isActive ? '🟢 ' : ''}{u.label}</span>
                <span className={styles.chip} style={{ marginLeft: 0 }}>
                  {isActive ? 'active' : u.tier === 'free' ? 'free' : 'upgrade'}
                </span>
              </div>
              <div className={styles.hint} style={{ marginTop: 2 }}>{u.blurb}</div>
              {locked && u.unlockHint && (
                <div className={styles.hint} style={{ marginTop: 2, color: 'var(--amber)' }}>↑ {u.unlockHint}</div>
              )}

              {/* Claude Engine Key Input */}
              {isClaude && locked && !claudeEditing && (
                <button className={styles.ghostBtn} style={{ marginTop: 6 }} onClick={() => setClaudeEditing(true)}>
                  🔑 Enter your Anthropic key
                </button>
              )}
              {isClaude && locked && claudeEditing && (
                <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                  <input
                    type="password"
                    autoComplete="off"
                    className={styles.input}
                    placeholder="sk-ant-..."
                    value={claudeKeyInput}
                    onChange={(e) => setClaudeKeyInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') unlockClaude(); }}
                    style={{ flex: 1 }}
                  />
                  <button className={styles.ghostBtn} onClick={unlockClaude} disabled={!claudeKeyInput.trim()}>Unlock</button>
                  <button className={styles.ghostBtn} onClick={() => { setClaudeEditing(false); setClaudeKeyInput(''); }}>Cancel</button>
                </div>
              )}
              {isClaude && hasClaudeKey && (
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
              )}

              {/* Lightning Engine Configuration */}
              {isLightning && locked && !lightningEditing && (
                <button className={styles.ghostBtn} style={{ marginTop: 6 }} onClick={() => setLightningEditing(true)}>
                  ⚡ Enter your Lightning endpoint
                </button>
              )}
              {isLightning && locked && lightningEditing && (
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input
                    type="url"
                    autoComplete="off"
                    className={styles.input}
                    placeholder="https://your-lightning-endpoint.com/predict"
                    value={lightningEndpointInput}
                    onChange={(e) => setLightningEndpointInput(e.target.value)}
                    style={{ width: '100%' }}
                  />
                  <input
                    type="password"
                    autoComplete="off"
                    className={styles.input}
                    placeholder="your-api-key"
                    value={lightningKeyInput}
                    onChange={(e) => setLightningKeyInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') unlockLightning(); }}
                    style={{ width: '100%' }}
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className={styles.ghostBtn} onClick={unlockLightning} disabled={!lightningEndpointInput.trim() || !lightningKeyInput.trim()}>Unlock</button>
                    <button className={styles.ghostBtn} onClick={() => { setLightningEditing(false); setLightningEndpointInput(''); setLightningKeyInput(''); }}>Cancel</button>
                  </div>
                </div>
              )}
              {isLightning && hasLightningConfig && (
                <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button className={styles.ghostBtn} onClick={forgetLightning}>Disconnect endpoint</button>
                  <span className={styles.hint} style={{ marginTop: 0 }}>🟢 Lightning endpoint configured</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
