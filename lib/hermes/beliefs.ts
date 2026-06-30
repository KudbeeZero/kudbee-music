// The belief system — the brain's constitution. Hard-coded operating principles
// (brain/beliefs.json) that the writers-room process and the recommender read,
// so the platform's values (craft over one-shot, assistant not autopilot, learn
// the voice, green loop, use every tool) are an explicit, version-controlled tier
// of memory rather than an unwritten assumption.
// Relative import (not the @ alias) so it resolves in both Next and vitest.
import beliefsData from '../../brain/beliefs.json';

export interface Belief {
  id: string;
  title: string;
  statement: string;
  appliesTo: string[];
}

export interface BeliefSystem {
  version: number;
  name: string;
  updated?: string;
  manifesto: string;
  beliefs: Belief[];
}

export const BELIEFS = beliefsData as BeliefSystem;

/** A single belief by id (e.g. 'craft-over-generation'). */
export function belief(id: string): Belief | undefined {
  return BELIEFS.beliefs.find((b) => b.id === id);
}

/** Beliefs that govern a given area (e.g. 'process', 'memory', 'lyrics'). */
export function beliefsFor(area: string): Belief[] {
  return BELIEFS.beliefs.filter((b) => b.appliesTo.includes(area));
}
