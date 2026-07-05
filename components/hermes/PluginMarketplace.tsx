'use client';

import { useState } from 'react';
import {
  getAvailablePlugins,
  installPlugin,
  uninstallPlugin,
  getPluginMinTier,
  tierCanAccessPlugin,
  type Plugin,
  type PluginCategory,
} from '@/lib/hermes/plugins';
import { currentSubscription } from '@/lib/hermes/subscription';
import styles from './hermes.module.css';

const CATEGORY_ICONS: Record<PluginCategory, string> = {
  export: '⬇️',
  sync: '☁️',
  analytics: '📊',
  creative: '✨',
  workflow: '⚙️',
  integration: '🔗',
};

interface PluginCardProps {
  plugin: Plugin;
  userTier: string;
  onInstall: (pluginId: string) => void;
  onUninstall: (pluginId: string) => void;
}

function PluginCard({ plugin, userTier, onInstall, onUninstall }: PluginCardProps) {
  const canAccess = tierCanAccessPlugin(userTier as any, plugin.id);
  const icon = CATEGORY_ICONS[plugin.category];

  return (
    <div
      className={styles.pluginCard}
      style={{
        borderColor: canAccess ? 'var(--cyan)' : 'var(--line)',
        opacity: canAccess ? 1 : 0.6,
      }}
    >
      <div className={styles.pluginHeader}>
        <div className={styles.pluginMeta}>
          <span className={styles.pluginIcon}>{icon}</span>
          <div>
            <h3 className={styles.pluginName}>{plugin.name}</h3>
            <p className={styles.pluginAuthor}>by {plugin.author === 'hermes' ? 'WIFI DJ' : 'Third-party'}</p>
          </div>
        </div>
        <span className={styles.pluginVersion}>v{plugin.version}</span>
      </div>

      <p className={styles.pluginDescription}>{plugin.description}</p>

      <div className={styles.pluginFooter}>
        <div className={styles.pluginTierRequirement}>
          <span className={styles.tierBadge}>{plugin.minTier.toUpperCase()}</span>
          {!canAccess && <span className={styles.tierLocked}>Upgrade to unlock</span>}
        </div>

        {canAccess ? (
          <button
            className={styles.pluginActionBtn}
            onClick={() => (plugin.active ? onUninstall(plugin.id) : onInstall(plugin.id))}
            data-active={plugin.active}
          >
            {plugin.active ? '✓ Installed' : '+ Install'}
          </button>
        ) : (
          <button className={styles.pluginActionBtn} disabled>
            Locked
          </button>
        )}
      </div>
    </div>
  );
}

interface PluginMarketplaceProps {
  onClose?: () => void;
}

export default function PluginMarketplace({ onClose }: PluginMarketplaceProps) {
  const [plugins, setPlugins] = useState<Plugin[]>(() => getAvailablePlugins());
  const subscription = currentSubscription();
  const userTier = subscription.tier;

  const [activeCategory, setActiveCategory] = useState<PluginCategory | 'all'>('all');

  const categories: (PluginCategory | 'all')[] = ['all', 'export', 'sync', 'analytics', 'creative', 'workflow', 'integration'];

  const filteredPlugins =
    activeCategory === 'all' ? plugins : plugins.filter((p) => p.category === activeCategory);

  const handleInstall = (pluginId: string) => {
    installPlugin(pluginId);
    setPlugins(getAvailablePlugins());
  };

  const handleUninstall = (pluginId: string) => {
    uninstallPlugin(pluginId);
    setPlugins(getAvailablePlugins());
  };

  const installedCount = plugins.filter((p) => p.active).length;
  const canAccessCount = plugins.filter((p) => tierCanAccessPlugin(userTier as any, p.id)).length;

  return (
    <div className={styles.pluginMarketplace}>
      <div className={styles.marketplaceHeader}>
        <div>
          <h2 className={styles.marketplaceTitle}>Plugin Marketplace</h2>
          <p className={styles.marketplaceSubtitle}>
            Extend HERMES with {canAccessCount} available plugin{canAccessCount !== 1 ? 's' : ''} for {userTier.toUpperCase()}
          </p>
        </div>
        {onClose && (
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      <div className={styles.stats}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{installedCount}</span>
          <span className={styles.statLabel}>Installed</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{canAccessCount}</span>
          <span className={styles.statLabel}>Available</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{plugins.length}</span>
          <span className={styles.statLabel}>Total</span>
        </div>
      </div>

      <div className={styles.categoryFilter}>
        {categories.map((cat) => (
          <button
            key={cat}
            className={styles.categoryBtn}
            onClick={() => setActiveCategory(cat)}
            data-active={activeCategory === cat}
          >
            {cat === 'all' ? '🔷 All' : `${CATEGORY_ICONS[cat as PluginCategory]} ${cat}`}
          </button>
        ))}
      </div>

      <div className={styles.pluginGrid}>
        {filteredPlugins.map((plugin) => (
          <PluginCard
            key={plugin.id}
            plugin={plugin}
            userTier={userTier}
            onInstall={handleInstall}
            onUninstall={handleUninstall}
          />
        ))}
      </div>

      {filteredPlugins.length === 0 && (
        <div className={styles.emptyState}>
          <p>No plugins in this category</p>
        </div>
      )}
    </div>
  );
}
