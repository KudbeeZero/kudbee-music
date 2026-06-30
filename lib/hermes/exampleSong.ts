// The flagship demo — "Cold Hard Gold", a real package minted by the actual
// pipeline (deterministic seed). Used to seed the empty state so a first-time
// visitor sees a complete, high-scoring song package immediately, before
// generating their own. The same JSON ships in examples/ for the CLI/video bridge.
import demo from '@/examples/cold-hard-gold/song.json';
import type { SongPackage } from './types';

export const EXAMPLE_SONG = demo as unknown as SongPackage;

/** A fresh, owned copy so the vault never mutates the shared import. */
export function demoSong(): SongPackage {
  return JSON.parse(JSON.stringify(EXAMPLE_SONG)) as SongPackage;
}
