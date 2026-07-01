// The recommendation engine — turns the learned ArtistProfile + memory into
// concrete suggestions as the person creates: the emotional lane to take next,
// words to retire, when they're album-ready, and which production expansion pack
// fits. Pure + deterministic so it's testable and trustworthy.
import type { SongPackage } from './types';
import type { ArtistProfile } from './learn';
import type { Taste } from './storage';
import { MEMORY } from './memory';
import { EXPANSION_PACKS } from './expansionPacks';
import { proceduralMemory } from './procedural';

export type RecommendationKind =
  | 'emotional-direction' | 'style' | 'exclusion' | 'album' | 'craft' | 'expansion' | 'procedural';

export interface Recommendation {
  kind: RecommendationKind;
  title: string;
  detail: string;
  /** optional machine-actionable payload (e.g. a word to exclude, a pack id) */
  action?: { type: 'add-exclusion' | 'apply-pack' | 'start-album'; value: string };
}

export function recommend(profile: ArtistProfile, songs: SongPackage[], taste?: Taste): Recommendation[] {
  const recs: Recommendation[] = [];

  // procedural memory: the artist's recurring craft moves (lean in, or break it)
  if (songs.length >= 2) {
    const proc = proceduralMemory(songs);
    recs.push({
      kind: 'procedural',
      title: 'Your signature move',
      detail: `${proc.signatureMove} Lean into it for cohesion — or break the pattern on the next one for a standout.`,
    });
  }

  // learned-from-edits: a word the writer keeps CUTTING is a real exclusion signal
  if (taste && taste.edits > 0) {
    const cut = Object.entries(taste.disliked).filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1])[0];
    if (cut) {
      recs.push({
        kind: 'exclusion', title: `You keep cutting "${cut[0]}"`,
        detail: `Across your edits you've removed "${cut[0]}" ${cut[1]}× — the brain learned it's not your voice. Add it to the exclusion list?`,
        action: { type: 'add-exclusion', value: cut[0] },
      });
    }
    const kept = Object.entries(taste.liked).filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([w]) => w);
    if (kept.length) {
      recs.push({ kind: 'craft', title: 'Your voice is forming', detail: `From your edits, you reach for ${kept.map((w) => `"${w}"`).join(', ')}. Lean into that signature — the brain now weights it.` });
    }
  }

  if (!profile.songCount) {
    recs.push({
      kind: 'craft', title: 'Write your first one',
      detail: 'Drop an idea into the Song Lab. After a few songs the brain learns your lane and starts recommending.',
    });
    return recs;
  }

  // emotional contrast — widen the range if everything leans one way
  if (profile.leansDark && profile.emotionRange < 0.35) {
    recs.push({
      kind: 'emotional-direction', title: 'Take an emotional contrast next',
      detail: 'Your catalog leans dark/aggressive and the emotional range is narrow. A vulnerable or hopeful track would widen your identity and make the hard ones hit harder.',
    });
  }

  // retire crutch words → memory exclusion candidates
  if (profile.overusedWords.length) {
    const w = profile.overusedWords[0];
    recs.push({
      kind: 'exclusion', title: `You lean on "${w.word}" a lot`,
      detail: `"${w.word}" shows up across ${w.count} of your songs. Excluding it forces a fresh image. One tap adds it to your memory's exclusion list.`,
      action: { type: 'add-exclusion', value: w.word },
    });
  }

  // album readiness
  if (songs.length >= 3 && songs.length < 8) {
    recs.push({
      kind: 'album', title: `You're ${8 - songs.length} track(s) from an album`,
      detail: 'You have enough for an EP. Build it cohesively — an intro, an emotional peak, and a closer.',
      action: { type: 'start-album', value: 'Untitled Album' },
    });
  }

  // signature sound from memory
  if (MEMORY.preferences?.genres?.length) {
    recs.push({
      kind: 'style', title: 'Your signature sound',
      detail: `The brain remembers you lean ${MEMORY.preferences.genres.join(' / ')}. Own that lane — then break it once, on purpose, for a standout.`,
    });
  }

  // craft: weakest hooks
  if (profile.weakHookCount > 0) {
    recs.push({
      kind: 'craft', title: 'Tighten the weakest hooks',
      detail: `${profile.weakHookCount} track(s) scored low on hook strength. A shorter, more chantable hook lifts replay value more than any other single change.`,
    });
  }

  // production expansion pack that fits the profile
  const pack = bestExpansionFor(profile);
  if (pack) {
    recs.push({
      kind: 'expansion', title: `Try the "${pack.title}" expansion`,
      detail: `${pack.description} Fits your ${profile.topGenres[0] ?? 'sound'} — apply it for a ready-made Suno style + production direction.`,
      action: { type: 'apply-pack', value: pack.name },
    });
  }

  return recs;
}

function bestExpansionFor(profile: ArtistProfile) {
  const hay = (profile.topGenres.join(' ') + ' ' + profile.topMoods.join(' ')).toLowerCase();
  let best = null as (typeof EXPANSION_PACKS)[number] | null;
  let bestScore = 0;
  for (const p of EXPANSION_PACKS) {
    const score = p.matches.reduce((n, m) => n + (hay.includes(m) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; best = p; }
  }
  return bestScore > 0 ? best : null;
}
