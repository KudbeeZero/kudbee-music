import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getAvailablePlugins,
  getInstalledPlugins,
  installPlugin,
  uninstallPlugin,
  isPluginActive,
  getPluginMetadata,
  getPluginMinTier,
  tierCanAccessPlugin,
  __clearPlugins,
  type Plugin,
} from '../plugins';

describe('plugins', () => {
  beforeEach(() => {
    __clearPlugins();
  });

  afterEach(() => {
    __clearPlugins();
  });

  describe('getAvailablePlugins', () => {
    it('returns all first-party plugins', () => {
      const plugins = getAvailablePlugins();
      expect(plugins.length).toBeGreaterThan(0);
      expect(plugins.some((p) => p.id === 'stems-export')).toBe(true);
      expect(plugins.some((p) => p.id === 'cloud-sync')).toBe(true);
      expect(plugins.some((p) => p.id === 'advanced-analytics')).toBe(true);
    });

    it('marks installed plugins as active', () => {
      installPlugin('stems-export');
      const plugins = getAvailablePlugins();
      const stemsExport = plugins.find((p) => p.id === 'stems-export');
      expect(stemsExport?.active).toBe(true);
    });

    it('marks uninstalled plugins as inactive', () => {
      const plugins = getAvailablePlugins();
      const stemsExport = plugins.find((p) => p.id === 'stems-export');
      expect(stemsExport?.active).toBe(false);
    });
  });

  describe('getInstalledPlugins', () => {
    it('returns empty array initially', () => {
      const installed = getInstalledPlugins();
      expect(installed).toEqual([]);
    });

    it('returns installed plugins after install', () => {
      installPlugin('stems-export');
      const installed = getInstalledPlugins();
      expect(installed.length).toBe(1);
      expect(installed[0].id).toBe('stems-export');
      expect(installed[0].active).toBe(true);
    });

    it('returns multiple installed plugins', () => {
      installPlugin('stems-export');
      installPlugin('cloud-sync');
      const installed = getInstalledPlugins();
      expect(installed.length).toBe(2);
    });
  });

  describe('installPlugin', () => {
    it('installs a valid plugin', () => {
      const plugin = installPlugin('stems-export');
      expect(plugin).not.toBeNull();
      expect(plugin?.id).toBe('stems-export');
      expect(plugin?.active).toBe(true);
      expect(plugin?.installTime).toBeGreaterThan(0);
    });

    it('returns null for invalid plugin', () => {
      const plugin = installPlugin('non-existent-plugin');
      expect(plugin).toBeNull();
    });

    it('does not duplicate install', () => {
      installPlugin('stems-export');
      installPlugin('stems-export');
      const installed = getInstalledPlugins();
      expect(installed.length).toBe(1);
    });

    it('persists install to storage', () => {
      installPlugin('stems-export');
      const installed = getInstalledPlugins();
      expect(installed[0].id).toBe('stems-export');
    });
  });

  describe('uninstallPlugin', () => {
    it('removes installed plugin', () => {
      installPlugin('stems-export');
      uninstallPlugin('stems-export');
      const installed = getInstalledPlugins();
      expect(installed.length).toBe(0);
    });

    it('does not error on uninstalling non-existent plugin', () => {
      expect(() => uninstallPlugin('non-existent')).not.toThrow();
    });

    it('preserves other installed plugins', () => {
      installPlugin('stems-export');
      installPlugin('cloud-sync');
      uninstallPlugin('stems-export');
      const installed = getInstalledPlugins();
      expect(installed.length).toBe(1);
      expect(installed[0].id).toBe('cloud-sync');
    });
  });

  describe('isPluginActive', () => {
    it('returns true for installed plugin', () => {
      installPlugin('stems-export');
      expect(isPluginActive('stems-export')).toBe(true);
    });

    it('returns false for uninstalled plugin', () => {
      expect(isPluginActive('stems-export')).toBe(false);
    });

    it('returns false for non-existent plugin', () => {
      expect(isPluginActive('non-existent')).toBe(false);
    });
  });

  describe('getPluginMetadata', () => {
    it('returns metadata for valid plugin', () => {
      const meta = getPluginMetadata('stems-export');
      expect(meta).not.toBeNull();
      expect(meta?.name).toBe('Stems Export');
      expect(meta?.minTier).toBe('pro');
      expect(meta?.category).toBe('export');
    });

    it('returns null for invalid plugin', () => {
      const meta = getPluginMetadata('non-existent');
      expect(meta).toBeNull();
    });

    it('returns correct minTier for each plugin', () => {
      const stemsExport = getPluginMetadata('stems-export');
      expect(stemsExport?.minTier).toBe('pro');

      const advancedAnalytics = getPluginMetadata('advanced-analytics');
      expect(advancedAnalytics?.minTier).toBe('premium');

      const whiteLabelPlugin = getPluginMetadata('white-label');
      expect(whiteLabelPlugin?.minTier).toBe('enterprise');
    });
  });

  describe('getPluginMinTier', () => {
    it('returns minTier for valid plugin', () => {
      expect(getPluginMinTier('stems-export')).toBe('pro');
      expect(getPluginMinTier('advanced-analytics')).toBe('premium');
      expect(getPluginMinTier('white-label')).toBe('enterprise');
    });

    it('returns null for invalid plugin', () => {
      expect(getPluginMinTier('non-existent')).toBeNull();
    });
  });

  describe('tierCanAccessPlugin', () => {
    it('free tier cannot access pro plugins', () => {
      expect(tierCanAccessPlugin('free', 'stems-export')).toBe(false);
      expect(tierCanAccessPlugin('free', 'cloud-sync')).toBe(false);
    });

    it('pro tier can access pro plugins', () => {
      expect(tierCanAccessPlugin('pro', 'stems-export')).toBe(true);
      expect(tierCanAccessPlugin('pro', 'cloud-sync')).toBe(true);
    });

    it('pro tier cannot access premium plugins', () => {
      expect(tierCanAccessPlugin('pro', 'advanced-analytics')).toBe(false);
      expect(tierCanAccessPlugin('pro', 'mastering-assistant')).toBe(false);
    });

    it('premium tier can access pro and premium plugins', () => {
      expect(tierCanAccessPlugin('premium', 'stems-export')).toBe(true);
      expect(tierCanAccessPlugin('premium', 'advanced-analytics')).toBe(true);
    });

    it('premium tier cannot access enterprise plugins', () => {
      expect(tierCanAccessPlugin('premium', 'white-label')).toBe(false);
    });

    it('enterprise tier can access all plugins', () => {
      expect(tierCanAccessPlugin('enterprise', 'stems-export')).toBe(true);
      expect(tierCanAccessPlugin('enterprise', 'advanced-analytics')).toBe(true);
      expect(tierCanAccessPlugin('enterprise', 'white-label')).toBe(true);
    });

    it('returns false for invalid plugin', () => {
      expect(tierCanAccessPlugin('pro', 'non-existent')).toBe(false);
    });
  });

  describe('plugin metadata validation', () => {
    it('all first-party plugins have valid metadata', () => {
      const plugins = getAvailablePlugins();
      for (const plugin of plugins) {
        expect(plugin.id).toBeTruthy();
        expect(plugin.name).toBeTruthy();
        expect(plugin.category).toBeTruthy();
        expect(plugin.minTier).toBeTruthy();
        expect(plugin.version).toBeTruthy();
        expect(plugin.description).toBeTruthy();
        expect(plugin.author).toBe('hermes');
      }
    });

    it('plugins are categorized correctly', () => {
      const validCategories = ['export', 'sync', 'analytics', 'creative', 'workflow', 'integration'];
      const plugins = getAvailablePlugins();
      for (const plugin of plugins) {
        expect(validCategories).toContain(plugin.category);
      }
    });
  });

  describe('plugin lifecycle', () => {
    it('installs, activates, and uninstalls a plugin', () => {
      expect(isPluginActive('stems-export')).toBe(false);

      installPlugin('stems-export');
      expect(isPluginActive('stems-export')).toBe(true);

      uninstallPlugin('stems-export');
      expect(isPluginActive('stems-export')).toBe(false);
    });

    it('manages multiple plugins independently', () => {
      installPlugin('stems-export');
      installPlugin('cloud-sync');

      expect(isPluginActive('stems-export')).toBe(true);
      expect(isPluginActive('cloud-sync')).toBe(true);

      uninstallPlugin('stems-export');

      expect(isPluginActive('stems-export')).toBe(false);
      expect(isPluginActive('cloud-sync')).toBe(true);
    });
  });

  describe('storage isolation', () => {
    it('persists and restores plugins', () => {
      installPlugin('stems-export');
      installPlugin('advanced-analytics');

      let installed = getInstalledPlugins();
      expect(installed.length).toBe(2);

      __clearPlugins();
      installed = getInstalledPlugins();
      expect(installed.length).toBe(0);

      installPlugin('stems-export');
      installed = getInstalledPlugins();
      expect(installed.length).toBe(1);
    });
  });
});
