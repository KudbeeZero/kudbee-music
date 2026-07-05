import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runPipeline } from '../pipeline';
import { sanitizeSong } from '../storage';
import {
  songToTrainingExamples,
  toAlpacaJsonl,
  toChatJsonl,
  datasetStats,
  dedupeByOutput,
  type TrainingExample,
} from '../trainingData';
import type { SongInputs, SongPackage } from '../types';

const NOW = '2026-01-01T00:00:00Z';

/** Loads the committed golden set (real, human-reviewed songs) as extra source material —
 *  same paths eval.test.ts already treats as the quality baseline. */
function loadGolden(): SongPackage[] {
  const root = join(process.cwd(), 'examples');
  const paths = [
    join(root, 'cold-hard-gold', 'song.json'),
    ...readdirSync(join(root, 'demos'))
      .filter((d) => !d.endsWith('.md'))
      .map((d) => join(root, 'demos', d, 'song.json')),
  ];
  return paths.map((p) => JSON.parse(readFileSync(p, 'utf8')) as SongPackage);
}

/** A founder-provided drop folder (gitignored contents) for real vault/brain exports or
 *  loose song.json files — see training-data-input/README.md. Entirely optional; the
 *  generator works fine with zero files here. */
function loadFounderExports(): SongPackage[] {
  const dir = join(process.cwd(), 'training-data-input');
  if (!existsSync(dir)) return [];
  const out: SongPackage[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    let data: unknown;
    try {
      data = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    } catch {
      continue;
    }
    const candidates: unknown[] =
      data && typeof data === 'object' && Array.isArray((data as { songs?: unknown }).songs)
        ? (data as { songs: unknown[] }).songs
        : data && typeof data === 'object' && Array.isArray((data as { vault?: { songs?: unknown } }).vault?.songs)
          ? (data as { vault: { songs: unknown[] } }).vault.songs
          : [data];
    for (const c of candidates) {
      const s = sanitizeSong(c);
      if (s) out.push(s);
    }
  }
  return out;
}

// 10 diverse, wholly original briefs (new coverage, not a re-run of the 5 golden-demo
// themes) crossed against every pattern pack (brain/patternPacks.json) for structure +
// rhyme-scheme variety. Fixed inputs + fixed seeds ⇒ byte-identical output every run
// (Iron Law #1) — this is $0/local generation, no API key, no GPU.
const SYNTHETIC_THEMES: SongInputs[] = [
  { title: 'Borrowed Time', theme: 'racing the clock on a dream everyone said give up on', mood: 'urgent, wired, hopeful', genre: 'pop-punk', tempoMin: 150, tempoMax: 160, voice: 'raw, breathless', audience: 'anyone still chasing it', doNotUse: [], references: '', structure: 'hook-first' },
  { title: 'Low Tide', theme: 'the quiet after a breakup where you finally hear yourself think', mood: 'still, aching, clear-headed', genre: 'bedroom pop', tempoMin: 84, tempoMax: 92, voice: 'soft, intimate', audience: 'anyone starting over', doNotUse: [], references: '', structure: 'verse-first' },
  { title: 'Wire and Static', theme: 'a long-distance friendship that survived everything except silence', mood: 'wistful, warm, a little sad', genre: 'indie folk', tempoMin: 92, tempoMax: 100, voice: 'plainspoken', audience: 'old friends', doNotUse: [], references: '', structure: 'full-song' },
  { title: 'Corner Office', theme: 'realizing the promotion cost more than it paid', mood: 'wry, tired, resolute', genre: 'alt-R&B', tempoMin: 88, tempoMax: 96, voice: 'cool, controlled', audience: 'anyone burning out quietly', doNotUse: [], references: '', structure: 'radio-edit' },
  { title: 'Fireproof', theme: 'choosing to stay and rebuild instead of running', mood: 'steady, defiant, warm', genre: 'anthemic rock', tempoMin: 118, tempoMax: 128, voice: 'gravelly', audience: 'the ones who stayed', doNotUse: [], references: '', structure: 'hook-first' },
  { title: 'Understudy', theme: 'being second choice and deciding that\'s not the same as small', mood: 'proud, sharp, unbothered', genre: 'pop', tempoMin: 104, tempoMax: 112, voice: 'confident, playful', audience: 'anyone counted out', doNotUse: [], references: '', structure: 'short-form' },
  { title: 'Analog Heart', theme: 'loving someone the old-fashioned way in a fast digital world', mood: 'warm, sincere, a little shy', genre: 'soul', tempoMin: 76, tempoMax: 84, voice: 'tender', audience: 'a slow-burn love', doNotUse: [], references: '', structure: 'verse-first' },
  { title: 'Gravel Road', theme: 'leaving the small town that made you to become who you actually are', mood: 'bittersweet, brave, dusty', genre: 'country-rap', tempoMin: 90, tempoMax: 98, voice: 'plain, honest', audience: 'anyone leaving home', doNotUse: [], references: '', structure: 'full-song' },
  { title: 'Static Bloom', theme: 'finding beauty and growth inside a genuinely bad year', mood: 'bruised, hopeful, quietly triumphant', genre: 'dream pop', tempoMin: 96, tempoMax: 104, voice: 'airy', audience: 'anyone rebuilding', doNotUse: [], references: '', structure: 'hook-first' },
  { title: 'No Encore', theme: 'walking away from something everyone expects you to keep doing', mood: 'calm, certain, unapologetic', genre: 'alt-pop', tempoMin: 110, tempoMax: 118, voice: 'measured, cool', audience: 'anyone quitting on their own terms', doNotUse: [], references: '', structure: 'radio-edit' },
];

