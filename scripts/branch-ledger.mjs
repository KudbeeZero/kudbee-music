#!/usr/bin/env node
// Branch ledger refresher — keeps brain/branches.json's git-derived fields honest
// (lastCommitDate, lastCommitSubject, aheadOfMainCommits, and which branches still
// exist on origin at all) without ever hitting the network or a GitHub token, so it
// stays a $0/local script like the rest of the repo's tooling.
//
// What it does NOT do: look up PR numbers/titles/merge state. That needs GitHub's
// API, which the core repo never calls with a key baked in (see CLAUDE.md — no
// server, no API keys, no network in the core path). PR/status fields are filled in
// by hand (or by an agent with GitHub access) during a periodic branch audit —
// cross-reference `git branch -r` against the repo's PR list and edit branches.json's
// `prs`/`status` fields directly. This script only refreshes what git alone can answer.
//
//   node scripts/branch-ledger.mjs           # refresh + print a summary
//   node scripts/branch-ledger.mjs --check   # exit 1 if the file is out of date (no write)

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEDGER_PATH = join(root, 'brain', 'branches.json');
const CHECK = process.argv.includes('--check');

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

const ledger = JSON.parse(readFileSync(LEDGER_PATH, 'utf8'));
const byName = new Map(ledger.branches.map((b) => [b.name, b]));

const remoteBranches = git(['branch', '-r'])
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.includes('->'))
  .map((l) => l.replace(/^origin\//, ''))
  .filter((name) => name !== 'main');

const seen = new Set();
let changed = false;

for (const name of remoteBranches) {
  seen.add(name);
  const ahead = Number(git(['rev-list', '--count', `origin/main..origin/${name}`]));
  const lastCommitDate = git(['log', '-1', '--format=%cI', `origin/${name}`]);
  const lastCommitSubject = git(['log', '-1', '--format=%s', `origin/${name}`]);

  let entry = byName.get(name);
  if (!entry) {
    changed = true;
    entry = { name, lastCommitDate, lastCommitSubject, aheadOfMainCommits: ahead, prs: [], status: 'no-pr-found' };
    ledger.branches.push(entry);
    byName.set(name, entry);
    console.log(`+ new branch, needs a PR audit: ${name}`);
    continue;
  }
  if (entry.aheadOfMainCommits !== ahead || entry.lastCommitDate !== lastCommitDate) {
    changed = true;
    entry.aheadOfMainCommits = ahead;
    entry.lastCommitDate = lastCommitDate;
    entry.lastCommitSubject = lastCommitSubject;
  }
}

const goneFromRemote = ledger.branches.filter((b) => !seen.has(b.name));
for (const b of goneFromRemote) {
  console.log(`- branch deleted from origin, ledger entry now stale: ${b.name}`);
}

const noPr = ledger.branches.filter((b) => b.status === 'no-pr-found').map((b) => b.name);
const openPr = ledger.branches.filter((b) => b.status === 'open-pr').map((b) => b.name);
const unmerged = ledger.branches.filter((b) => b.status === 'closed-unmerged').map((b) => b.name);

ledger.branches.sort((a, b) => (a.lastCommitDate < b.lastCommitDate ? 1 : -1));
ledger.summary = {
  totalBranches: ledger.branches.length,
  totalPRsSeen: ledger.branches.reduce((n, b) => n + b.prs.length, 0),
  branchesFullyMerged: ledger.branches.filter((b) => b.status === 'merged').length,
  branchesWithNoPR: noPr,
  branchesWithOpenPR: openPr,
  branchesWithUnmergedClosedPR: unmerged,
};

console.log(`\n${ledger.summary.totalBranches} branches, ${ledger.summary.totalPRsSeen} PRs seen, ${ledger.summary.branchesFullyMerged} fully merged.`);
if (noPr.length) console.log(`⚠ no PR found for: ${noPr.join(', ')}`);
if (openPr.length) console.log(`⚠ open PR (unmerged work): ${openPr.join(', ')}`);
if (unmerged.length) console.log(`⚠ closed without merging: ${unmerged.join(', ')}`);
if (goneFromRemote.length) console.log(`ⓘ ${goneFromRemote.length} ledger entries reference deleted branches (harmless — the PR history still stands)`);

if (CHECK) {
  process.exit(changed ? 1 : 0);
}
if (changed) {
  writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2) + '\n');
  console.log('\nbrain/branches.json refreshed.');
} else {
  console.log('\nbrain/branches.json already up to date.');
}
