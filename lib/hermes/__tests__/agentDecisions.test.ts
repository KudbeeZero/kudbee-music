import { describe, it, expect } from 'vitest';
import {
  decisionToExample,
  harvestModelFamilyDecisions,
  decisionsToAlpacaJsonl,
  dedupeDecisions,
  scrubSecrets,
  DECISION_INSTRUCTION,
  type DecisionRecord,
} from '../agentDecisions';

// The agent-trajectory dataset — proving the process-capture pipeline works end to end on
// REAL data (the Librarian catalog's history[]), and that the safety boundary holds (no
// secret-shaped text ever reaches a row). Same discipline as trainingData.test.ts.

describe('agentDecisions — harvest the catalog history[] into decisions', () => {
  it('turns real modelFamily history events into decision records', () => {
    const records = harvestModelFamilyDecisions();
    // The catalog carries multiple dated history events across the family.
    expect(records.length).toBeGreaterThanOrEqual(8);
    for (const r of records) {
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.decision.trim().length).toBeGreaterThan(0);
      expect(r.source).toBe('model-family-history');
      expect(r.modelId).toBeTruthy();
    }
  });

  it('includes a recognizable real decision (SCRIBE v1 conversion)', () => {
    const records = harvestModelFamilyDecisions();
    const scribe = records.filter((r) => r.modelId === 'KUDBEESCRIBEV1');
    expect(scribe.length).toBeGreaterThanOrEqual(2);
    expect(scribe.some((r) => /conversion/i.test(r.decision))).toBe(true);
  });
});

describe('agentDecisions — decision → Alpaca row', () => {
  it('maps a record to an instruction/input/output row', () => {
    const rec: DecisionRecord = {
      date: '2026-07-07',
      modelId: 'KUDBEESCRIBEV1',
      task: 'lyric line rewrites',
      situation: 'conversion reported done, no GPU round-trip yet',
      decision: 'kept G2 uncleared — no round-trip happened',
      source: 'manual',
    };
    const ex = decisionToExample(rec);
    expect(ex.instruction).toBe(DECISION_INSTRUCTION);
    expect(ex.input).toContain('KUDBEESCRIBEV1');
    expect(ex.input).toContain('2026-07-07');
    expect(ex.output).toContain('G2 uncleared');
    expect(ex.meta.modelId).toBe('KUDBEESCRIBEV1');
  });

  it('emits valid Alpaca JSONL (one JSON object per line)', () => {
    const rows = harvestModelFamilyDecisions().map(decisionToExample);
    const jsonl = decisionsToAlpacaJsonl(rows);
    const lines = jsonl.trim().split('\n');
    expect(lines.length).toBe(rows.length);
    for (const line of lines) {
      const parsed = JSON.parse(line) as { instruction: string; input: string; output: string };
      expect(parsed.instruction).toBe(DECISION_INSTRUCTION);
      expect(typeof parsed.output).toBe('string');
    }
  });

  it('is deterministic — same catalog, same rows', () => {
    const a = decisionsToAlpacaJsonl(harvestModelFamilyDecisions().map(decisionToExample));
    const b = decisionsToAlpacaJsonl(harvestModelFamilyDecisions().map(decisionToExample));
    expect(a).toBe(b);
  });
});

describe('agentDecisions — the safety boundary (no secret ever becomes a row)', () => {
  it('scrubs token/secret-shaped substrings from input and output', () => {
    const rec: DecisionRecord = {
      date: '2026-07-07',
      modelId: 'KUDBEESCRIBEV1',
      situation: 'endpoint came up with Bearer sk-abcdef1234567890 in the log',
      decision: 'recorded the URL; the key_ABCDEF123456 must never be committed',
      source: 'manual',
    };
    const ex = decisionToExample(rec);
    expect(ex.input).not.toMatch(/sk-[A-Za-z0-9]{8,}/);
    expect(ex.input).not.toMatch(/Bearer\s+[A-Za-z0-9]/);
    expect(ex.output).not.toMatch(/key_[A-Za-z0-9]{6,}/);
    expect(ex.output).toContain('[redacted]');
  });

  it('scrubSecrets never throws and leaves clean text intact', () => {
    expect(scrubSecrets('a clean decision with no secrets')).toBe('a clean decision with no secrets');
  });

  it('every harvested real row is secret-clean', () => {
    const jsonl = decisionsToAlpacaJsonl(harvestModelFamilyDecisions().map(decisionToExample));
    expect(jsonl).not.toMatch(/key_[A-Za-z0-9]{6,}/);
    expect(jsonl).not.toMatch(/sk-[A-Za-z0-9]{8,}/);
    expect(jsonl).not.toMatch(/Bearer\s+[A-Za-z0-9._-]{8,}/);
  });
});

describe('agentDecisions — dedupe', () => {
  it('drops exact-duplicate decisions', () => {
    const r: DecisionRecord = { date: '2026-07-07', modelId: 'X', situation: 's', decision: 'd', source: 'manual' };
    expect(dedupeDecisions([r, { ...r }, { ...r, decision: 'different' }])).toHaveLength(2);
  });
});
