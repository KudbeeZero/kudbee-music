import { describe, it, expect, beforeEach } from 'vitest';
import { getMyVotes, castVote, castVoteAndRecordTaste, __clearCrossroadsVotesState } from '../crossroadsStorage';

describe('crossroadsStorage — this browser\'s own votes only', () => {
  beforeEach(() => __clearCrossroadsVotesState());

  it('starts with no votes', () => {
    expect(getMyVotes()).toEqual({});
  });

  it('casts a vote and round-trips it', () => {
    castVote('next-expansion-pack', 'uk-drill');
    expect(getMyVotes()).toEqual({ 'next-expansion-pack': 'uk-drill' });
  });

  it('changing your vote on the same crossing overwrites, not appends', () => {
    castVote('next-expansion-pack', 'uk-drill');
    castVote('next-expansion-pack', 'soul-gospel');
    expect(getMyVotes()).toEqual({ 'next-expansion-pack': 'soul-gospel' });
  });

  it('votes on different crossings coexist', () => {
    castVote('next-expansion-pack', 'uk-drill');
    castVote('hook-repeat-vs-evolve', 'evolve');
    expect(getMyVotes()).toEqual({ 'next-expansion-pack': 'uk-drill', 'hook-repeat-vs-evolve': 'evolve' });
  });

  it('castVoteAndRecordTaste casts a vote (stage 3: signals feed the brain)', () => {
    castVoteAndRecordTaste('next-expansion-pack', 'soul-gospel', { liked: ['soulful', 'uplifting'] });
    expect(getMyVotes()).toEqual({ 'next-expansion-pack': 'soul-gospel' });
  });

  it('castVoteAndRecordTaste handles empty taste signal gracefully', () => {
    castVoteAndRecordTaste('hook-repeat-vs-evolve', 'repeat');
    expect(getMyVotes()).toEqual({ 'hook-repeat-vs-evolve': 'repeat' });
  });
});
