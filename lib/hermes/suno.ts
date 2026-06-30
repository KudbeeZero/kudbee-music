// Suno export — turn a finished SongPackage (and an album) into copy-paste
// ready Suno prompts: a "Style of Music" string and a tagged lyric block.
import type { SongPackage } from './types';
import type { Album } from './album';

/** Build a Suno "Style of Music" string from the song's brief + production. */
export function sunoStyle(pkg: SongPackage): string {
  const p = pkg.production;
  const parts = [
    pkg.inputs.genre,
    pkg.inputs.mood,
    `~${p.tempoBpm} BPM`,
    p.drums,
    p.bass,
    ...p.instrumentation,
    pkg.inputs.voice ? `${pkg.inputs.voice} male vocal` : '',
    'no autotune',
    'cinematic',
  ];
  // dedupe-ish, drop empties, keep it tight
  const seen = new Set<string>();
  return parts
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s && !seen.has(s) && seen.add(s))
    .join(', ');
}

/** Suno-tagged lyric block — uses the section labels as [tags]. */
export function sunoLyrics(pkg: SongPackage): string {
  return pkg.sections.map((s) => `[${s.label}]\n${s.lines.join('\n')}`).join('\n\n');
}

/** Everything Suno needs for one track. */
export function sunoTrack(pkg: SongPackage): string {
  return [
    `### ${pkg.title}`,
    '',
    'Style of Music:',
    sunoStyle(pkg),
    '',
    'Lyrics:',
    sunoLyrics(pkg),
  ].join('\n');
}

/** One copy-paste block for a whole album, in the given track order. */
export function albumSunoExport(album: Album, songs: SongPackage[]): string {
  const byId = new Map(songs.map((s) => [s.id, s]));
  const tracks = album.trackIds.map((id) => byId.get(id)).filter(Boolean) as SongPackage[];
  const header = [
    `# ${album.title}`,
    album.concept,
    `${tracks.length} track${tracks.length === 1 ? '' : 's'}`,
    '',
    '---',
    '',
  ].join('\n');
  return header + tracks.map((t, i) => `${i + 1}. ` + sunoTrack(t)).join('\n\n---\n\n');
}
