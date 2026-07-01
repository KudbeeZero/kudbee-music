// The Crossroads Board — Stage 1 (local model). The brain's "decision" region made
// social: the community and the agents meet at a crossing to steer creative + ecosystem
// direction. A "crossing" is a decision fork with options, each carrying a rationale and
// weighted votes; it resolves to an outcome. Versioned in git like beliefs/personas.
// Pure + deterministic. Stages 4-5 (community sync via API, token-weighted governance)
// integrate later via API and stay OUT of this free local core.

export interface CrossroadOption {
  id: string;
  label: string;
  rationale: string;   // why this path — the honest case for it
  votes: number;       // total weight (1 = one voter; a token layer can weight later)
}

export interface Crossing {
  id: string;
  question: string;
  options: CrossroadOption[];
  status: 'open' | 'decided';
  outcome?: string;    // the winning option id, once decided
}

/** Open a new crossing (all options start at 0 votes, status open). */
export function openCrossing(id: string, question: string, options: { id: string; label: string; rationale: string }[]): Crossing {
  return { id, question, options: options.map((o) => ({ ...o, votes: 0 })), status: 'open' };
}

/** Cast a weighted vote for an option — returns a NEW crossing (never mutates). */
export function vote(c: Crossing, optionId: string, weight = 1): Crossing {
  if (c.status !== 'open') return c;
  return {
    ...c,
    options: c.options.map((o) => (o.id === optionId ? { ...o, votes: o.votes + weight } : o)),
  };
}

/** Options ranked by votes, highest first (stable for ties by original order). */
export function tally(c: Crossing): CrossroadOption[] {
  return c.options.map((o, i) => ({ o, i })).sort((a, b) => b.o.votes - a.o.votes || a.i - b.i).map(({ o }) => o);
}

/** The current front-runner (null if no votes yet). */
export function leader(c: Crossing): CrossroadOption | null {
  const top = tally(c)[0];
  return top && top.votes > 0 ? top : null;
}

/** Resolve the crossing to the front-runner. No-op if nothing has been voted on. */
export function decide(c: Crossing): Crossing {
  const top = leader(c);
  if (!top) return c;
  return { ...c, status: 'decided', outcome: top.id };
}
