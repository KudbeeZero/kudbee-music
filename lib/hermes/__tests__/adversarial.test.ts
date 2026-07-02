// Adversarial-input hardening — the "public traffic" suite. Every test here is an
// attack someone WILL try once the app is public: hostile vault imports (the one
// place raw JSON enters the engine), XSS through the shareable trace HTML, and
// pathological Song Lab inputs (NaN tempos, 100k-char themes, regex metachars,
// zalgo titles). The engine must never throw, never render an unescaped payload,
// and never store garbage it can't read back.
import { describe, it, expect, beforeEach } from 'vitest';
import {
  importVault, exportVault, listSongs, listAlbums, getSong, saveSong, __clearVault,
} from '../storage';
import { runPipeline } from '../pipeline';
import { buildTrace } from '../trace';
import { renderTraceHtml, esc } from '../traceHtml';
import { withChosenHook } from '../rescore';
import { sunoStyle, sunoLyrics } from '../suno';
import { albumGaps } from '../album';
import { checkOriginality } from '../originality';
import type { SongInputs, SongPackage, HookOption } from '../types';

const idea: SongInputs = {
  title: 'Baseline', theme: 'holding the line under pressure', mood: 'steady',
  genre: 'trap', tempoMin: 130, tempoMax: 150, voice: 'me', audience: 'the crew',
  doNotUse: [], references: '', structure: 'full-song',
};

async function validPkg(id = 'valid-1'): Promise<SongPackage> {
  const { pkg } = await runPipeline(idea, { id, now: '2026-01-01T00:00:00Z' });
  return pkg;
}

// ---------------------------------------------------------------- importVault
describe('importVault under hostile payloads', () => {
  beforeEach(() => __clearVault());

  it('rejects not-JSON without throwing and leaves the vault readable', () => {
    expect(importVault('{{{ not json')).toEqual({ songs: 0, albums: 0 });
    expect(importVault('')).toEqual({ songs: 0, albums: 0 });
    expect(listSongs()).toEqual([]);
  });

  it('rejects JSON that is not an object (null, number, string, array)', () => {
    for (const payload of ['null', '42', '"a string"', '[]', 'true']) {
      expect(() => importVault(payload)).not.toThrow();
      expect(importVault(payload)).toEqual({ songs: 0, albums: 0 });
    }
    expect(listSongs()).toEqual([]);
  });

  it('rejects non-array songs/albums fields', () => {
    expect(importVault('{"songs":"nope","albums":{"a":1}}')).toEqual({ songs: 0, albums: 0 });
    expect(listSongs()).toEqual([]);
  });

  it('drops garbage primitives inside the songs array', () => {
    const res = importVault(JSON.stringify({ songs: [1, 'x', null, true, [], {}] }));
    expect(res.songs).toBe(0);
    expect(listSongs()).toEqual([]);
  });

  it('preserves a valid rhymeScheme on import and drops a hostile one', async () => {
    const pkg = await validPkg('scheme-1');
    const withScheme = { ...pkg, inputs: { ...pkg.inputs, rhymeScheme: 'ABAB' } };
    importVault(JSON.stringify({ songs: [withScheme] }));
    expect(getSong('scheme-1')?.inputs.rhymeScheme).toBe('ABAB');
    __clearVault();
    const hostile = { ...pkg, id: 'scheme-2', inputs: { ...pkg.inputs, rhymeScheme: 'ZZZZ' } };
    importVault(JSON.stringify({ songs: [hostile] }));
    expect(getSong('scheme-2')?.inputs.rhymeScheme).toBeUndefined();
  });

  it('drops song objects missing required fields (no id / no title)', () => {
    const res = importVault(JSON.stringify({
      songs: [
        { lyrics: 'hello' },                    // nothing
        { id: 123, title: 'numeric id' },       // id wrong type
        { id: 'x1', title: { evil: true } },    // title wrong type
        { id: '', title: 'empty id' },          // empty id
      ],
    }));
    expect(res.songs).toBe(0);
    expect(listSongs()).toEqual([]);
  });

  it('does not pollute Object.prototype via __proto__ / constructor / prototype keys', async () => {
    const pkg = await validPkg('proto-1');
    const hostile = JSON.stringify({
      songs: [{ ...pkg, __proto__: { polluted: true }, constructor: { prototype: { polluted: true } } }],
      __proto__: { polluted: true },
      prototype: { polluted: true },
    }).replace('"songs"', '"__proto__":{"polluted":true},"songs"');
    expect(() => importVault(hostile)).not.toThrow();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty('polluted');
    // and the stored song must not carry the dangerous keys as own properties either
    const stored = listSongs();
    for (const s of stored) {
      expect(Object.getOwnPropertyNames(s)).not.toContain('__proto__');
      expect(Object.getOwnPropertyNames(s)).not.toContain('prototype');
    }
  });

  it('survives a ~5MB payload without throwing', async () => {
    const pkg = await validPkg('big-1');
    const big = { ...pkg, id: 'big-1', finalLyrics: 'x'.repeat(5 * 1024 * 1024) };
    const started = Date.now();
    expect(() => importVault(JSON.stringify({ songs: [big] }))).not.toThrow();
    expect(Date.now() - started).toBeLessThan(10_000);
    expect(() => listSongs()).not.toThrow();
  });

  it('deduplicates ids within a payload and across merges, and reports honest counts', async () => {
    const pkg = await validPkg('dup-1');
    const first = importVault(JSON.stringify({ songs: [pkg, { ...pkg }] })); // intra-payload dupe
    expect(first.songs).toBe(1);
    expect(listSongs().length).toBe(1);
    const again = importVault(JSON.stringify({ songs: [pkg] }), 'merge');    // re-import
    expect(again.songs).toBe(0);
    expect(listSongs().length).toBe(1);
  });

  it('replace-mode with garbage does not throw and leaves an empty-but-working vault', async () => {
    const pkg = await validPkg('r-1');
    importVault(JSON.stringify({ songs: [pkg] }));
    const res = importVault(JSON.stringify({ songs: [null, 'x', { id: 1 }] }), 'replace');
    expect(res.songs).toBe(0);
    expect(listSongs()).toEqual([]);
    expect(() => saveSong(pkg)).not.toThrow(); // vault still functional
  });

  it('drops garbage albums but accepts valid ones', () => {
    const res = importVault(JSON.stringify({
      albums: [
        null, 42, { id: 'a1' }, // missing title
        { id: 'a2', title: 'Real Album', concept: 'c', trackIds: ['s1', 7, null], createdAt: '2026-01-01T00:00:00Z' },
      ],
    }));
    expect(res.albums).toBe(1);
    const albums = listAlbums();
    expect(albums.length).toBe(1);
    expect(albums[0].trackIds).toEqual(['s1']); // non-string track ids dropped
  });

  it('after every hostile import, a valid round-trip export/import still works', async () => {
    importVault('{"songs":[{"__proto__":1},null,"x"]}');
    const pkg = await validPkg('rt-1');
    saveSong(pkg);
    const dump = exportVault();
    __clearVault();
    const res = importVault(dump);
    expect(res.songs).toBe(1);
    expect(getSong('rt-1')?.title).toBe('Baseline');
  });
});

