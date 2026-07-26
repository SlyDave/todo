#!/usr/bin/env node
// Board hygiene. A board that lies misleads every agent that reads it next, and
// nothing in GitHub enforces that an issue carries exactly one state label.
//
//   node .sdlc/scripts/validate-board.mjs

import { colours, fail, gh, ghSupportsIssueRelationships, info, pass, readState, warn } from './common.mjs';

const STATES = ['triage', 'ready', 'planning', 'in-progress', 'in-qa', 'done'];

const state = readState();
if (!state || state.status === 'uninitialised') {
  fail('This project has not been bootstrapped. Run the `bootstrap` skill.');
  process.exit(1);
}

if (!ghSupportsIssueRelationships()) {
  warn('gh 2.94 or later is required to read parent and blocked-by data. Some checks will be skipped.');
}

const fields = 'number,title,labels,state,milestone,parent,blockedBy,assignees';
const listed = gh(['issue', 'list', '--state', 'open', '--limit', '500', '--json', fields]);

if (!listed.ok) {
  fail(`Could not read issues from GitHub: ${listed.stderr || listed.stdout}`);
  info('Check that `gh auth status` is healthy and that this repo has a GitHub remote.');
  process.exit(1);
}

let issues;
try {
  issues = JSON.parse(listed.stdout);
} catch {
  fail('GitHub returned something that is not valid JSON.');
  process.exit(1);
}

const problems = [];
const note = (issue, message) => problems.push(`#${issue.number} ${issue.title} - ${message}`);

const namesOf = (issue) => (issue.labels ?? []).map((label) => label.name);

// gh returns relationships as { nodes: [...], totalCount: n } rather than a bare
// array, and a blocker that has already been closed no longer blocks anything.
const openBlockersOf = (issue) => {
  const value = issue.blockedBy;
  const nodes = Array.isArray(value) ? value : (value?.nodes ?? []);
  return nodes.filter((node) => (node.state ?? 'OPEN').toUpperCase() === 'OPEN');
};

for (const issue of issues) {
  const names = namesOf(issue);
  const states = names.filter((name) => name.startsWith('state:'));
  const levels = names.filter((name) => name.startsWith('level:'));

  if (states.length === 0) note(issue, 'has no state: label');
  if (states.length > 1) note(issue, `has ${states.length} state labels (${states.join(', ')}); exactly one is allowed`);

  for (const label of states) {
    const value = label.slice('state:'.length);
    if (!STATES.includes(value)) note(issue, `has unknown state '${value}'`);
  }

  if (levels.length === 0) note(issue, 'has no level: label (epic, story or task)');
  if (levels.length > 1) note(issue, `has ${levels.length} level labels; exactly one is allowed`);

  if (levels.includes('level:task') && !issue.parent) {
    note(issue, 'is a task with no parent story');
  }

  if (states.includes('state:ready')) {
    if (!names.some((name) => name.startsWith('priority:'))) {
      note(issue, 'is ready but has no priority: label, so it cannot be sequenced');
    }
    const blockers = openBlockersOf(issue);
    if (blockers.length > 0) {
      note(issue, `is ready but is blocked by ${blockers.map((blocker) => `#${blocker.number}`).join(', ')}`);
    }
    if (names.includes('blocked:stakeholder') || names.includes('blocked:adr')) {
      note(issue, 'is ready but still carries a blocked: label');
    }
  }

  if (states.includes('state:done')) {
    note(issue, 'is marked done but is still open; it should have been closed by its merged pull request');
  }
}

// One issue held by two branches means two agents believe they own it.
const branches = gh(['api', 'repos/{owner}/{repo}/branches', '--jq', '.[].name']);
if (branches.ok) {
  const claims = new Map();
  for (const branch of branches.stdout.split('\n').map((line) => line.trim()).filter(Boolean)) {
    const match = /^(backend|frontend|qa)\/issue-(\d+)$/.exec(branch);
    if (!match) continue;
    const list = claims.get(match[2]) ?? [];
    list.push(branch);
    claims.set(match[2], list);
  }
  for (const [issueNumber, held] of claims) {
    const developerBranches = held.filter((branch) => !branch.startsWith('qa/'));
    if (developerBranches.length > 1) {
      problems.push(`#${issueNumber} is claimed by more than one developer branch: ${developerBranches.join(', ')}`);
    }
  }
}

// `Closes #n` in a pull request body closes the issue, but GitHub does not touch
// its labels. An issue that merged while still labelled in-qa reads on the board
// as work in flight, and nothing above would ever see it, because everything
// above looks only at open issues.
const closed = gh(['issue', 'list', '--state', 'closed', '--limit', '50', '--json', 'number,title,labels,stateReason']);
if (closed.ok) {
  let recentlyClosed = [];
  try {
    recentlyClosed = JSON.parse(closed.stdout);
  } catch {
    recentlyClosed = [];
  }

  for (const issue of recentlyClosed) {
    if (issue.stateReason === 'NOT_PLANNED') continue;
    const stale = namesOf(issue).filter((name) => name.startsWith('state:') && name !== 'state:done');
    if (stale.length > 0) {
      note(issue, `is closed but still labelled ${stale.join(', ')}; it should be state:done`);
    }
  }
}

console.log('');
if (problems.length === 0) {
  pass(`Board is clean (${issues.length} open issue(s)).`);
  process.exit(0);
}

console.error(`${colours.red}${problems.length} board problem(s):${colours.reset}`);
for (const problem of problems) console.error(`  - ${problem}`);
console.error('\nThe Product Owner owns fixing these. See .cursor/rules/workflow.mdc.');
process.exit(1);
