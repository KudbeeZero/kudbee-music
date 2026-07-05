// Lyric sync utilities: Whisper transcription, alignment, and export formats.

export interface WordTiming {
  word: string;
  startMs: number;
  endMs: number;
}

export interface SyncSegment {
  label: string;
  lines: Array<{ text: string; startMs?: number; endMs?: number }>;
}

export interface WhisperOutput {
  segments: Array<{ start: number; end: number; text: string }>;
  words: Array<{ w: string; start: number; end: number }>;
}

// Parse Whisper JSON output into word timings (seconds → ms).
export function parseWhisperOutput(data: WhisperOutput): WordTiming[] {
  return data.words.map((w) => ({
    word: w.w,
    startMs: Math.round(w.start * 1000),
    endMs: Math.round(w.end * 1000),
  }));
}

// Auto-assign word timings to lyric lines using greedy matching.
export function alignWordsToLines(
  lines: string[],
  wordTimings: WordTiming[]
): Array<{ text: string; startMs?: number; endMs?: number }> {
  const result: Array<{ text: string; startMs?: number; endMs?: number }> = lines.map((text) => ({ text, startMs: undefined, endMs: undefined }));
  if (wordTimings.length === 0) return result;

  let wordIdx = 0;
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const lineWords = lines[lineIdx].toLowerCase().split(/\s+/).filter((w) => w.length > 0);
    if (lineWords.length === 0) continue;

    let lineStart: number | undefined = undefined;
    let lineEnd: number | undefined = undefined;

    for (const lineWord of lineWords) {
      while (wordIdx < wordTimings.length) {
        const timing = wordTimings[wordIdx];
        const isMatch = timing.word.toLowerCase().startsWith(lineWord.charAt(0));

        if (isMatch || wordIdx >= wordTimings.length - 1) {
          if (lineStart === undefined) lineStart = timing.startMs;
          lineEnd = timing.endMs;
          wordIdx++;
          break;
        }
        wordIdx++;
      }
    }

    if (lineStart !== undefined && lineEnd !== undefined) {
      result[lineIdx] = { text: result[lineIdx].text, startMs: lineStart, endMs: lineEnd };
    }
  }

  return result;
}

// Export to SubRip format (.srt).
export function toSrt(sections: SyncSegment[]): string {
  const lines: string[] = [];
  let index = 1;

  for (const section of sections) {
    for (const line of section.lines) {
      if (line.startMs === undefined || line.endMs === undefined) continue;

      const start = msToSrtTime(line.startMs);
      const end = msToSrtTime(line.endMs);

      lines.push(String(index));
      lines.push(`${start} --> ${end}`);
      lines.push(line.text);
      lines.push('');
      index++;
    }
  }

  return lines.join('\n');
}

// Export to JSON sync-map format.
export function toSyncJson(sections: SyncSegment[]): string {
  const syncMap = sections.map((s) => ({
    section: s.label,
    lines: s.lines.filter((l) => l.startMs !== undefined && l.endMs !== undefined),
  }));
  return JSON.stringify(syncMap, null, 2);
}

// Export to MIDI CC format (lyric events as MIDI control changes).
export function toMidiCc(sections: SyncSegment[]): string {
  const events: Array<{ timeMs: number; text: string; type: 'start' | 'end' }> = [];

  for (const section of sections) {
    for (const line of section.lines) {
      if (line.startMs !== undefined) events.push({ timeMs: line.startMs, text: line.text, type: 'start' });
      if (line.endMs !== undefined) events.push({ timeMs: line.endMs, text: line.text, type: 'end' });
    }
  }

  events.sort((a, b) => a.timeMs - b.timeMs);

  let csv = 'Time (ms),Event,Text\n';
  for (const e of events) {
    csv += `${e.timeMs},"Lyric ${e.type}","${e.text.replace(/"/g, '""')}"\n`;
  }

  return csv;
}

// Helper: Convert ms to SRT timestamp format (HH:MM:SS,mmm).
function msToSrtTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
}
