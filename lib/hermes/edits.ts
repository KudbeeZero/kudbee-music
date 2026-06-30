// Learn-from-edits — when the writer rewrites their lyrics, the brain reads the
// diff as a TASTE signal: words they added (their voice) vs words they cut
// (what they reject). Those feed the taste model (storage.recordTaste) and the
// recommender, so the brain gets more like the artist over time.
import { tokenize } from './text';
import type { SongSection } from './types';

export interface LyricEdit {
  added: string[];    // content words the writer introduced
  removed: string[];  // content words the writer cut
  changed: boolean;
}

/** Content-word diff between two lyric texts (ignores short/stopword tokens). */
export function diffEdit(before: string, after: string): LyricEdit {
  const set = (s: string) => new Set(tokenize(s).filter((w) => w.length > 3));
  const B = set(before);
  const A = set(after);
  const added = [...A].filter((w) => !B.has(w));
  const removed = [...B].filter((w) => !A.has(w));
  return { added, removed, changed: added.length > 0 || removed.length > 0 };
}

/** Parse an edited lyric block back into sections by [Label] markers. */
export function parseSections(text: string): SongSection[] {
  const sections: SongSection[] = [];
  let cur: SongSection | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const h = line.match(/^\[(.+)\]$/);
    if (h) { cur = { label: h[1].trim(), lines: [] }; sections.push(cur); continue; }
    if (!line) continue;
    if (!cur) { cur = { label: 'Verse', lines: [] }; sections.push(cur); }
    cur.lines.push(line);
  }
  return sections.length ? sections : [{ label: 'Lyrics', lines: text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean) }];
}
