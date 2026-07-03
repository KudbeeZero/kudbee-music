import { describe, it, expect } from 'vitest';
import { AGENT_DEFINITIONS, getAgent } from '../agents';

describe('AGENT_DEFINITIONS — Agent Network codenames', () => {
  it('gives every agent a non-empty display codename', () => {
    for (const def of AGENT_DEFINITIONS) {
      expect(def.codename, `${def.id} is missing a codename`).toBeTruthy();
    }
  });

  it('keeps codenames unique', () => {
    const codenames = AGENT_DEFINITIONS.map((d) => d.codename);
    expect(new Set(codenames).size).toBe(codenames.length);
  });

  it('never lets codename replace the functional name/id used by generated output', () => {
    // The determinism contract + committed example fixtures embed `name` (e.g.
    // "Hooksmith") directly in generated SongPackage text — codename must stay
    // a display-only alias, never substituted for `name` or `id`.
    const hooksmith = getAgent('hooksmith');
    expect(hooksmith?.name).toBe('Hooksmith');
    expect(hooksmith?.codename).toBe('Synapse');
  });
});