// ---------------------------------------------------------------- trace XSS
describe('XSS through the shareable trace HTML', () => {
  const PAYLOADS = [
    '<script>alert(1)</script>',
    '"><img src=x onerror=alert(1)>',
    "'; -- </style><script>alert(2)</script>",
  ];

  it('esc() escapes the quintet & < > " \'', () => {
    expect(esc('& < > " \'')).toBe('&amp; &lt; &gt; &quot; &#39;');
    expect(esc('<script>')).not.toContain('<');
  });

  it('never renders hostile package fields unescaped', async () => {
    const hostileInputs: SongInputs = {
      ...idea,
      title: PAYLOADS[0],
      theme: PAYLOADS[1],
      mood: PAYLOADS[2],
      culture: '<svg onload=alert(3)>',
    };
    const { pkg } = await runPipeline(hostileInputs, { id: 'xss', now: '2026-01-01T00:00:00Z' });
    // poison the post-generation fields an import could also carry
    const poisoned: SongPackage = {
      ...pkg,
      title: PAYLOADS[0],
      conceptSummary: PAYLOADS[1],
      chosenHook: pkg.chosenHook ? { ...pkg.chosenHook, text: PAYLOADS[1] } : null,
      score: { ...pkg.score, verdict: PAYLOADS[0] },
      finalLyrics: PAYLOADS.join('\n'),
      sections: [{ label: PAYLOADS[1], lines: [...PAYLOADS] }],
    };
    const trace = buildTrace(poisoned, poisoned.inputs, 0);
    const html = renderTraceHtml(trace, { sunoStyle: sunoStyle(poisoned), sunoLyrics: sunoLyrics(poisoned) });

    expect(html).not.toContain('<script>alert');
    // escaped "onerror=" text is inert; what must never exist is an event handler
    // inside a REAL tag (attribute position)
    expect(html).not.toMatch(/<[^>]*\bonerror\s*=/i);
    expect(html).not.toMatch(/<[^>]*\bonload\s*=/i);
    expect(html).not.toContain('"><img');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<svg onload');
    // the payload must appear, but only escaped
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    // the real style block must not be closed early by user text
    expect(html.split('</style>').length).toBe(2); // exactly the one legitimate closer
  });
});

