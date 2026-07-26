#!/usr/bin/env node
// The pre-PR gate. No pull request may be opened until this passes.
//
//   node .sdlc/scripts/gate.mjs
//
// Runs the project's own checks, then verifies that the branch only touched
// paths its role is allowed to own. The role comes from the branch name
// (backend/issue-42, qa/issue-42), which is reliable metadata - unlike the
// hook layer, which can tell a subagent from the main agent but cannot tell
// which subagent it is.

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROLES, colours, fail, info, pass, readState, run, warn } from './common.mjs'

// The gate is normally run from inside a worktree, so everything must be
// evaluated against the working directory rather than wherever this script
// happens to live. Getting this wrong makes the gate inspect the main tree and
// silently pass a branch it never looked at.
const workingDir = process.cwd()
const at = (options = {}) => ({ ...options, cwd: workingDir })

function readLocalState() {
  const local = join(workingDir, '.sdlc', 'state.json')
  if (existsSync(local)) {
    try {
      return JSON.parse(readFileSync(local, 'utf8').replace(/^\uFEFF/, ''))
    } catch {
      /* fall through to the template copy */
    }
  }
  return readState()
}

const state = readLocalState()

if (!state || state.status === 'uninitialised') {
  fail(
    'This project has not been bootstrapped, so there is nothing to check. Run the `bootstrap` skill.'
  )
  process.exit(1)
}

let failures = 0

// --- Project checks ---------------------------------------------------------

const checks = state.tooling?.checks ?? {}
const ORDER = ['format', 'lint', 'typecheck', 'test', 'audit']
const configured = ORDER.filter(
  (name) => typeof checks[name] === 'string' && checks[name].length > 0
)

if (configured.length === 0) {
  warn(
    'No checks are configured in .sdlc/state.json. Bootstrap should have set these; the gate is toothless.'
  )
}

for (const name of configured) {
  const command = checks[name]
  info(`\n$ ${command}`)
  const result = run(command, [], at({ shell: true, inherit: true }))
  if (result.ok) {
    pass(name)
  } else {
    fail(`${name} failed (exit ${result.code}). Fix the finding; do not disable the check.`)
    failures += 1
  }
}

// --- Role path ownership ----------------------------------------------------

function globToRegExp(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  const expanded = escaped
    .replace(/\*\*\//g, '\u0000')
    .replace(/\*\*/g, '\u0001')
    .replace(/\*/g, '[^/]*')
    .replace(/\u0000/g, '(?:.*/)?')
    .replace(/\u0001/g, '.*')
    .replace(/\?/g, '[^/]')
  return new RegExp(`^${expanded}$`)
}

// The gate reports on what will actually be in the pull request, which is the
// committed history. Uncommitted work is invisible to it, so a dirty tree would
// let a trespassing change pass unexamined.
const dirty = run('git', ['status', '--porcelain'], at())
if (dirty.ok && dirty.stdout.length > 0) {
  fail(
    '\nThere are uncommitted changes. The gate inspects committed history, so commit your work first.'
  )
  for (const line of dirty.stdout.split('\n')) console.error(`       ${line}`)
  failures += 1
}

const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], at()).stdout
const role = ROLES.find((candidate) => branch.startsWith(`${candidate}/`))

if (!role) {
  info(`\nBranch '${branch}' is not a role branch, so path ownership is not checked.`)
} else {
  const owned = state.ownership?.[role]
  if (!Array.isArray(owned) || owned.length === 0) {
    warn(
      `\nNo ownership globs recorded for '${role}' in .sdlc/state.json; path ownership is not checked.`
    )
  } else {
    const base = state.tracker?.defaultBranch ?? 'main'
    const mergeBase = run('git', ['merge-base', 'HEAD', base], at())
    const diffTarget = mergeBase.ok ? mergeBase.stdout : base
    const diff = run('git', ['diff', '--name-only', diffTarget, 'HEAD'], at())

    if (!diff.ok) {
      warn(`\nCould not diff against '${base}', so path ownership is not checked.`)
    } else {
      const matchers = owned.map(globToRegExp)
      const changed = diff.stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
      const trespass = changed.filter((file) => !matchers.some((matcher) => matcher.test(file)))

      if (trespass.length > 0) {
        fail(
          `\nThis ${role} branch changed ${trespass.length} file(s) outside the paths ${role} owns:`
        )
        for (const file of trespass) console.error(`       ${file}`)
        console.error(
          `\n       ${role} owns: ${owned.join(', ')}\n` +
            '       Revert those changes and ask the orchestrator to arbitrate the ones you genuinely need.'
        )
        failures += 1
      } else {
        pass(`path ownership (${changed.length} file(s) within ${role}'s lane)`)
      }
    }
  }
}

// --- Result -----------------------------------------------------------------

console.log('')
if (failures > 0) {
  console.error(
    `${colours.red}Gate failed with ${failures} problem(s). Do not open a pull request.${colours.reset}`
  )
  process.exit(1)
}
console.log(`${colours.green}Gate passed. Safe to open a pull request.${colours.reset}`)
