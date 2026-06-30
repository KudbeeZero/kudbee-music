import { describe, it, expect, beforeEach } from 'vitest';
import { runPipeline } from '../pipeline';
import { sunoStyle, sunoLyrics, sunoTrack, albumSunoExport } from '../suno';
import { buildAlbum } from '../album';
import { saveAlbum, listAlbums, getAlbum, deleteAlbum, __clearVault } from '../storage';
import type { SongInputs, SongPackage } from '../types';

const idea: SongInputs = {
  title: 'Cold Hard Gold', theme: 'grind and loneliness', mood: 'dark, aggressive',
  genre: 'aggressive boom-bap hip-hop', tempoMin: 88, tempoMax: 92, voice: 'hard raw',
  audience: 'the lonely', doNotUse: [], references: '', structure: 'hook-first',
};

let pkg: SongPackage;
beforeEach(async () => {
  __clearVault();
  pkg = (await runPipeline(idea, { id: 'x', now: '2026-01-01T00:00:00Z' })).pkg;
});

describe('suno export', () => {
  it('builds a style string from the brief + production', () => {
    const s = sunoStyle(pkg);
    expect(s).toContain('aggressive boom-bap hip-hop');
    expect(s).toMatch(/\d+ bpm/);
    expect(s).toContain('no autotune');
  });
  it('builds a tagged lyric block', () => {
    const l = sunoLyrics(pkg);
    expect(l).toContain('[Hook]');
    expect(l.split('\n').length).toBeGreaterThan(3);
  });
  it('sunoTrack includes title, style, and lyrics', () => {
    const t = sunoTrack(pkg);
    expect(t).toContain('Cold Hard Gold');
    expect(t).toContain('Style of Music:');
    expect(t).toContain('Lyrics:');
  });
});

describe('album storage + export', () => {
  it('round-trips an album through storage', () => {
    const album = buildAlbum('My EP', [pkg], { id: 'a1', now: '2026-02-01T00:00:00Z' });
    saveAlbum(album);
    expect(listAlbums().length).toBe(1);
    expect(getAlbum('a1')?.title).toBe('My EP');
    deleteAlbum('a1');
    expect(listAlbums().length).toBe(0);
  });
  it('exports the whole album as one Suno block in track order', () => {
    const album = buildAlbum('My EP', [pkg], { id: 'a1', now: '2026-02-01T00:00:00Z' });
    const out = albumSunoExport(album, [pkg]);
    expect(out).toContain('# My EP');
    expect(out).toContain('1. ');
    expect(out).toContain('Cold Hard Gold');
    expect(out).toContain('Style of Music:');
  });
});