const PATTERN_PACKS: { rhymeScheme: SongInputs['rhymeScheme'] }[] = [
  { rhymeScheme: 'AABB' },
  { rhymeScheme: 'ABAB' },
  { rhymeScheme: 'ABBA' },
  { rhymeScheme: 'AAAA' },
  { rhymeScheme: 'XAXA' },
];

const SEEDS = [1, 2];

async function synthesize(): Promise<SongPackage[]> {
  const pkgs: SongPackage[] = [];
  for (const [ti, base] of SYNTHETIC_THEMES.entries()) {
    for (const pack of PATTERN_PACKS) {
      for (const seed of SEEDS) {
        const inputs: SongInputs = { ...base, rhymeScheme: pack.rhymeScheme };
        const id = `synth-${ti}-${pack.rhymeScheme}-${seed}`;
        const { pkg } = await runPipeline(inputs, { id, now: NOW, seed });
        pkgs.push(pkg);
      }
    }
  }
  return pkgs;
}

describe('training-data extraction (Lightning AI fine-tuning prep)', () => {
  it('extracts a lyrics example with the real brief and finalLyrics', async () => {
    const { pkg } = await runPipeline(SYNTHETIC_THEMES[0], { id: 't1', now: NOW, seed: 1 });
    const examples = songToTrainingExamples(pkg);
    const lyrics = examples.find((e) => e.task === 'lyrics');
    expect(lyrics).toBeTruthy();
    expect(lyrics?.input).toBe(pkg.brief);
    expect(lyrics?.output).toBe(pkg.finalLyrics);
  });

  it('extracts production, album-cover, and video-treatment examples when present', async () => {
    const { pkg } = await runPipeline(SYNTHETIC_THEMES[1], { id: 't2', now: NOW, seed: 1 });
    const examples = songToTrainingExamples(pkg);
    expect(examples.map((e) => e.task).sort()).toEqual(
      ['album-cover-prompt', 'lyrics', 'production', 'scribe-line-rewrite', 'video-treatment'].sort()
    );
  });

  it('is deterministic — same inputs + seed produce byte-identical training examples', async () => {
    const a = await runPipeline(SYNTHETIC_THEMES[2], { id: 't3', now: NOW, seed: 5 });
    const b = await runPipeline(SYNTHETIC_THEMES[2], { id: 't3', now: NOW, seed: 5 });
    expect(songToTrainingExamples(a.pkg)).toEqual(songToTrainingExamples(b.pkg));
  });

  it('toAlpacaJsonl / toChatJsonl produce one valid JSON object per line', async () => {
    const { pkg } = await runPipeline(SYNTHETIC_THEMES[0], { id: 't4', now: NOW, seed: 1 });
    const examples = songToTrainingExamples(pkg);
    for (const line of toAlpacaJsonl(examples).trim().split('\n')) {
      const obj = JSON.parse(line);
      expect(obj).toHaveProperty('instruction');
      expect(obj).toHaveProperty('input');
      expect(obj).toHaveProperty('output');
    }
    for (const line of toChatJsonl(examples).trim().split('\n')) {
      const obj = JSON.parse(line);
      expect(Array.isArray(obj.messages)).toBe(true);
      expect(obj.messages).toHaveLength(3);
    }
  });

  it('dedupeByOutput drops a repeated output, keeping the first', () => {
    const base: TrainingExample = {
      task: 'lyrics',
      instruction: 'x',
      input: 'a',
      output: 'same output',
      meta: { songId: '1', title: 'A', genre: 'pop' },
    };
    const dup: TrainingExample = { ...base, meta: { songId: '2', title: 'B', genre: 'pop' } };
    const deduped = dedupeByOutput([base, dup]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].meta.songId).toBe('1');
  });

  it('datasetStats reports task coverage and catches duplicate outputs', () => {
    const a: TrainingExample = { task: 'lyrics', instruction: 'i', input: 'one two three', output: 'four five', meta: { songId: '1', title: 'A', genre: 'pop' } };
    const b: TrainingExample = { ...a, meta: { songId: '2', title: 'B', genre: 'pop' } };
    const stats = datasetStats([a, b]);
    expect(stats.total).toBe(2);
    expect(stats.byTask.lyrics).toBe(2);
    expect(stats.duplicateOutputs).toBe(1);
  });

  // Env-gated generator: `npm run prepare-training-data` (== `GEN_TRAINING_DATA=1 npx
  // vitest run trainingData`) mints a real, ready-to-upload dataset under
  // out/training-data/ — $0, local, no GPU, no API key. Skipped in normal CI so tests
  // never write files (same discipline as trace.test.ts's GEN_DEMOS gate).
  const genIt = process.env.GEN_TRAINING_DATA ? it : it.skip;
  genIt('mints a training dataset (JSONL + report) ready for the Lightning GPU', async () => {
    const synthetic = await synthesize();
    const golden = loadGolden();
    const founder = loadFounderExports();

    const all: TrainingExample[] = dedupeByOutput(
      [...golden, ...synthetic, ...founder].flatMap(songToTrainingExamples)
    );
    const byTask = new Map<TrainingExample['task'], TrainingExample[]>();
    for (const e of all) byTask.set(e.task, [...(byTask.get(e.task) ?? []), e]);

    const dir = join(process.cwd(), 'out', 'training-data');
    mkdirSync(dir, { recursive: true });

    for (const [task, examples] of byTask) {
      writeFileSync(join(dir, `${task}.alpaca.jsonl`), toAlpacaJsonl(examples));
    }
    writeFileSync(join(dir, 'all-tasks.alpaca.jsonl'), toAlpacaJsonl(all));
    writeFileSync(join(dir, 'lyrics.chat.jsonl'), toChatJsonl(byTask.get('lyrics') ?? []));

    const stats = datasetStats(all);
    const report = `# Lightning AI training-data report

Generated ${NOW} by \`npm run prepare-training-data\` — $0, local, no GPU, no API key.
Regenerate anytime with the same command; it's fully deterministic (Iron Law #1), so a
re-run without new source songs produces byte-identical files.

## Sources
- **Golden set** (real, human-reviewed): ${golden.length} songs — \`examples/demos/\` + \`examples/cold-hard-gold/\`.
- **Synthetic** (free local pipeline, ${SYNTHETIC_THEMES.length} themes × ${PATTERN_PACKS.length} rhyme schemes × ${SEEDS.length} seeds): ${synthetic.length} songs.
- **Founder exports** (\`training-data-input/*.json\`, optional): ${founder.length} songs.
- **Total source songs**: ${golden.length + synthetic.length + founder.length}

## Examples after dedup
- **Total training rows**: ${stats.total}
- **By task**: ${Object.entries(stats.byTask).map(([k, v]) => `${k}=${v}`).join(', ')}
- **Avg input words**: ${stats.avgInputWords} · **Avg output words**: ${stats.avgOutputWords}
- **Duplicate outputs dropped before this count**: handled by \`dedupeByOutput\` upstream

## Files (this directory, gitignored — regenerate, don't commit)
- \`lyrics.alpaca.jsonl\`, \`production.alpaca.jsonl\`, \`album-cover-prompt.alpaca.jsonl\`, \`video-treatment.alpaca.jsonl\` — one JSONL per task, Alpaca-style \`{instruction,input,output}\` (LitGPT's default fine-tuning format — Lightning AI's own toolkit reads this directly).
- \`all-tasks.alpaca.jsonl\` — every task combined, for a single multi-task fine-tune.
- \`lyrics.chat.jsonl\` — the lyrics task only, in \`{messages:[system,user,assistant]}\` form, for frameworks (Axolotl \`sharegpt\`, TRL \`SFTTrainer\` chat templates) that expect a conversation instead of instruction/input/output.

## Before spending GPU credits
1. **Grow the set for $0 first.** ${stats.total} rows across ${Object.keys(stats.byTask).length} tasks is a working seed set, not a finished one — LoRA style-adaptation typically wants low hundreds to low thousands of rows per task to move the needle. Every additional row is free: add more entries to \`SYNTHETIC_THEMES\`/\`PATTERN_PACKS\` in \`lib/hermes/__tests__/trainingData.test.ts\` (more theme/mood/genre/seed combinations), or export real songs from the live app (Vault → Export JSON) into \`training-data-input/\` and re-run.
2. **Spot-check a sample** of \`lyrics.alpaca.jsonl\` by eye before uploading — this is generated from the deterministic local combinator, not hand-reviewed line by line.
3. **Upload the JSONL(s) to your Lightning Studio's storage** (or wherever your fine-tuning script reads training data from) *before* starting the GPU instance, so the expensive session starts training immediately instead of idling on data transfer/formatting.
4. **Pick one task to start.** Fine-tuning on \`lyrics.alpaca.jsonl\` alone is the highest-value, lowest-risk first run — it's the task the founder's own LoRA smoke test (see \`docs/lightning-plan.md\`) already targeted, and it's the one place the base model's rhyme-scheme reliability was shown to be weak.
`;
    writeFileSync(join(dir, 'REPORT.md'), report);

    expect(stats.total).toBeGreaterThan(0);
  });
});
