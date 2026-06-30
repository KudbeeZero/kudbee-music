// hermes new <name> — scaffold a HERMES project folder + hermes.json.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const name = process.argv[2];
if (!name) { console.error('usage: hermes new <name>'); process.exit(1); }
const dir = resolve(process.cwd(), name);
if (existsSync(dir)) { console.error(`refusing: "${name}" already exists`); process.exit(1); }
mkdirSync(resolve(dir, 'song'), { recursive: true });
mkdirSync(resolve(dir, 'assets'), { recursive: true });
writeFileSync(resolve(dir, 'hermes.json'), JSON.stringify(
  { name, audio: 'song/track.mp3', lyrics: 'song/lyrics.md', pack: 'neo-noir', aspect: '16:9', brain: 'balanced' }, null, 2));
writeFileSync(resolve(dir, 'song', 'lyrics.md'), `# ${name} — lyrics\n\n[Verse 1]\n...\n\n[Hook]\n...\n\n[Outro]\n...\n`);
writeFileSync(resolve(dir, 'assets', '.gitkeep'), '');
writeFileSync(resolve(dir, 'README.md'),
  `# ${name}\n\nA HERMES project.\n\n1. Add your track at \`song/track.mp3\`\n2. Write lyrics in \`song/lyrics.md\`\n3. Drop reference clips as \`assets/hero-clip-01.mp4\`, \`-02\`, …\n4. Set \`pack\` / \`aspect\` / \`brain\` in \`hermes.json\` (brain: balanced|right|left).\n5. \`hermes build ${name}\` → \`${name}/out/${name}.mp4\`.\n`);
console.log(`Created ${name}/  (song/, assets/, hermes.json, lyrics.md)\nNext: add song/track.mp3 + lyrics, then render.`);
