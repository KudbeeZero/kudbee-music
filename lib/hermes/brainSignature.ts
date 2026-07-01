// The Brain Signature — the deterministic "trait card" of an artist's brain, and the
// content behind the future Living-Brain dNFT. It turns everything the brain already
// tracks (heat, procedural memory, emotion, becoming-you) into a small set of traits,
// and shapes them into standard ERC-721 metadata. This is the $0, no-chain step: it's
// the exact JSON a token would point to, so a later Solana/Metaplex mint is trivial.
// NO network, NO wallet, NO secrets — just data.
import type { SongPackage } from './types';
import type { Taste } from './storage';
import { brainHeat } from './heat';
import { proceduralMemory } from './procedural';
import { deriveEmotion } from './emotion';

export interface BrainTraits {
  dominantHemisphere: 'right' | 'left' | 'balanced';
  temperature: number;   // 0..100
  topRhymeSound: string;
  songsMade: number;
  becomingYou: number;   // 0..100
  primaryEmotion: string;
}

export interface NftAttribute { trait_type: string; value: string | number; }

/** Standard ERC-721 metadata shape (what tokenURI resolves to). */
export interface NftMetadata {
  name: string;
  description: string;
  image: string;         // snapshot of the brain (placeholder URL until rendered)
  animation_url: string; // the LIVE brain page — this is what makes it a dynamic NFT
  attributes: NftAttribute[];
}

export interface BrainSignatureInput {
  songs: SongPackage[];
  taste?: Taste;
  becomingYou: number;   // 0..100 (from voiceMirror on the current song)
}

/** Compute the artist's brain trait card. Deterministic. */
export function brainSignature(input: BrainSignatureInput): BrainTraits {
  const { songs, taste, becomingYou } = input;
  const proc = proceduralMemory(songs);
  const last = songs[songs.length - 1];
  const emo = last ? deriveEmotion(last.inputs) : { primary: 'unwritten', intensity: 0.3, valence: 0 };
  const heat = brainHeat({
    songCount: songs.length,
    edits: taste?.edits ?? 0,
    emotionIntensity: emo.intensity,
    emotionValence: emo.valence,
    becomingYou,
  });
  const dominantHemisphere = heat.dominance > 0.2 ? 'right' : heat.dominance < -0.2 ? 'left' : 'balanced';
  return {
    dominantHemisphere,
    temperature: Math.round(heat.overall * 100),
    topRhymeSound: proc.topRhymeSounds[0]?.sound ?? 'varied',
    songsMade: songs.length,
    becomingYou: Math.round(becomingYou),
    primaryEmotion: emo.primary,
  };
}

/** Shape the traits into ERC-721 metadata (the dNFT's tokenURI payload). */
export function toNftMetadata(traits: BrainTraits, opts: { tokenId?: string | number; base?: string } = {}): NftMetadata {
  const id = String(opts.tokenId ?? '000');
  const base = (opts.base ?? 'https://wifidj.xyz/brain').replace(/\/$/, '');
  return {
    name: `HERMES Brain #${id}`,
    description:
      'A living artist-brain that evolves as you create — it heats up where you are as an ' +
      'artist and its traits update with every song. Utility + identity, not an investment.',
    image: `${base}/${id}.png`,
    animation_url: `${base}/${id}`,
    attributes: [
      { trait_type: 'Dominant Hemisphere', value: traits.dominantHemisphere },
      { trait_type: 'Temperature', value: traits.temperature },
      { trait_type: 'Signature Rhyme', value: traits.topRhymeSound },
      { trait_type: 'Songs Made', value: traits.songsMade },
      { trait_type: 'Becoming You', value: traits.becomingYou },
      { trait_type: 'Primary Emotion', value: traits.primaryEmotion },
    ],
  };
}
