#!/usr/bin/env node
// The Watchdog — a periodic, founder-triggered Claude-powered security + quality
// review of the repo. Reads a curated, bounded set of context (recent commits,
// npm audit, the repo's own stated laws, and a fixed list of security-sensitive
// files), asks Claude for concrete findings + research ideas as structured JSON,
// and files the result as a GitHub issue. FINDINGS ONLY — it never writes code,
// opens a PR, or merges anything; a human always triages the report. See
// docs/watchdog.md for the full design + why auto-fix-PRs are deliberately out
// of scope for v1.
//
// Founder-triggered ONLY (workflow_dispatch), same safety shape as
// claude-compare.yml: reads ANTHROPIC_API_KEY only from Actions secrets, skips
// cleanly (exit 0) when unconfigured so CI can never fail or spend money by
// accident. Zero new npm deps — Node 22's global fetch only.
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-4-8';
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

// The curated, bounded review surface — security-sensitive modules + the repo's
// own written laws. Deliberately NOT "the whole repo": keeps the prompt (and the
// cost) predictable, and focuses the review on the highest-value surface area.
const SECURITY_SENSITIVE_FILES = [
  'SECURITY.md',
  'CLAUDE.md',
  'lib/hermes/claudeKey.ts',
  'lib/hermes/providers/claudeLyricsProvider.ts',
  'lib/hermes/shareLink.ts',
  'lib/hermes/storage.ts',
  'lib/hermes/identity.ts',
  '.github/workflows/ci.yml',
  '.github/workflows/claude-compare.yml',
  '.github/workflows/claude-watchdog.yml',
];

function readIfExists(relPath) {
  const p = join(ROOT, relPath);
  return existsSync(p) ? readFileSync(p, 'utf8') : null;
}

function sh(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    // npm audit exits non-zero when it finds vulnerabilities — that's a normal
    // result we want, not a script failure; capture whatever it printed.
    return (e.stdout || '') + (e.stderr || '');
  }
}

function gatherContext() {
  const files = SECURITY_SENSITIVE_FILES
    .map((rel) => ({ rel, text: readIfExists(rel) }))
    .filter((f) => f.text !== null);
  const recentLog = sh('git log --oneline -20');
  const audit = sh('npm audit --json');
  return { files, recentLog, audit };
}

const FINDING_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['low', 'medium', 'high'] },
          area: { type: 'string' },
          file: { type: 'string' },
          summary: { type: 'string' },
          suggestedFix: { type: 'string' },
          confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
        required: ['severity', 'area', 'file', 'summary', 'suggestedFix', 'confidence'],
        additionalProperties: false,
      },
    },
    researchIdeas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          rationale: { type: 'string' },
        },
        required: ['title', 'rationale'],
        additionalProperties: false,
      },
    },
    overallAssessment: { type: 'string' },
  },
  required: ['findings', 'researchIdeas', 'overallAssessment'],
  additionalProperties: false,
};

function systemPrompt() {
  return [
    'You are a senior security + quality reviewer doing a periodic, bounded audit of an',
    'open-source repository. You are given: the repo\'s own written laws/conventions',
    '(CLAUDE.md, SECURITY.md), a fixed list of security-sensitive source files, a recent',
    'commit log, and an npm audit report. You do NOT have the whole repo — do not invent',
    'behavior or files you cannot see in the given context; if you are uncertain whether',
    'something is a real issue, say so honestly via the confidence field rather than',
    'asserting it. Be concrete and actionable: cite exact file names, explain the concrete',
    'failure scenario for each finding, and keep suggestedFix specific enough that a',
    'developer could act on it directly. Respond with STRICT JSON only, matching the',
    'given schema — no markdown, no commentary, no code fences.',
  ].join(' ');
}

function buildPrompt(ctx) {
  const fileBlocks = ctx.files
    .map((f) => `--- ${f.rel} ---\n${f.text.slice(0, 12000)}`)
    .join('\n\n');
  return [
    'Review this repository for security weaknesses, correctness risks, drift from its own',
    'stated laws/conventions, and concrete improvement ideas worth researching or building',
    'next. This is a $0/local/deterministic app with a bring-your-own-key opt-in AI feature —',
    'weigh findings against that context (e.g. a founder-controlled secret leaking to the',
    'client bundle is high severity; a missing test on a cosmetic UI string is low).',
    '',
    '## Recent commits (most recent first)',
    ctx.recentLog || '(none)',
    '',
    '## npm audit',
    (ctx.audit || '(no output)').slice(0, 6000),
    '',
    '## Security-sensitive files',
    fileBlocks,
    '',
    'Respond with STRICT JSON matching exactly:',
    '{"findings":[{"severity":"low|medium|high","area":"...","file":"...","summary":"...","suggestedFix":"...","confidence":"low|medium|high"}],"researchIdeas":[{"title":"...","rationale":"..."}],"overallAssessment":"one paragraph"}',
  ].join('\n');
}

async function callClaude(apiKey, prompt) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt(),
      messages: [{ role: 'user', content: prompt }],
      output_config: { format: { type: 'json_schema', schema: FINDING_SCHEMA } },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Messages API returned ${res.status}: ${body.slice(0, 500)}`);
  }
  const msg = await res.json();
  if (msg.stop_reason === 'refusal') throw new Error('the model declined this request (stop_reason: refusal)');
  const text = (msg.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  if (!text.trim()) throw new Error('response contained no text content');
  return JSON.parse(text);
}

const SEVERITY_EMOJI = { high: '🔴', medium: '🟡', low: '⚪' };

export function renderReport(report, meta) {
  const lines = [
    `# 🐕 Watchdog report — ${meta.date}`,
    '',
    `Model: \`${meta.model}\` · commit: \`${meta.sha}\` · ${report.findings.length} finding(s), ${report.researchIdeas.length} research idea(s)`,
    '',
    '## Overall assessment',
    report.overallAssessment,
    '',
    '## Findings',
  ];
  if (!report.findings.length) {
    lines.push('_No findings this run._');
  } else {
    for (const f of report.findings) {
      lines.push(
        `### ${SEVERITY_EMOJI[f.severity] ?? '⚪'} ${f.severity.toUpperCase()} — ${f.area} (\`${f.file}\`, confidence: ${f.confidence})`,
        f.summary,
        '',
        `**Suggested fix:** ${f.suggestedFix}`,
        '',
      );
    }
  }
  lines.push('## Research ideas');
  if (!report.researchIdeas.length) {
    lines.push('_None this run._');
  } else {
    for (const r of report.researchIdeas) lines.push(`- **${r.title}** — ${r.rationale}`);
  }
  lines.push(
    '',
    '---',
    '_Findings-only — this report never writes code or opens a PR. A human triages every',
    'item. See [docs/watchdog.md](../blob/main/docs/watchdog.md)._',
  );
  return lines.join('\n');
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('[watchdog] ANTHROPIC_API_KEY not set — skipping cleanly (no findings run, no spend).');
    return;
  }
  const ctx = gatherContext();
  const report = await callClaude(apiKey, buildPrompt(ctx));
  const meta = {
    date: new Date().toISOString().slice(0, 10),
    model: MODEL,
    sha: (process.env.GITHUB_SHA || sh('git rev-parse HEAD').trim()).slice(0, 7),
  };
  const markdown = renderReport(report, meta);
  console.log(markdown);
  const outFile = process.env.WATCHDOG_OUT_FILE;
  if (outFile) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(outFile, markdown, 'utf8');
  }
}

// Allow `node scripts/watchdog.mjs` directly; importable for tests via renderReport.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error('[watchdog] failed:', e.message);
    process.exitCode = 1;
  });
}
