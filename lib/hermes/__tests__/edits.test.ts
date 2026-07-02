import { describe, it, expect, beforeEach } from 'vitest';
import { diffEdit, parseSections, renderSections } from '../edits';
import { recordTaste, loadTaste, exportVault, importVault, saveSong, listSongs, __clearVault } from '../storage';
import { recommend } from '../recommend';
import { learnProfile } from '../learn';
import { runPipeline } from '../pipeline';
import type { SongInputs } from '../types';

const idea: SongInputs = {
  title: 'E', theme: 'cold lonely grind', mood: 'dark', genre: 'trap',
  tempoMin: 130, tempoMax: 150, voice: 'hard', audience: 'crew', doNotUse: [], references: '', structure: 'hook-first',
};

describe('learn-from-edits', () => {
  beforeEach(() => __clearVault());

  it('diffs an edit into added/removed content words', () => {
    const d = diffEdit('walking through the concrete jungle', 'walking through the velvet midnight');
    expect(d.added).toContain('velvet');
    expect(d.added).toContain('midnight');
    expect(d.removed).toContain('concrete');
    expect(d.removed).toContain('jungle');
    expect(d.changed).toBe(true);
  });

  it('parses an edited lyric block back into sections', () => {
    const secs = parseSections('[Hook]\nline one\nline two\n\n[Verse 1]\nline three');
    expect(secs.length).toBe(2);
    expect(secs[0].label).toBe('Hook');
    expect(secs[0].lines).toEqual(['line one', 'line two']);
  });

  it('renderSections is the inverse of parseSections (round-trips)', () => {
    const text = '[Hook]\nline one\nline two\n\n[Verse 1]\nline three';
    expect(renderSections(parseSections(text))).toBe(text);
  });

  it('renderSections drops sections left with no lines (e.g. the Scribe editor deleted every line)', () => {
    const rendered = renderSections([{ label: 'Hook', lines: ['keep me'] }, { label: 'Verse 1', lines: [] }]);
    expect(rendered).toBe('[Hook]\nkeep me');
  });

  it('accumulates a taste model from edits', () => {
    recordTaste(['velvet', 'midnight'], ['concrete']);
    const t = recordTaste(['velvet'], ['concrete']);
    expect(t.liked['velvet']).toBe(2);
    expect(t.disliked['concrete']).toBe(2);
    expect(t.edits).toBe(2);
    expect(loadTaste().liked['velvet']).toBe(2);
  });

  it('a repeatedly-cut word becomes an exclusion recommendation', () => {
    recordTaste([], ['concrete']);
    recordTaste([], ['concrete']);
    const recs = recommend(learnProfile([]), [], loadTaste());
    const rec = recs.find((r) => r.action?.type === 'add-exclusion' && r.action.value === 'concrete');
    expect(rec).toBeTruthy();
  });

  it('does not re-recommend a word that is already excluded (e.g. auto-excluded)', () => {
    recordTaste([], ['concrete']);
    recordTaste([], ['concrete']);
    const recs = recommend(learnProfile([]), [], loadTaste(), ['concrete']);
    const rec = recs.find((r) => r.action?.type === 'add-exclusion' && r.action.value === 'concrete');
    expect(rec).toBeUndefined();
  });

  it('does not re-recommend an already-banned overused word, but still surfaces the next one', () => {
    const profile = {
      songCount: 3, topGenres: [], topMoods: [], themeKeywords: [], avgBanger: 80,
      avgUniqueness: 90, emotionRange: 0.5, leansDark: false,
      overusedWords: [{ word: 'skyline', count: 3 }, { word: 'railroad', count: 2 }],
      structuresUsed: [], weakHookCount: 0,
    };
    const recs = recommend(profile, [], undefined, ['skyline']);
    expect(recs.find((r) => r.action?.type === 'add-exclusion' && r.action.value === 'skyline')).toBeUndefined();
    expect(recs.find((r) => r.action?.type === 'add-exclusion' && r.action.value === 'railroad')).toBeTruthy();
  });
});

describe('vault export / import (durability)', () => {
  beforeEach(() => __clearVault());
  it('round-trips songs through export → import', async () => {
    const { pkg } = await runPipeline(idea, { id: 'a', now: '2026-01-01T00:00:00Z' });
    saveSong(pkg);
    const json = exportVault();
    __clearVault();
    expect(listSongs().length).toBe(0);
    const res = importVault(json);
    expect(res.songs).toBe(1);
    expect(listSongs().length).toBe(1);
    expect(listSongs()[0].title).toBe(pkg.title);
  });
  it('merge import does not duplicate existing ids', async () => {
    const { pkg } = await runPipeline(idea, { id: 'a', now: '2026-01-01T00:00:00Z' });
    saveSong(pkg);
    importVault(exportVault(), 'merge');
    expect(listSongs().length).toBe(1);
  });
});

describe('single source of truth (board ↔ package)', () => {
  it('agent outputs match the assembled package — they cannot drift', async () => {
    const { pkg, agentOutputs } = await runPipeline(idea, { id: 'x', now: '2026-01-01T00:00:00Z' });
    const hooksmith = agentOutputs.find((o) => o.id === 'hooksmith')!;
    expect((hooksmith.data as { chosenHook: unknown }).chosenHook).toEqual(pkg.chosenHook);
    const ar = agentOutputs.find((o) => o.id === 'ar-judge')!;
    expect((ar.data as { score: { total: number } }).score.total).toBe(pkg.score.total);
    // the package's agentOutputs ARE the emitted outputs
    expect(pkg.agentOutputs).toBe(agentOutputs);
  });
});
