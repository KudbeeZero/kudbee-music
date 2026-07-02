'use client';

import { useEffect, useState } from 'react';
import { ENGINE_UNITS } from '@/lib/hermes/engines';
import { getClaudeKey, setClaudeKey, clearClaudeKey, isClaudeEngineActive, setClaudeEngineActive } from '@/lib/hermes/claudeKey';
import styles from './hermes.module.css';

// The Pro Studio Rack — the lyrical engines as a DAW-style rack of modular units.
// The free Local Combinator is lit and active; Claude Engine is a bring-your-own-key
// slot — paste a key, it lives only in this browser, and this browser calls Anthropic
// directly (see the claudeKey.ts header comment for why that's the $0-safe design).
export default function Rack() {
  // Read from localStorage after mount only — server-rendered HTML has no
  // localStorage, so this starts "locked" and hydrates to the real state.
  const [hasKey, setHasKey] = useState(false);
  const [active, setActive] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setHasKey(!!getClaudeKey());
    setActive(isClaudeEngineActive());
  }, []);

  function unlock() {
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    setClaudeKey(trimmed);
    setClaudeEngineActive(true);
    setHasKey(true);
    setActive(true);
    setKeyInput('');
    setEditing(false);
  }

  function toggleActive() {
    const next = !active;
    setClaudeEngineActive(next);
    setActive(next);
  }

  function forget() {
    clearClaudeKey();
    setHasKey(false);
    setActive(false);
    setEditing(false);
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>🎛️ Engine Rack</div>
      <div className={styles.hint}>Swappable lyrical engines. The free unit drives everything; Claude Engine unlocks with your own Anthropic key.</div>
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ENGINE_UNITS.map((u) => {
          const isClaude = u.id === 'claude-engine';
          const locked = isClaude ? !hasKey : u.locked;
          const isActive = isClaude ? hasKey && active : u.active;
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

              {isClaude && locked && !editing && (
                <button className={styles.ghostBtn} style={{ marginTop: 6 }} onClick={() => setEditing(true)}>
                  🔑 Enter your Anthropic key
                </button>
              )}
              {isClaude && locked && editing && (
                <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                  <input
                    type="password"
                    autoComplete="off"
                    className={styles.input}
                    placeholder="sk-ant-..."
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') unlock(); }}
                    style={{ flex: 1 }}
                  />
                  <button className={styles.ghostBtn} onClick={unlock} disabled={!keyInput.trim()}>Unlock</button>
                  <button className={styles.ghostBtn} onClick={() => { setEditing(false); setKeyInput(''); }}>Cancel</button>
                </div>
              )}
              {isClaude && hasKey && (
                <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                  <button className={styles.ghostBtn} onClick={toggleActive}>{active ? 'Turn off' : 'Turn on'}</button>
                  <button className={styles.ghostBtn} onClick={forget}>Forget key</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
