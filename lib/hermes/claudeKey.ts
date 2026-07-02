// Bring-your-own-key storage for the Claude Engine rack unit. The ONLY safe design
// for a $0, server-less static app: each visitor's own Anthropic key lives only in
// their own browser's localStorage and their own browser calls api.anthropic.com
// directly with it (see the `anthropic-dangerous-direct-browser-access` header in
// claudeLyricsProvider.ts) — no key ever reaches a server or repo we control, so
// this satisfies SECURITY.md's "no hosted deployment may proxy to a paid API"
// rule without needing a proxy, rate limiting, or a spend cap. See docs/claude-engine.md.
//
// Same in-memory-fallback KV idiom as identity.ts, so this module is SSR/test-safe.

const CLAUDE_KEY_KEY = 'hermes.claudeKey.v1';
const CLAUDE_ACTIVE_KEY = 'hermes.claudeEngineActive.v1';

interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

const memory = new Map<string, string>();
const memoryKV: KV = {
  getItem: (k) => (memory.has(k) ? memory.get(k)! : null),
  setItem: (k, v) => void memory.set(k, v),
  removeItem: (k) => void memory.delete(k),
};

function kv(): KV {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  return memoryKV;
}

/** The visitor's own Anthropic key, or null if none is stored in this browser. */
export function getClaudeKey(): string | null {
  try {
    const raw = kv().getItem(CLAUDE_KEY_KEY);
    return raw && raw.trim() ? raw : null;
  } catch {
    return null;
  }
}

/** Store the visitor's own key in THIS browser only. Never sent anywhere but api.anthropic.com. */
export function setClaudeKey(key: string): void {
  try {
    kv().setItem(CLAUDE_KEY_KEY, key.trim());
  } catch {
    /* quota / unavailable — the key still works for this session via memoryKV */
  }
}

/** Forget the key and turn the engine back off — the "eject" control. */
export function clearClaudeKey(): void {
  try {
    kv().removeItem(CLAUDE_KEY_KEY);
    kv().removeItem(CLAUDE_ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}

/** Whether the visitor has flipped the Claude Engine's active toggle on. */
export function isClaudeEngineActive(): boolean {
  try {
    return kv().getItem(CLAUDE_ACTIVE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setClaudeEngineActive(active: boolean): void {
  try {
    if (active) kv().setItem(CLAUDE_ACTIVE_KEY, '1');
    else kv().removeItem(CLAUDE_ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}

/** True only when a key is stored AND the visitor has switched the engine on. */
export function claudeEngineReady(): boolean {
  return !!getClaudeKey() && isClaudeEngineActive();
}

/** test-only reset */
export function __clearClaudeKeyState(): void {
  memory.clear();
  try {
    kv().removeItem(CLAUDE_KEY_KEY);
    kv().removeItem(CLAUDE_ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}
