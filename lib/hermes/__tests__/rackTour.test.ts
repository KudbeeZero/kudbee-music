import { describe, it, expect, beforeEach } from 'vitest';
import { hasSeenRackTour, markRackTourSeen, __clearRackTourState } from '../rackTour';

describe('rackTour — Engine Rack first-visit explainer flag (this browser only)', () => {
  beforeEach(() => __clearRackTourState());

  it('starts unseen', () => {
    expect(hasSeenRackTour()).toBe(false);
  });

  it('marks itself seen and stays seen', () => {
    markRackTourSeen();
    expect(hasSeenRackTour()).toBe(true);
  });

  it('is independent of other one-time flags', () => {
    expect(hasSeenRackTour()).toBe(false);
    markRackTourSeen();
    expect(hasSeenRackTour()).toBe(true);
    __clearRackTourState();
    expect(hasSeenRackTour()).toBe(false);
  });
});
