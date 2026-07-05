// Turns SongPackages (the golden demos, synthetic $0 pipeline runs, or a founder's own
// exported vault) into fine-tuning-ready training examples for the Lightning AI LoRA
// spike (docs/lightning-plan.md). Kept as a pure, server/CLI-only module (like
// vectorMemory.ts) so this never touches the client bundle — it's a data-prep tool, not
// a generation-path dependency. See lib/hermes/__tests__/trainingData.test.ts for the
// generator that actually produces the JSONL files.
import type { SongPackage } from './types';

export type TrainingTask = 'lyrics' | 'production' | 'album-cover-prompt' | 'video-treatment' | 'scribe-line-rewrite';

export interface TrainingExample {
  task: TrainingTask;
  instruction: string;
  input: string;
  output: string;
  meta: { songId: string; title: string; genre: string };
}

// One instruction per task — kept short and generic on purpose; the founder can adapt
// wording per their fine-tuning framework without touching the extraction logic.
const INSTRUCTIONS: Record<TrainingTask, string> = {
  lyrics:
    "You are a songwriting assistant. Write original song lyrics, formatted with " +
    "[Section] tags, that match the brief. Never mimic a living artist’s actual words.",
  production:
    "You are a music production assistant. Given a song brief and its lyrics, suggest " +
    "tempo, drums, bass, instrumentation, arrangement, and mix direction.",
  "album-cover-prompt":
    "You are a visual-direction assistant. Given a song brief and concept, write a one- " +
    "or two-sentence prompt for an album cover image generator. No real-artist likeness, " +
    "no text or logos.",
  "video-treatment":
    "You are a music-video-concept assistant. Given a song brief and concept, write a " +
    "cinematic 16:9 music video treatment plus 3-5 scene ideas.",
  "scribe-line-rewrite":
    "You are a lyric refinement assistant. Rewrite a single song line, offering 3 " +
    "alternative phrasings that preserve meaning, syllable count, and rhyme role. Each " +
    "alternative must be a single, singable line.",
};

function meta(pkg: SongPackage): TrainingExample['meta'] {
  return { songId: pkg.id, title: pkg.title, genre: pkg.inputs.genre };
}

function lyricsExample(pkg: SongPackage): TrainingExample | null {
  if (!pkg.brief.trim() || !pkg.finalLyrics.trim()) return null;
  return { task: 'lyrics', instruction: INSTRUCTIONS.lyrics, input: pkg.brief, output: pkg.finalLyrics, meta: meta(pkg) };
}

function productionExample(pkg: SongPackage): TrainingExample | null {
  const p = pkg.production;
  if (!p) return null;
  const output = [
    `Tempo: ${p.tempoBpm} BPM`,
    `Drums: ${p.drums}`,
    `Bass: ${p.bass}`,
    `Instrumentation: ${p.instrumentation.join(', ')}`,
    `Arrangement: ${p.arrangement.join(' / ')}`,
    `Genre blend: ${p.genreBlend}`,
    `Mix vibe: ${p.mixVibe}`,
  ].join('\n');
  return {
    task: 'production',
    instruction: INSTRUCTIONS.production,
    input: `${pkg.brief}\n\nLyrics:\n${pkg.finalLyrics}`,
    output,
    meta: meta(pkg),
  };
}

function albumCoverExample(pkg: SongPackage): TrainingExample | null {
  if (!pkg.visuals?.albumCoverPrompt?.trim()) return null;
  return {
    task: 'album-cover-prompt',
    instruction: INSTRUCTIONS['album-cover-prompt'],
    input: `${pkg.brief}\n\nConcept: ${pkg.conceptSummary}`,
    output: pkg.visuals.albumCoverPrompt,
    meta: meta(pkg),
  };
}

