// The Watchdog's report renderer — pure, offline, no network. The API-calling
// half is deliberately untested here (it's a thin fetch wrapper mirroring
// claudeLyricsProvider.ts's already-tested pattern); this proves the report
// shape a founder actually reads is correct.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderReport } from '../scripts/watchdog.mjs';

const meta = { date: '2026-07-02', model: 'claude-opus-4-8', sha: 'abc1234' };

test('renders an empty report cleanly (no findings, no ideas)', () => {
  const md = renderReport({ findings: [], researchIdeas: [], overallAssessment: 'All clear.' }, meta);
  assert.match(md, /No findings this run/);
  assert.match(md, /None this run/);
  assert.match(md, /All clear\./);
  assert.match(md, /claude-opus-4-8/);
  assert.match(md, /abc1234/);
});

test('renders findings with severity emoji and a suggested fix', () => {
  const report = {
    findings: [
      {
        severity: 'high', area: 'secret handling', file: 'lib/hermes/claudeKey.ts',
        summary: 'Example finding.', suggestedFix: 'Example fix.', confidence: 'high',
      },
      {
        severity: 'low', area: 'test coverage', file: 'lib/hermes/edits.ts',
        summary: 'Minor gap.', suggestedFix: 'Add a test.', confidence: 'medium',
      },
    ],
    researchIdeas: [{ title: 'Idea one', rationale: 'Because reasons.' }],
    overallAssessment: 'Two findings.',
  };
  const md = renderReport(report, meta);
  assert.match(md, /🔴 HIGH — secret handling \(`lib\/hermes\/claudeKey\.ts`, confidence: high\)/);
  assert.match(md, /⚪ LOW — test coverage/);
  assert.match(md, /\*\*Suggested fix:\*\* Example fix\./);
  assert.match(md, /\*\*Idea one\*\* — Because reasons\./);
  assert.match(md, /2 finding\(s\), 1 research idea\(s\)/);
});

test('always states the findings-only, no-auto-code guarantee', () => {
  const md = renderReport({ findings: [], researchIdeas: [], overallAssessment: 'x' }, meta);
  assert.match(md, /never writes code or opens a PR/);
});
