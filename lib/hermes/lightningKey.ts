// Bring-your-own-key storage for Lightning Engine line rewrites. Mirrors claudeKey.ts.
// Visitor's Lightning endpoint + token live only in their browser's localStorage —
// their browser calls their endpoint directly, never routes through our server.
// See docs/lightning-plan.md.

const LIGHTNING_ENDPOINT_KEY = 'hermes.lightningEndpoint.v1';
const LIGHTNING_API_KEY = 'hermes.lightningApiKey.v1';

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

/** The visitor's Lightning endpoint URL, or null if not configured. */
export function getLightningEndpoint(): string | null {
  try {
    const raw = kv().getItem(LIGHTNING_ENDPOINT_KEY);
    return raw && raw.trim() ? raw : null;
  } catch {
    return null;
  }
}

/** Store the visitor's Lightning endpoint. */
export function setLightningEndpoint(endpoint: string): void {
  try {
    kv().setItem(LIGHTNING_ENDPOINT_KEY, endpoint.trim());
  } catch {
    /* quota / unavailable — still works for this session via memoryKV */
  }
}

/** The visitor's Lightning API key (bearer token), or null if not configured. */
export function getLightningApiKey(): string | null {
  try {
    const raw = kv().getItem(LIGHTNING_API_KEY);
    return raw && raw.trim() ? raw : null;
  } catch {
    return null;
  }
}

/** Store the visitor's Lightning API key. */
export function setLightningApiKey(key: string): void {
  try {
    kv().setItem(LIGHTNING_API_KEY, key.trim());
  } catch {
    /* quota / unavailable */
  }
}

/** Clear both endpoint and key. */
export function clearLightningConfig(): void {
  try {
    kv().removeItem(LIGHTNING_ENDPOINT_KEY);
    kv().removeItem(LIGHTNING_API_KEY);
  } catch {
    /* ignore */
  }
}

/** True only when both endpoint and key are configured. */
export function lightningConfigured(): boolean {
  return !!getLightningEndpoint() && !!getLightningApiKey();
}

/** test-only reset */
export function __clearLightningKeyState(): void {
  memory.clear();
  try {
    kv().removeItem(LIGHTNING_ENDPOINT_KEY);
    kv().removeItem(LIGHTNING_API_KEY);
  } catch {
    /* ignore */
  }
}
