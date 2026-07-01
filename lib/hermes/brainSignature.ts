// The Brain Signature — the deterministic "trait card" of an artist's brain, and the
// content behind the future Living-Brain dNFT. It turns everything the brain already
// tracks (heat, procedural memory, emotion, becoming-you) into a small set of traits,
// and shapes them into the Metaplex Token Metadata off-chain JSON standard (the
// project's documented chain target is Solana/Metaplex — see docs/nft-standard.md).
// This is the $0, no-chain step: it's the exact JSON a token's `uri` would point to,
// so a later Metaplex mint is trivial. NO network, NO wallet, NO secrets — just data.
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

export interface NftFile { uri: string; type: string; }

export interface NftProperties {
  files: NftFile[];
  category: string; // "html" — the live brain page is the primary asset
}

/**
 * Metaplex Token Metadata off-chain JSON standard — what the on-chain
 * Token Metadata account's `uri` resolves to (Solana/Metaplex, per the roadmap).
 */
export interface NftMetadata {
  name: string;           // mirrors on-chain `name` (Metaplex caps it at 32 chars)
  symbol: string;         // mirrors on-chain `symbol` (Metaplex caps it at 10 chars)
  description: string;
  image: string;          // snapshot of the brain (placeholder URL until rendered)
  animation_url: string;  // the LIVE brain page — this is what makes it a dynamic NFT
  external_url: string;
  // Royalties are enforced via the on-chain Token Metadata account; this JSON field
  // is the legacy off-chain mirror. Kept at 0 = no royalty claim until the founder decides.
  seller_fee_basis_points: number;
  attributes: NftAttribute[];
  properties: NftProperties;
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

/** Shape the traits into Metaplex Token Metadata off-chain JSON (the dNFT's `uri` payload). */
export function toNftMetadata(traits: BrainTraits, opts: { tokenId?: string | number; base?: string } = {}): NftMetadata {
  const id = String(opts.tokenId ?? '000');
  const base = (opts.base ?? 'https://wifidj.xyz/brain').replace(/\/$/, '');
  const image = `${base}/${id}.png`;
  const livePage = `${base}/${id}`;
  // Metaplex enforces a 32-char limit on the on-chain `name`; keep the JSON mirror inside it.
  const name = `HERMES Brain #${id}`.slice(0, 32);
  return {
    name,
    symbol: 'HERMES', // on-chain `symbol` is capped at 10 chars
    description:
      'A living artist-brain that evolves as you create — it heats up where you are as an ' +
      'artist and its traits update with every song. Utility + identity, not an investment.',
    image,
    animation_url: livePage,
    external_url: livePage,
    // Legacy mirror of the on-chain royalty field — 0 until the founder decides otherwise.
    seller_fee_basis_points: 0,
    attributes: [
      { trait_type: 'Dominant Hemisphere', value: traits.dominantHemisphere },
      { trait_type: 'Temperature', value: traits.temperature },
      { trait_type: 'Signature Rhyme', value: traits.topRhymeSound },
      { trait_type: 'Songs Made', value: traits.songsMade },
      { trait_type: 'Becoming You', value: traits.becomingYou },
      { trait_type: 'Primary Emotion', value: traits.primaryEmotion },
    ],
    properties: {
      files: [
        { uri: image, type: 'image/png' },
        { uri: livePage, type: 'text/html' },
      ],
      category: 'html', // the live brain page is the primary asset
    },
  };
}
