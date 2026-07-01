import { describe, it, expect } from 'vitest';
import { AGENT_DEFINITIONS } from '../agents';

// The Council splits the roster into a right bench (proposes) and a left bench
// (challenges). Guard that both benches are always populated so the board is real.
describe('the Council bench split', () => {
  it('has agents on both hemispheres', () => {
    const right = AGENT_DEFINITIONS.filter((d) => d.hemisphere === 'right');
    const left = AGENT_DEFINITIONS.filter((d) => d.hemisphere === 'left');
    expect(right.length).toBeGreaterThan(0);
    expect(left.length).toBeGreaterThan(0);
    expect(right.length + left.length).toBe(AGENT_DEFINITIONS.length);
  });
});
