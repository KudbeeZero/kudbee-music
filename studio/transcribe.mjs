import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const audioPath = process.argv[2];
if (!audioPath) {
  console.error('Usage: node transcribe.mjs <audio-path>');
  process.exit(1);
}

const script = resolve('./studio/transcribe.py');
const cmd = `python3 ${script} "${audioPath}"`;

try {
  execSync(cmd, { stdio: 'inherit' });
  const result = JSON.parse(readFileSync('./song/whisper.json', 'utf-8'));
  console.log(JSON.stringify(result));
} catch (e) {
  console.error('Transcription failed:', e.message);
  process.exit(1);
}
