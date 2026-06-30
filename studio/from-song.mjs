// hermes from-song <song.json> — the bridge between the two studios.
// Takes a song package exported from the Hit Factory (a single SongPackage, or a
// vault export { songs: [...] }) and scaffolds a video-studio project with the
// lyrics already in place, so the song you WROTE becomes a video you can RENDER.
//
//   node studio/from-song.mjs <song.json> [--name <dir>] [--pack <p>] [--aspect <a>] [--id <songId>]
//
// Then: drop the rendered audio at <name>/song/track.mp3 (e.g. from Suno using the
// Hit Factory's Suno prompts), and `hermes build <name>`.
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const jsonPath = argv.find((a) => !a.startsWith('--') && /\.json$/i.test(a));
if (!jsonPath) { console.error('usage: hermes from-song <song.json> [--name <dir>] [--pack <p>] [--aspect <a>] [--id <songId>]'); process.exit(1); }

let data;
try { data = JSON.parse(readFileSync(resolve(process.cwd(), jsonPath), 'utf8')); }
catch (e) { console.error(`could not read ${jsonPath}: ${e.message}`); process.exit(1); }

// accept a single package, a vault export, or { songs: [...] }
const songs = Array.isArray(data) ? data : Array.isArray(data.songs) ? data.songs : [data];
const wantId = opt('id', null);
const song = wantId ? songs.find((s) => s.id === wantId) : songs[0];
if (!song || !song.sections) { console.error('no song with sections found in that file'); process.exit(1); }

const slug = (s) => (s || 'song').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'song';
const name = opt('name', slug(song.title));
const dir = resolve(process.cwd(), name);
if (existsSync(dir)) { console.error(`refusing: "${name}" already exists`); process.exit(1); }

// map the song's genre/mood to a fitting scene pack (override with --pack)
function pickPack(song) {
  const hay = `${song.inputs?.genre || ''} ${song.inputs?.mood || ''} ${song.inputs?.references || ''}`.toLowerCase();
  if (/retro|synth|80s|wave|vapor/.test(hay)) return 'retrowave';
  if (/lo-?fi|soul|vintage|warm|dusty|tape|boom-?bap/.test(hay)) return 'vhs-lofi';
  if (/minimal|acoustic|ambient|stripped|spoken/.test(hay)) return 'lyric-minimal';
  return 'neo-noir';
}
const pack = opt('pack', pickPack(song));
const aspect = opt('aspect', song.inputs?.aspect || '16:9');
const brain = song.inputs?.mood && /dark|aggress|hard|menac/.test(song.inputs.mood.toLowerCase()) ? 'left' : 'balanced';

mkdirSync(resolve(dir, 'song'), { recursive: true });
mkdirSync(resolve(dir, 'assets'), { recursive: true });

writeFileSync(resolve(dir, 'hermes.json'), JSON.stringify(
  { name, audio: 'song/track.mp3', lyrics: 'song/lyrics.md', pack, aspect, brain }, null, 2));

const lyrics = `# ${song.title || name} — lyrics\n\n` +
  song.sections.map((s) => `[${s.label}]\n${(s.lines || []).join('\n')}`).join('\n\n') + '\n';
writeFileSync(resolve(dir, 'song', 'lyrics.md'), lyrics);
writeFileSync(resolve(dir, 'assets', '.gitkeep'), '');

const tempo = song.production?.tempoBpm ? `${song.production.tempoBpm} BPM` : '';
const sunoStyle = [song.inputs?.genre, song.inputs?.mood, tempo, song.production?.drums, song.production?.bass]
  .filter(Boolean).join(', ');
writeFileSync(resolve(dir, 'README.md'),
  `# ${song.title || name}\n\nA video project scaffolded from a HERMES Hit Factory song.\n\n` +
  `## Finish the video\n` +
  `1. Render the audio (e.g. in Suno) and save it as \`song/track.mp3\`.\n` +
  `   - Suno style: \`${sunoStyle}\`\n` +
  `2. (Optional) drop reference clips as \`assets/hero-clip-01.mp4\`, \`-02\`, … or leave it fully procedural.\n` +
  `3. \`hermes build ${name}\` → \`${name}/out/${name}.mp4\`  (pack: ${pack}, aspect: ${aspect}, brain: ${brain})\n\n` +
  (song.visuals?.musicVideoPrompt ? `## Music-video direction\n${song.visuals.musicVideoPrompt}\n` : ''));

console.log(`Created video project ${name}/ from "${song.title || name}"`);
console.log(`  pack=${pack}  aspect=${aspect}  brain=${brain}  · lyrics: ${song.sections.length} sections`);
console.log(`Next: add ${name}/song/track.mp3 (render it in Suno), then  hermes build ${name}`);
