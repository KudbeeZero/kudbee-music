import { describe, it, expect } from 'vitest';
import { parseWhisperOutput, alignWordsToLines, toSrt, toSyncJson, toMidiCc } from '../lyricSync';
import type { WhisperOutput } from '../lyricSync';

describe('lyricSync — lyric timing, alignment, and export', () => {
  const mockWhisper: WhisperOutput = {
    segments: [
      { start: 0, end: 2.5, text: 'Tell doubters I made it out' },
      { start: 2.5, end: 5, text: 'Tell doubters I made it out' },
    ],
    words: [
      { w: 'Tell', start: 0, end: 0.4 },
      { w: 'doubters', start: 0.4, end: 1.1 },
      { w: 'I', start: 1.1, end: 1.3 },
      { w: 'made', start: 1.3, end: 1.7 },
      { w: 'it', start: 1.7, end: 1.9 },
      { w: 'out', start: 1.9, end: 2.5 },
    ],
  };

  it('parseWhisperOutput converts seconds to milliseconds', () => {
    const result = parseWhisperOutput(mockWhisper);
    expect(result).toHaveLength(6);
    expect(result[0]).toEqual({ word: 'Tell', startMs: 0, endMs: 400 });
    expect(result[5]).toEqual({ word: 'out', startMs: 1900, endMs: 2500 });
  });

  it('alignWordsToLines matches words to lyric lines', () => {
    const lines = ['Tell doubters I made it out', 'Another line here'];
    const timings = parseWhisperOutput(mockWhisper);
    const result = alignWordsToLines(lines, timings);

    expect(result[0].startMs).toBeDefined();
    expect(result[0].endMs).toBeDefined();
    expect(result[0].startMs).toBeLessThanOrEqual(result[0].endMs!);
  });

  it('toSrt generates SubRip format', () => {
    const srt = toSrt([
      {
        label: 'Verse',
        lines: [
          { text: 'Line one', startMs: 0, endMs: 1000 },
          { text: 'Line two', startMs: 1000, endMs: 2000 },
        ],
      },
    ]);

    expect(srt).toContain('1');
    expect(srt).toContain('00:00:00,000 --> 00:00:01,000');
    expect(srt).toContain('Line one');
    expect(srt).toContain('Line two');
  });

  it('toSyncJson generates JSON sync-map', () => {
    const json = toSyncJson([
      {
        label: 'Verse',
        lines: [{ text: 'Hello world', startMs: 500, endMs: 2000 }],
      },
    ]);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].section).toBe('Verse');
    expect(parsed[0].lines).toHaveLength(1);
  });

  it('toMidiCc generates MIDI CC events', () => {
    const cc = toMidiCc([
      {
        label: 'Hook',
        lines: [{ text: 'I made it out', startMs: 1000, endMs: 3000 }],
      },
    ]);

    expect(cc).toContain('Time (ms)');
    expect(cc).toContain('1000');
    expect(cc).toContain('3000');
    expect(cc).toContain('I made it out');
  });

  it('alignWordsToLines handles empty lines gracefully', () => {
    const lines = ['', 'Tell doubters', ''];
    const timings = parseWhisperOutput(mockWhisper);
    const result = alignWordsToLines(lines, timings);

    expect(result).toHaveLength(3);
    expect(result[0].startMs).toBeUndefined();
    expect(result[2].startMs).toBeUndefined();
  });
});
