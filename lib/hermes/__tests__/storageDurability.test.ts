import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveSong, listSongs, __clearVault, __corruptLiveVault,
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
