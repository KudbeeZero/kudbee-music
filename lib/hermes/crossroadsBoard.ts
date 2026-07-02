// Crossroads Board — Stage 2: the /crossroads route reads the seeded model
// (brain/crossroads.json, versioned in git like beliefs/personas) and layers this
// browser's own vote on top. Pure + deterministic given a vote map — no localStorage
// access here (that's crossroadsStorage.ts); keeps this testable without a DOM.
import seedData from '../../brain/crossroads.json';
import { vote, tally, leader, type Crossing } from './crossroads';
import type { CrossroadsVotes } from './crossroadsStorage';

interface CrossroadsSeed {
  note: string;
  crossings: Crossing[];
}

/** The seeded board — every crossing this repo currently has open (or decided). */
export function loadSeed(): Crossing[] {
  return (seedData as CrossroadsSeed).crossings;
}

/** Layer this browser's own vote (weight 1) onto the seeded base votes. */
export function applyMyVotes(crossings: Crossing[], myVotes: CrossroadsVotes): Crossing[] {
  return crossings.map((c) => {
    const picked = myVotes[c.id];
    return picked ? vote(c, picked, 1) : c;
  });
}

export { tally, leader };
export type { Crossing };
