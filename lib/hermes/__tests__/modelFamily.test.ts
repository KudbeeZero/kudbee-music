import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  models, modelById, catalogViolations, staleModels, trainOrder, budgetPhases, CONFIRM_RUNS,
  trainingProgress, familyTrainingProgress, GATE_STAGES,
} from '../modelFamily';

// The Librarian's lock. brain/modelFamily.json is the model-family card catalog —
// the single place training-program state lives — and these tests make its rules
// mechanical instead of honor-system: a model can't be marked promoted without
// KUDBEE-GATE cleared, an eval can't be "confirmed" off a single run, a budget
// line can't quietly run past its cap, and nothing token-shaped can ever land in
// the file. Same discipline as statusBoard.test.ts holds over roadmap.json.

const root = join(__dirname, '..', '..', '..');
const raw = readFileSync(join(root, 'brain', 'modelFamily.json'), 'utf8');

describe('modelFamily — catalog shape', () => {
  it('carries the one-line note field (the brain/ folder rule)', () => {
    const parsed = JSON.parse(raw) as { note?: string };
    expect(parsed.note).toBeTruthy();
    expect(parsed.note).toContain('Librarian');
    expect(parsed.note).toContain('docs/lightning-librarian.md');
  });

  it('tracks the whole family (SCRIBE v1/v2, CODEV0, the four HERMES models, the teacher)', () => {
    expect(models().length).toBeGreaterThanOrEqual(8);
    for (const id of [
      'KUDBEESCRIBEV1', 'KUDBEECODEV0', 'KUDBEESCRIBEV2',
      'HERMES-LYRICS', 'HERMES-PRODUCTION', 'HERMES-VIDEO', 'HERMES-COVER',
      'MINIMAX-TEACHER',
    ]) {
      expect(modelById(id), `catalog must track ${id}`).toBeDefined();
    }
  });

  it('confirms evals only at the gate bar (3+ runs)', () => {
    expect(CONFIRM_RUNS).toBeGreaterThanOrEqual(3);
  });

  it('keeps a train-order queue and phase budgets', () => {
    expect(trainOrder().length).toBeGreaterThanOrEqual(5);
    expect(budgetPhases().length).toBeGreaterThanOrEqual(4);
  });
});

describe('modelFamily — the Librarian invariants (KUDBEE-GATE, made mechanical)', () => {
  it('the catalog never contradicts its own rules', () => {
    expect(catalogViolations()).toEqual([]);
  });

  it('the 40% KUDBEECODEV0 number stays unconfirmed until 3 runs exist', () => {
    const codev0 = modelById('KUDBEECODEV0')!;
    for (const e of codev0.evals.filter((x) => x.runs < CONFIRM_RUNS)) {
      expect(e.confirmed, `${e.metric} with ${e.runs} run(s) must not be confirmed`).toBe(false);
    }
  });

  it('stall detection is pure — injected now, deterministic, and honest', () => {
    // Nothing is stale the day the catalog was touched…
    expect(staleModels('2026-07-07')).toEqual([]);
    // …and a model with staleAfterDays=14 shows up once its window passes.
    const later = staleModels('2026-09-01');
    expect(later.map((m) => m.id)).toContain('KUDBEESCRIBEV1');
    expect(staleModels('2026-09-01')).toEqual(later); // deterministic
  });
});

describe('modelFamily — secrets lint (endpoint URLs allowed, tokens never)', () => {
  it('nothing token-shaped in the committed file', () => {
    for (const pattern of [
      /key_[A-Za-z0-9]/, // the leaked-Runway-key lesson: grep every diff for key_
      /sk-[A-Za-z0-9]{8,}/, // Anthropic-style secret keys
      /Bearer\s+[A-Za-z0-9._-]{8,}/, // a pasted Authorization header
      /token_[A-Za-z0-9]{8,}/,
    ]) {
      expect(raw, `modelFamily.json must never contain a secret matching ${pattern}`).not.toMatch(pattern);
    }
  });
});

describe('modelFamily — training-progress metrics (the dashboard data source)', () => {
  it('projects every model into an honest progress row', () => {
    const rows = familyTrainingProgress();
    expect(rows.length).toBe(models().length);
    for (const r of rows) {
      expect(r.gatePercent).toBeGreaterThanOrEqual(0);
      expect(r.gatePercent).toBeLessThanOrEqual(100);
      expect(r.iterations).toBeGreaterThanOrEqual(1); // every model has ≥1 history event
      expect(r.nextAction.trim().length).toBeGreaterThan(0);
    }
  });

  it('maps a real gate stage to a pipeline percent', () => {
    // KUDBEESCRIBEV1 is at G2-verify (index 2 of 0..6) → round(2/6*100) = 33.
    const scribe = trainingProgress('KUDBEESCRIBEV1')!;
    expect(GATE_STAGES[scribe.gateIndex]).toBe(scribe.gateStage);
    expect(scribe.gatePercent).toBe(33);
    expect(scribe.datasetRows).toBe(212);
    expect(scribe.valLoss).toBe(0.082);
  });

  it('never reports an unconfirmed eval as confirmed (the run-count honesty rule)', () => {
    const codev0 = trainingProgress('KUDBEECODEV0')!;
    expect(codev0.evalRuns).toBe(1);
    expect(codev0.evalPassRate).toBe(0.4);
    expect(codev0.evalConfirmed).toBe(false); // 1 run < CONFIRM_RUNS
  });

  it('is deterministic and returns null for an unknown id', () => {
    expect(familyTrainingProgress()).toEqual(familyTrainingProgress());
    expect(trainingProgress('NOPE')).toBeNull();
  });
});