// ------------------------------------------------------- pathological pipeline
describe('pipeline under pathological inputs', () => {
  it('clamps NaN tempo to a sane BPM (no NaN in production notes)', async () => {
    const { pkg } = await runPipeline({ ...idea, tempoMin: NaN, tempoMax: NaN }, { id: 't1', now: '2026-01-01T00:00:00Z' });
    expect(Number.isFinite(pkg.production.tempoBpm)).toBe(true);
    expect(pkg.production.tempoBpm).toBeGreaterThanOrEqual(40);
    expect(pkg.production.tempoBpm).toBeLessThanOrEqual(260);
    expect(pkg.brief).not.toContain('NaN');
  });

  it.each([
    ['negative', -500, -10],
    ['zero', 0, 0],
    ['huge', 1e9, 1e9],
    ['inverted', 240, 60],
    ['infinite', -Infinity, Infinity],
  ])('clamps %s tempo range into [40, 260]', async (_label, min, max) => {
    const { pkg } = await runPipeline({ ...idea, tempoMin: min, tempoMax: max }, { id: 't2', now: '2026-01-01T00:00:00Z' });
    expect(pkg.production.tempoBpm).toBeGreaterThanOrEqual(40);
    expect(pkg.production.tempoBpm).toBeLessThanOrEqual(260);
    expect(pkg.inputs.tempoMin).toBeLessThanOrEqual(pkg.inputs.tempoMax);
  });

  it('caps a 100k-char theme: completes fast and output stays bounded', async () => {
    const theme = 'pressure and glory '.repeat(6000); // ~114k chars
    const started = Date.now();
    const { pkg } = await runPipeline({ ...idea, theme }, { id: 't3', now: '2026-01-01T00:00:00Z' });
    expect(Date.now() - started).toBeLessThan(5000);
    expect(pkg.inputs.theme.length).toBeLessThanOrEqual(2000);
    expect(pkg.brief.length).toBeLessThan(10_000);
    expect(pkg.score.total).toBeGreaterThanOrEqual(0);
  });

  it('returns a valid package for empty-string everything', async () => {
    const empty: SongInputs = {
      title: '', theme: '', mood: '', genre: '', tempoMin: NaN, tempoMax: NaN,
      voice: '', audience: '', doNotUse: [], references: '', structure: 'full-song',
    };
    const { pkg } = await runPipeline(empty, { id: 't4', now: '2026-01-01T00:00:00Z' });
    expect(pkg.title).toBe('Untitled');
    expect(Number.isFinite(pkg.score.total)).toBe(true);
    expect(Array.isArray(pkg.sections)).toBe(true);
    expect(Array.isArray(pkg.release)).toBe(true);
  });

  it('treats regex metacharacters in doNotUse as inert text', async () => {
    const evil = ['.*', '(', '[a-z]+', ')', '\\', '(?<x>'];
    await expect(runPipeline({ ...idea, doNotUse: evil }, { id: 't5', now: '2026-01-01T00:00:00Z' })).resolves.toBeTruthy();
    expect(() => checkOriginality('a normal line about the day\nanother honest line here', { bannedWords: evil })).not.toThrow();
    const report = checkOriginality('a normal line about the day', { bannedWords: evil });
    expect(report.bannedWordsHit).toEqual([]); // '.*' must not match everything
  });

  it('handles emoji / RTL / zalgo titles without throwing', async () => {
    const titles = ['🔥💯🎧', 'مرحبا بالعالم', 'Z̸̢̛a�W̷l̸g̵o̷ ̶t̸e̵x̷t̸'];
    for (const title of titles) {
      const { pkg } = await runPipeline({ ...idea, title }, { id: 't6-' + title.length, now: '2026-01-01T00:00:00Z' });
      expect(pkg.title).toBe(title);
      expect(() => renderTraceHtml(buildTrace(pkg, pkg.inputs, 0))).not.toThrow();
    }
  });

  it('originality check on huge lyrics (2k lines) finishes in a few seconds', () => {
    const lines: string[] = [];
    for (let i = 0; i < 2000; i++) lines.push(`line number ${i} walking through the ${i % 7} kind of weather today`);
    const lyrics = lines.join('\n');
    const prior = {
      id: 'p1', title: 'Prior', finalLyrics: lines.slice(0, 50).join('\n'),
      fingerprints: [] as string[],
    };
    const started = Date.now();
    expect(() => checkOriginality(lyrics, { priorSongs: [prior] })).not.toThrow();
    expect(Date.now() - started).toBeLessThan(5000);
  });
});

