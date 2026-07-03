import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveSong, listSongs, importVault, __clearVault, __corruptLiveVault, __simulateVaultQuota,
  vaultBackupStatus, restoreFromBackup,
} from '../storage';
import { runPipeline } from '../pipeline';
import type { SongInputs } from '../types';

const idea: SongInputs = {
  title: 'Durable', theme: 'building something lasting', mood: 'hopeful',
  genre: 'trap', tempoMin: 130, tempoMax: 150, voice: 'me', audience: 'the team',
  doNotUse: [], references: '', structure: 'full-song',
};
const make = async (id: string, now: string) => (await runPipeline(idea, { id, now })).pkg;

describe('vault durability — backup mirror + restore', () => {
  beforeEach(() => __clearVault());

  it('writes a backup mirror alongside every save', async () => {
    saveSong(await make('a', '2026-01-01T00:00:00Z'));
    const s = vaultBackupStatus();
    expect(s.liveSongs).toBe(1);
    expect(s.backupSongs).toBe(1);
    expect(s.liveHealthy).toBe(true);
  });

  it('heals a corrupted live vault from the backup on read', async () => {
    saveSong(await make('a', '2026-01-01T00:00:00Z'));
    saveSong(await make('b', '2026-01-02T00:00:00Z'));
    expect(listSongs()).toHaveLength(2);

    __corruptLiveVault();
    expect(vaultBackupStatus().liveHealthy).toBe(false); // live is now garbage

    // reading transparently falls back to the backup AND heals the live key
    expect(listSongs()).toHaveLength(2);
    expect(vaultBackupStatus().liveHealthy).toBe(true);
  });

  it('restoreFromBackup re-materializes the catalog explicitly', async () => {
    saveSong(await make('a', '2026-01-01T00:00:00Z'));
    __corruptLiveVault();
    const restored = restoreFromBackup();
    expect(restored.songs).toBe(1);
    expect(listSongs()).toHaveLength(1);
  });

  it('reports empty status cleanly on a fresh vault', () => {
    const s = vaultBackupStatus();
    expect(s.liveSongs).toBe(0);
    expect(s.backupSongs).toBe(0);
  });
});

describe('vault durability — quota honesty + version-history cap (review weakness #2)', () => {
  beforeEach(() => __clearVault());

  it('saveSong reports persisted: false when storage is full (was silently swallowed)', async () => {
    const pkg = await make('q1', '2026-01-01T00:00:00Z');
    __simulateVaultQuota(true);
    const res = saveSong(pkg);
    expect(res.persisted).toBe(false);
    expect(res.song.version).toBe(1); // the in-memory package is still usable this session
    __simulateVaultQuota(false);
    expect(listSongs()).toHaveLength(0); // and honesty was warranted: nothing landed
  });

  it('a healthy save reports persisted: true', async () => {
    expect(saveSong(await make('q2', '2026-01-01T00:00:00Z')).persisted).toBe(true);
  });

  it('caps same-title version history at 5 (drops the oldest, keeps the newest)', async () => {
    for (let i = 1; i <= 7; i++) {
      saveSong(await make(`v${i}`, `2026-01-0${Math.min(i, 9)}T00:00:00Z`));
    }
    const all = listSongs();
    expect(all).toHaveLength(5);
    const versions = all.map((s) => s.version).sort((a, b) => a - b);
    expect(versions).toEqual([3, 4, 5, 6, 7]); // v1/v2 pruned, newest five kept
  });

  it('different titles are never pruned against each other', async () => {
    for (let i = 1; i <= 7; i++) {
      const pkg = await make(`t${i}`, '2026-01-01T00:00:00Z');
      saveSong({ ...pkg, title: `Song ${i}` });
    }
    expect(listSongs()).toHaveLength(7);
  });

  it('importVault reports 0 songs when the write does not land (audit fix)', async () => {
    const pkg = await make('imp-q', '2026-01-01T00:00:00Z');
    const payload = JSON.stringify({ songs: [pkg], albums: [] });
    __simulateVaultQuota(true);
    expect(importVault(payload).songs).toBe(0);
    __simulateVaultQuota(false);
    expect(listSongs()).toHaveLength(0); // and it truly didn't land
    expect(importVault(payload).songs).toBe(1); // healthy import reports honestly too
  });

  it('importVault holds imports to the same 5-version cap as saveSong (audit fix)', async () => {
    const base = await make('cap-0', '2026-01-01T00:00:00Z');
    const songs = Array.from({ length: 8 }, (_, i) => ({ ...base, id: `cap-${i}`, version: i + 1 }));
    importVault(JSON.stringify({ songs, albums: [] }), 'replace');
    const all = listSongs();
    expect(all).toHaveLength(5);
    expect(Math.min(...all.map((s) => s.version))).toBe(4); // newest five kept (4..8)
  });
});
