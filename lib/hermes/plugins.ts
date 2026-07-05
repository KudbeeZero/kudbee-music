// Plugin registry — first-party and third-party plugins available on tiers.
// Plugins extend HERMES capabilities (stems export, cloud sync, advanced analytics, etc.).
// Install/activate per-user via localStorage. Revenue model: tier gating + marketplace.

import { SubscriptionTier } from './subscription';

export type PluginCategory = 'export' | 'sync' | 'analytics' | 'creative' | 'workflow' | 'integration';

export interface PluginMetadata {
  id: string; // kebab-case identifier
  name: string; // display name
  category: PluginCategory;
  minTier: SubscriptionTier; // minimum tier required
  version: string;
  description: string;
  author: 'hermes' | 'third-party'; // 'hermes' = first-party, 'third-party' = marketplace
}

export interface Plugin extends PluginMetadata {
  active: boolean; // user has installed + activated it
  installTime?: number; // when user activated
}

// First-party plugins — built-in, available per tier
const FIRST_PARTY_PLUGINS: Record<string, PluginMetadata> = {
  'stems-export': {
    id: 'stems-export',
    name: 'Stems Export',
    category: 'export',
    minTier: 'pro',
    version: '1.0.0',
    description: 'Export individual vocal, beat, and instrumental stems as separate audio files.',
    author: 'hermes',
  },
  'cloud-sync': {
    id: 'cloud-sync',
    name: 'Cloud Sync',
    category: 'sync',
    minTier: 'pro',
    version: '1.0.0',
    description: 'Sync your vault across devices via cloud storage (Dropbox, iCloud, Google Drive).',
    author: 'hermes',
  },
  'suno-batch-export': {
    id: 'suno-batch-export',
    name: 'Suno Batch Export',
    category: 'export',
    minTier: 'pro',
    version: '1.0.0',
    description: 'Export multiple songs as Suno-ready UVN prompts in one operation.',
    author: 'hermes',
  },
  'advanced-analytics': {
    id: 'advanced-analytics',
    name: 'Advanced Analytics',
    category: 'analytics',
    minTier: 'premium',
    version: '1.0.0',
    description: 'Deep dive into lyric patterns, rhyme density, emotional arc, and originality trends.',
    author: 'hermes',
  },
  'mastering-assistant': {
    id: 'mastering-assistant',
    name: 'Mastering Assistant',
    category: 'creative',
    minTier: 'premium',
    version: '1.0.0',
    description: 'AI-powered mastering recommendations for loudness, EQ, and mix balance per mood.',
    author: 'hermes',
  },
  'collaboration-tools': {
    id: 'collaboration-tools',
    name: 'Collaboration Tools',
    category: 'workflow',
    minTier: 'premium',
    version: '1.0.0',
    description: 'Share songs with collaborators, comment on sections, real-time co-writing sessions.',
    author: 'hermes',
  },
  'api-access': {
    id: 'api-access',
    name: 'API Access',
    category: 'integration',
    minTier: 'premium',
    version: '1.0.0',
    description: 'Programmatic access to generate songs, fetch vault, and integrate with your tools.',
    author: 'hermes',
  },
  'white-label': {
    id: 'white-label',
    name: 'White Label',
    category: 'workflow',
    minTier: 'enterprise',
    version: '1.0.0',
    description: 'Custom branding, domain, and white-label deployment for your users.',
    author: 'hermes',
  },
};

const PLUGINS_KEY = 'hermes.plugins.v1';

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

/**
 * Get all available plugins (first-party + marketplace), with installation status.
 */
export function getAvailablePlugins(): Plugin[] {
  const installed = getInstalledPlugins();
  const installed_ids = new Set(installed.map((p) => p.id));

  return Object.values(FIRST_PARTY_PLUGINS).map((meta) => ({
    ...meta,
    active: installed_ids.has(meta.id),
    installTime: installed.find((p) => p.id === meta.id)?.installTime,
  }));
}

/**
 * Get only installed plugins.
 */
export function getInstalledPlugins(): Plugin[] {
  try {
    const raw = kv().getItem(PLUGINS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((p): p is Plugin => {
        return typeof p === 'object' && p && typeof (p as any).id === 'string';
      });
    }
  } catch {
    /* fallthrough */
  }
  return [];
}

/**
 * Install a plugin (add to user's active list).
 */
export function installPlugin(pluginId: string): Plugin | null {
  const plugin = FIRST_PARTY_PLUGINS[pluginId];
  if (!plugin) return null;

  const installed = getInstalledPlugins();
  if (installed.find((p) => p.id === pluginId)) {
    // Already installed
    return installed.find((p) => p.id === pluginId) as Plugin;
  }

  const newPlugin: Plugin = {
    ...plugin,
    active: true,
    installTime: Date.now(),
  };

  installed.push(newPlugin);
  try {
    kv().setItem(PLUGINS_KEY, JSON.stringify(installed));
  } catch {
    /* quota — plugin still works for this session */
  }

  return newPlugin;
}

/**
 * Uninstall a plugin (remove from active list).
 */
export function uninstallPlugin(pluginId: string): void {
  const installed = getInstalledPlugins();
  const filtered = installed.filter((p) => p.id !== pluginId);
  try {
    if (filtered.length === 0) {
      kv().removeItem(PLUGINS_KEY);
    } else {
      kv().setItem(PLUGINS_KEY, JSON.stringify(filtered));
    }
  } catch {
    /* ignore */
  }
}

/**
 * Check if a plugin is installed and active.
 */
export function isPluginActive(pluginId: string): boolean {
  return getInstalledPlugins().some((p) => p.id === pluginId && p.active);
}

/**
 * Get a specific plugin's metadata.
 */
export function getPluginMetadata(pluginId: string): PluginMetadata | null {
  return FIRST_PARTY_PLUGINS[pluginId] ?? null;
}

/**
 * Get the minimum tier required to access a plugin.
 */
export function getPluginMinTier(pluginId: string): SubscriptionTier | null {
  const plugin = FIRST_PARTY_PLUGINS[pluginId];
  return plugin?.minTier ?? null;
}

/**
 * Check if a tier has access to a plugin (not installed, just licensed).
 */
export function tierCanAccessPlugin(tier: SubscriptionTier, pluginId: string): boolean {
  const plugin = FIRST_PARTY_PLUGINS[pluginId];
  if (!plugin) return false;

  const tiers: SubscriptionTier[] = ['free', 'pro', 'premium', 'enterprise'];
  const tierIndex = tiers.indexOf(tier);
  const minIndex = tiers.indexOf(plugin.minTier);
  return tierIndex >= minIndex;
}

/** test-only reset */
export function __clearPlugins(): void {
  memory.clear();
  try {
    kv().removeItem(PLUGINS_KEY);
  } catch {
    /* ignore */
  }
}
