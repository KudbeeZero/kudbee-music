// Album builder — group finished songs into a cohesive project and surface the
// gaps (tempo variety, emotional arc, length) so the artist knows what's missing
// before they call it done.
import type { SongPackage } from './types';
import { keywords } from './text';

export interface Album {
  id: string;
  title: string;
  concept: string;
  trackIds: string[];
  createdAt: string;
}

function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'album_' + Math.random().toString(36).slice(2, 10);
}

export function buildAlbum(title: string, songs: SongPackage[], opts: { id?: string; now?: string } = {}): Album {
  const themes = [...new Set(songs.flatMap((s) => keywords(s.inputs.theme, 3)))].slice(0, 5);
  const moods = [...new Set(songs.flatMap((s) => s.inputs.mood.split(/[,/]+/).map((m) => m.trim()).filter(Boolean)))].slice(0, 3);
  const concept = songs.length
    ? `A ${moods.join(', ') || 'cohesive'} body of work circling ${themes.join(', ') || 'one core feeling'}.`
    : 'An empty album — add tracks to shape its arc.';
  return {
    id: opts.id ?? genId(),
    title,
    concept,
    trackIds: songs.map((s) => s.id),
    createdAt: opts.now ?? new Date().toISOString(),
  };
}

/** What the album is missing — actionable gaps in pacing, feeling, and length. */
export function albumGaps(songs: SongPackage[]): string[] {
  const gaps: string[] = [];
  if (!songs.length) return ['No tracks yet — add a few songs from the vault.'];

  const tempos = songs.map((s) => s.production.tempoBpm);
  if (Math.max(...tempos) - Math.min(...tempos) < 15) {
    gaps.push('Tempo variety is low — add a noticeably slower or faster track so the album breathes.');
  }

  const hasBright = songs.some((s) => /hope|warm|love|joy|bright|free/i.test(s.inputs.mood + ' ' + s.inputs.theme));
  const hasDark = songs.some((s) => /dark|cold|lonel|sad|aggress|hard/i.test(s.inputs.mood));
  if (hasDark && !hasBright) {
    gaps.push('Every track shares a dark mood — one moment of hope or warmth would give the album a real arc.');
  }

  const weak = songs.filter((s) => s.score.total < 70).length;
  if (weak) gaps.push(`${weak} track(s) score below the release bar (70) — strengthen or cut them.`);

  if (songs.length < 6) gaps.push(`${6 - songs.length} more track(s) for a full short album (6+).`);

  if (!gaps.length) gaps.push('Cohesive and varied — this album is ready to sequence.');
  return gaps;
}

/** Suggest a running order: open mid-energy, peak in the middle, close soft. */
export function suggestSequence(songs: SongPackage[]): SongPackage[] {
  if (songs.length < 3) return songs;
  const byEnergy = songs.slice().sort((a, b) => b.production.tempoBpm - a.production.tempoBpm);
  const opener = byEnergy[Math.floor(byEnergy.length / 2)];   // mid energy
  const peak = byEnergy[0];                                   // highest energy
  const closer = byEnergy[byEnergy.length - 1];               // softest
  const middle = songs.filter((s) => s !== opener && s !== peak && s !== closer);
  return [opener, ...middle.slice(0, Math.ceil(middle.length / 2)), peak, ...middle.slice(Math.ceil(middle.length / 2)), closer];
}