function videoTreatmentExample(pkg: SongPackage): TrainingExample | null {
  if (!pkg.visuals?.musicVideoPrompt?.trim()) return null;
  const scenes = pkg.visuals.sceneIdeas ?? [];
  const output = scenes.length
    ? `${pkg.visuals.musicVideoPrompt}\n\nScenes:\n${scenes.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
    : pkg.visuals.musicVideoPrompt;
  return {
    task: 'video-treatment',
    instruction: INSTRUCTIONS['video-treatment'],
    input: `${pkg.brief}\n\nConcept: ${pkg.conceptSummary}`,
    output,
    meta: meta(pkg),
  };
}

function scribeLineRewriteExamples(pkg: SongPackage): TrainingExample[] {
  if (!pkg.finalLyrics.trim()) return [];

  // Parse lyrics: extract section labels and lyric lines
  const allLines = pkg.finalLyrics.split('\n').map((line) => line.trim());
  const lines: { text: string; section: string }[] = [];
  let currentSection = 'Verse';

  for (const line of allLines) {
    if (line.startsWith('[') && line.endsWith(']')) {
      currentSection = line.slice(1, -1);
    } else if (line) {
      lines.push({ text: line, section: currentSection });
    }
  }

  if (lines.length === 0) return [];

  // Generate examples for multiple lines across sections
  const examples: TrainingExample[] = [];
  const step = Math.max(1, Math.floor(lines.length / 4)); // Sample ~4 lines per song

  for (let i = 0; i < lines.length; i += step) {
    const target = lines[i];
    const precedingLine = i > 0 ? lines[i - 1]?.text : '';
    const followingLine = i < lines.length - 1 ? lines[i + 1]?.text : '';

    // Build input matching the real Lightning provider contract
    const inputParts = [
      `Rewrite ONE line from a song, offering 3 alternative phrasings.`,
      '',
      `Title: ${pkg.title || 'Untitled'}`,
      `Theme: ${pkg.inputs.theme}`,
      `Mood: ${pkg.inputs.mood}`,
      `Genre: ${pkg.inputs.genre}`,
      '',
      `Section: [${target.section}]`,
      precedingLine ? `Line before (context, do not rewrite): "${precedingLine}"` : '',
      `LINE TO REWRITE: "${target.text}"`,
      followingLine ? `Line after (context, do not rewrite): "${followingLine}"` : '',
      '',
      'Keep roughly the same meaning, syllable count, and rhyme role as the original line.',
      'Each alternative must be a single, complete, singable line (no bar numbers, no explanation).',
      '',
      `Output ONLY a JSON object in this exact format (no markdown, no extra text):`,
      `{"alternatives":["line 1","line 2","line 3"]}`,
      `- exactly 3 alternatives, each a string`,
    ];
    const input = inputParts.filter(Boolean).join('\n');

    // Output: the line itself (training learns to rewrite/preserve meaning in context)
    const output = target.text;

    examples.push({
      task: 'scribe-line-rewrite',
      instruction: INSTRUCTIONS['scribe-line-rewrite'],
      input,
      output,
      meta: meta(pkg),
    });
  }
  return examples;
}

/** One song → up to 5+ task-specific training examples (skips a task if the song is missing that field). */
export function songToTrainingExamples(pkg: SongPackage): TrainingExample[] {
  const singleExamples = [
    lyricsExample(pkg),
    productionExample(pkg),
    albumCoverExample(pkg),
    videoTreatmentExample(pkg),
  ].filter((e): e is TrainingExample => e !== null);

  // SCRIBE generates multiple examples per song (one per sampled line)
  const scribeExamples = scribeLineRewriteExamples(pkg);

  return [...singleExamples, ...scribeExamples];
}

/** Alpaca-style {instruction,input,output} JSONL — the default format LitGPT (Lightning
 *  AI's own fine-tuning toolkit) and most LoRA/Axolotl recipes read out of the box. */
export function toAlpacaJsonl(examples: TrainingExample[]): string {
  return examples.map((e) => JSON.stringify({ instruction: e.instruction, input: e.input, output: e.output })).join('\n') + '\n';
}

/** Chat/messages-style JSONL — for frameworks (Axolotl `type: sharegpt`, TRL `SFTTrainer`
 *  with a chat template) that expect a conversation instead of instruction/input/output. */
export function toChatJsonl(examples: TrainingExample[]): string {
  return (
    examples
      .map((e) =>
        JSON.stringify({
          messages: [
            { role: 'system', content: e.instruction },
            { role: 'user', content: e.input },
            { role: 'assistant', content: e.output },
          ],
        })
      )
      .join('\n') + '\n'
  );
}

export interface DatasetStats {
  total: number;
  byTask: Record<string, number>;
  avgInputWords: number;
  avgOutputWords: number;
  duplicateOutputs: number;
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/** Cheap health check before spending GPU credits: task coverage, rough length, and a
 *  duplicate-output count (a LoRA trained on many near-identical outputs overfits fast). */
export function datasetStats(examples: TrainingExample[]): DatasetStats {
  const byTask: Record<string, number> = {};
  let inputWords = 0;
  let outputWords = 0;
  const seen = new Set<string>();
  let duplicateOutputs = 0;
  for (const e of examples) {
    byTask[e.task] = (byTask[e.task] ?? 0) + 1;
    inputWords += wordCount(e.input);
    outputWords += wordCount(e.output);
    const key = e.output.trim().toLowerCase();
    if (seen.has(key)) duplicateOutputs++;
    else seen.add(key);
  }
  const total = examples.length;
  return {
    total,
    byTask,
    avgInputWords: total ? Math.round(inputWords / total) : 0,
    avgOutputWords: total ? Math.round(outputWords / total) : 0,
    duplicateOutputs,
  };
}

/** De-dupes examples whose output text is identical (case-insensitive) — keeps the
 *  first occurrence. Synthetic generation across many seeds can otherwise mint the same
 *  short output (e.g. an album-cover prompt) more than once. */
export function dedupeByOutput(examples: TrainingExample[]): TrainingExample[] {
  const seen = new Set<string>();
  const out: TrainingExample[] = [];
  for (const e of examples) {
    const key = `${e.task}::${e.output.trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}