// -------------------------------------------------- degenerate imported packages
describe('degenerate imported songs are made safe for every consumer', () => {
  beforeEach(() => __clearVault());

  it('a minimal {id,title} import round-trips into a package no pure consumer chokes on', () => {
    const res = importVault(JSON.stringify({ songs: [{ id: 'min-1', title: 'Bare Bones' }] }));
    expect(res.songs).toBe(1);
    const s = getSong('min-1');
    expect(s).toBeTruthy();
    const pkg = s as SongPackage;
    // shape guarantees the components lean on
    expect(Array.isArray(pkg.sections)).toBe(true);
    expect(Array.isArray(pkg.hookOptions)).toBe(true);
    expect(Array.isArray(pkg.release)).toBe(true);
    expect(Array.isArray(pkg.viralClips)).toBe(true);
    expect(Number.isFinite(pkg.score.total)).toBe(true);
    expect(Number.isFinite(pkg.uniqueness.score)).toBe(true);
    // the pure functions the components call
    const hook: HookOption = { text: 'new hook', angle: 'a', cadence: 'c', score: 80 };
    expect(() => withChosenHook(pkg, hook)).not.toThrow();
    expect(() => buildTrace(pkg, pkg.inputs, pkg.seed ?? 0)).not.toThrow();
    expect(() => renderTraceHtml(buildTrace(pkg, pkg.inputs, pkg.seed ?? 0))).not.toThrow();
    expect(() => sunoStyle(pkg)).not.toThrow();
    expect(() => sunoLyrics(pkg)).not.toThrow();
    expect(() => albumGaps([pkg])).not.toThrow();
  });

  it('a song with wrong-typed nested fields is coerced, not crashed on', () => {
    const res = importVault(JSON.stringify({
      songs: [{
        id: 'coerce-1', title: 'Coerced',
        sections: [{ label: 'Hook', lines: ['a real line', 42, null] }, 'garbage', { label: 7 }],
        hookOptions: [null, { text: 'ok hook', angle: 'x', cadence: 'y', score: '90' }],
        score: { total: 'ninety', verdict: 9 },
        uniqueness: { score: null, flags: 'no', fingerprints: [1, 'f2'] },
        production: { tempoBpm: 'fast', instrumentation: 'strings', arrangement: null },
        viralClips: [{ label: 'clip', durationSec: 'long' }, false],
        release: [{ label: 'Title set', ok: 'yes' }],
      }],
    }));
    expect(res.songs).toBe(1);
    const pkg = getSong('coerce-1') as SongPackage;
    expect(pkg.sections.length).toBe(1);
    expect(pkg.sections[0].lines).toEqual(['a real line']);
    expect(Number.isFinite(pkg.score.total)).toBe(true);
    expect(typeof pkg.score.verdict).toBe('string');
    expect(Number.isFinite(pkg.uniqueness.score)).toBe(true);
    expect(pkg.uniqueness.fingerprints).toEqual(['f2']);
    expect(Number.isFinite(pkg.production.tempoBpm)).toBe(true);
    expect(() => renderTraceHtml(buildTrace(pkg, pkg.inputs, 0))).not.toThrow();
    expect(() => albumGaps([pkg])).not.toThrow();
  });
});

// -------------------------------------------------------------- seed honesty
describe('seed is stored on the package (the trace tells the truth)', () => {
  it('records opts.seed on the SongPackage and defaults to 0', async () => {
    const seeded = await runPipeline(idea, { id: 's7', now: '2026-01-01T00:00:00Z', seed: 7 });
    expect(seeded.pkg.seed).toBe(7);
    const unseeded = await runPipeline(idea, { id: 's0', now: '2026-01-01T00:00:00Z' });
    expect(unseeded.pkg.seed).toBe(0);
  });

  it('the seed survives an export/import round-trip', async () => {
    __clearVault();
    const { pkg } = await runPipeline(idea, { id: 's9', now: '2026-01-01T00:00:00Z', seed: 9 });
    saveSong(pkg);
    const dump = exportVault();
    __clearVault();
    importVault(dump);
    expect(getSong('s9')?.seed).toBe(9);
  });
});
