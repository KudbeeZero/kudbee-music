import { describe, it, expect } from 'vitest';
import { computeBadges } from '../badges';
import { demoSong } from '../exampleSong';
import type { SongPackage } from '../types';
import type { StoryProgress } from '../story';

const noProgress: StoryProgress = { songCount: 0, becomingYou: 0, bestScore: 0 };

describe('computeBadges', () => {
  it('earns nothing from an empty vault', () => {
    expect(computeBadges([], undefined, noProgress)).toEqual([]);
  });

  it('never awards the trivial "First Spark" chapter as a badge', () => {
    const badges = computeBadges([], undefined, { songCount: 0, becomingYou: 0, bestScore: 0 });
    expect(badges.find((b) => b.id === 'chapter-spark')).toBeUndefined();
  });

  it('awards a chapter badge once its Story Mode unlock condition is met', () => {
    const badges = computeBadges([], undefined, { songCount: 2, becomingYou: 0, bestScore: 0 });
    expect(badges.find((b) => b.id === 'chapter-voice')).toBeDefined();
    expect(badges.find((b) => b.id === 'chapter-banger')).toBeUndefined();
  });

  it('awards Certified Banger only once a song scores 90+', () => {
    const song = demoSong();
    song.score = { ...song.score, total: 89 };
    expect(computeBadges([song], undefined, noProgress).find((b) => b.id === 'banger-90')).toBeUndefined();
    song.score = { ...song.score, total: 90 };
    expect(computeBadges([song], undefined, noProgress).find((b) => b.id === 'banger-90')).toBeDefined();
  });

  it('awards Sharp Ear only for a fully original (100/100) song', () => {
    const song = demoSong();
    song.uniqueness = { ...song.uniqueness, score: 99 };
    expect(computeBadges([song], undefined, noProgress).find((b) => b.id === 'unique-100')).toBeUndefined();
    song.uniqueness = { ...song.uniqueness, score: 100 };
    expect(computeBadges([song], undefined, noProgress).find((b) => b.id === 'unique-100')).toBeDefined();
  });

  it('awards Gift Giver only when an Occasion Pack was used', () => {
    const song = demoSong();
    expect(computeBadges([song], undefined, noProgress).find((b) => b.id === 'occasion')).toBeUndefined();
    song.inputs = { ...song.inputs, occasion: 'christmas' };
    expect(computeBadges([song], undefined, noProgress).find((b) => b.id === 'occasion')).toBeDefined();
  });

  it('awards Editor only once a real edit has been recorded', () => {
    const song = demoSong();
    expect(computeBadges([song], { liked: {}, disliked: {}, edits: 0 }, noProgress).find((b) => b.id === 'editor')).toBeUndefined();
    expect(computeBadges([song], { liked: {}, disliked: {}, edits: 1 }, noProgress).find((b) => b.id === 'editor')).toBeDefined();
  });

  it('awards Prolific only at 10+ saved songs', () => {
    const nine = Array.from({ length: 9 }, () => demoSong());
    const ten = Array.from({ length: 10 }, () => demoSong());
    expect(computeBadges(nine, undefined, noProgress).find((b) => b.id === 'prolific')).toBeUndefined();
    expect(computeBadges(ten, undefined, noProgress).find((b) => b.id === 'prolific')).toBeDefined();
  });

  it('is deterministic — same inputs, same badge list, same order', () => {
    const song = demoSong();
    song.score = { ...song.score, total: 95 };
    const progress: StoryProgress = { songCount: 5, becomingYou: 30, bestScore: 95 };
    const a = computeBadges([song], { liked: {}, disliked: {}, edits: 2 }, progress);
    const b = computeBadges([song], { liked: {}, disliked: {}, edits: 2 }, progress);
    expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id));
    expect(a.length).toBeGreaterThan(1);
  });
});
