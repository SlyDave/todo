#!/usr/bin/env node
// Verifies the template's own plumbing end to end, in a throwaway copy of this
// repository under the system temp directory. Nothing here touches your working
// tree, your git history, or GitHub.
//
//   node .sdlc/scripts/selftest.mjs
//
// Covers: the hook decisions (shared zone, lane binding, main-agent pass-through),
// the worktree lifecycle, and the pre-PR gate including a path-ownership breach.
// It does not cover the GitHub half of the workflow, which needs a real remote -
// see docs/sdlc/validation.md.

import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { colours, repoRoot, run } from './common.mjs'

const results = []
const check = (name, ok, detail) => {
  results.push({ name, ok, detail })
  const mark = ok ? `${colours.green}PASS${colours.reset}` : `${colours.red}FAIL${colours.reset}`
  console.log(`${mark} ${name}`)
  if (!ok && detail) console.log(`     ${detail.split('\n').join('\n     ')}`)
}

const sandbox = mkdtempSync(join(tmpdir(), 'sdlc-ai-selftest-'))
console.log(`Sandbox: ${sandbox}\n`)

try {
  // --- Set up a throwaway copy -----------------------------------------------

  cpSync(repoRoot, sandbox, {
    recursive: true,
    filter: (source) =>
      !source.includes(`${join(repoRoot, '.git')}`) && !source.includes('.worktrees')
  })

  const git = (args, cwd = sandbox) => run('git', args, { cwd })
  git(['init', '--initial-branch=main'])
  git(['config', 'user.email', 'selftest@sdlc-ai'])
  git(['config', 'user.name', 'sdlc-ai selftest'])
  git(['add', '-A'])
  const committed = git(['commit', '-m', 'selftest baseline'])
  check('throwaway repository initialises', committed.ok, committed.stderr)

  // A bootstrapped project, with checks that always succeed so the gate is
  // exercising path ownership rather than someone else's linter.
  const noop = process.platform === 'win32' ? 'cmd /c exit 0' : 'true'
  writeFileSync(
    join(sandbox, '.sdlc', 'state.json'),
    `${JSON.stringify(
      {
        status: 'ready',
        templateVersion: '0.1.0',
        ownership: {
          mode: 'path',
          backend: ['apps/api/**', 'docs/adr/**', 'docs/context/proposals/**'],
          frontend: ['apps/web/**', 'docs/adr/**', 'docs/context/proposals/**'],
          qa: ['tests/**', 'e2e/**']
        },
        tooling: { checks: { lint: noop, test: noop } },
        tracker: { provider: 'github', defaultBranch: 'main' }
      },
      null,
      2
    )}\n`
  )
  git(['add', '-A'])
  git(['commit', '-m', 'selftest: bootstrapped state'])

  // --- Hook decisions ---------------------------------------------------------

  mkdirSync(join(sandbox, '.sdlc', 'run'), { recursive: true })
  writeFileSync(
    join(sandbox, '.sdlc', 'run', 'session.json'),
    JSON.stringify({ rootConversationId: 'ROOT' })
  )

  const hook = (payload) => {
    const result = run('node', ['.cursor/hooks/guard-writes.mjs'], {
      cwd: sandbox,
      input: JSON.stringify(payload)
    })
    return result.stdout
  }

  const write = (conversation, path) => ({
    tool_name: 'Write',
    conversation_id: conversation,
    tool_input: { file_path: join(sandbox, path) }
  })

  const mainAgent = hook(write('ROOT', 'package.json'))
  check('hook lets the main agent write the shared zone', mainAgent.includes('"allow"'), mainAgent)

  const sharedZone = hook(write('SUB-A', join('.worktrees', 'backend', 'package.json')))
  check(
    'hook refuses a subagent the shared zone, even inside its own worktree',
    sharedZone.includes('"deny"'),
    sharedZone
  )

  const claim = hook(write('SUB-B', join('.worktrees', 'backend', 'apps', 'api', 'index.ts')))
  check('hook lets a subagent claim its lane on first write', claim.includes('"allow"'), claim)

  const sameLane = hook(write('SUB-B', join('.worktrees', 'backend', 'apps', 'api', 'other.ts')))
  check('hook allows further writes in the claimed lane', sameLane.includes('"allow"'), sameLane)

  const crossLane = hook(write('SUB-B', join('.worktrees', 'frontend', 'apps', 'web', 'page.tsx')))
  check('hook refuses a cross-lane write', crossLane.includes('"deny"'), crossLane)

  const outside = hook({
    tool_name: 'Write',
    conversation_id: 'SUB-C',
    tool_input: { file_path: join(tmpdir(), 'unrelated.txt') }
  })
  check('hook ignores writes outside the repository', outside.includes('"allow"'), outside)

  rmSync(join(sandbox, '.sdlc', 'run'), { recursive: true, force: true })

  // --- Worktree lifecycle -----------------------------------------------------

  const created = run('node', ['.sdlc/scripts/worktree.mjs', 'create', 'backend', '42'], {
    cwd: sandbox
  })
  check('worktree create', created.ok, created.stderr || created.stdout)

  const worktree = join(sandbox, '.worktrees', 'backend')
  const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: worktree }).stdout
  check('worktree is on the role branch', branch === 'backend/issue-42', `got '${branch}'`)

  const duplicate = run('node', ['.sdlc/scripts/worktree.mjs', 'create', 'backend', '43'], {
    cwd: sandbox
  })
  check('worktree create refuses to clobber an occupied lane', !duplicate.ok, duplicate.stdout)

  // --- Gate: uncommitted work --------------------------------------------------

  // The gate diffs committed history, so a dirty tree would let a trespassing
  // change through unexamined. It has to refuse rather than report "0 files".
  mkdirSync(join(worktree, 'apps', 'api'), { recursive: true })
  writeFileSync(join(worktree, 'apps', 'api', 'index.ts'), 'export const ok = true;\n')

  const dirtyGate = run('node', [join(sandbox, '.sdlc', 'scripts', 'gate.mjs')], { cwd: worktree })
  const refusedDirty =
    !dirtyGate.ok && (dirtyGate.stdout + dirtyGate.stderr).includes('uncommitted changes')
  check(
    'gate refuses to run against an uncommitted tree',
    refusedDirty,
    dirtyGate.stdout + dirtyGate.stderr
  )

  // --- Gate: a compliant branch ----------------------------------------------

  run('git', ['add', '-A'], { cwd: worktree })
  run('git', ['commit', '-m', 'backend work'], { cwd: worktree })

  const goodGate = run('node', [join(sandbox, '.sdlc', 'scripts', 'gate.mjs')], { cwd: worktree })
  check('gate passes for a branch inside its lane', goodGate.ok, goodGate.stdout + goodGate.stderr)

  // --- Gate: a branch that strayed --------------------------------------------

  mkdirSync(join(worktree, 'apps', 'web'), { recursive: true })
  writeFileSync(join(worktree, 'apps', 'web', 'page.tsx'), 'export default () => null;\n')
  run('git', ['add', '-A'], { cwd: worktree })
  run('git', ['commit', '-m', 'backend strays into the frontend lane'], { cwd: worktree })

  const badGate = run('node', [join(sandbox, '.sdlc', 'scripts', 'gate.mjs')], { cwd: worktree })
  const caught = !badGate.ok && (badGate.stdout + badGate.stderr).includes('apps/web/page.tsx')
  check(
    'gate rejects a branch that touched another role\u2019s paths',
    caught,
    badGate.stdout + badGate.stderr
  )

  // --- Cleanup ----------------------------------------------------------------

  const dirtyRemove = run('node', ['.sdlc/scripts/worktree.mjs', 'remove', 'backend'], {
    cwd: sandbox
  })
  check(
    'worktree remove succeeds once the lane is committed',
    dirtyRemove.ok,
    dirtyRemove.stderr || dirtyRemove.stdout
  )

  // The branch here is unmerged, so it must survive; removal must not discard
  // work just because the worktree went away.
  const survived = run('git', ['rev-parse', '--verify', '--quiet', 'backend/issue-42'], {
    cwd: sandbox
  })
  check(
    'worktree remove keeps an unmerged branch',
    survived.ok,
    'the branch was deleted with work still on it'
  )

  // Once merged, the branch is litter, and git refuses to delete a branch a
  // worktree still holds, so `gh pr merge --delete-branch` cannot do it either.
  run('git', ['merge', '--no-ff', '-m', 'merge backend', 'backend/issue-42'], { cwd: sandbox })
  run('node', ['.sdlc/scripts/worktree.mjs', 'create', 'backend', '44'], { cwd: sandbox })
  run('node', ['.sdlc/scripts/worktree.mjs', 'remove', 'backend'], { cwd: sandbox })
  const merged = run('git', ['rev-parse', '--verify', '--quiet', 'backend/issue-44'], {
    cwd: sandbox
  })
  check(
    'worktree remove deletes a fully merged branch',
    !merged.ok,
    'the merged branch was left behind'
  )

  // --- Derived distributions ---------------------------------------------------

  const distributions = run('node', ['.sdlc/scripts/sync-distributions.mjs', '--check'], {
    cwd: sandbox
  })
  check('derived distributions are in sync with .cursor/', distributions.ok, distributions.stderr)

  const adrIndex = run('node', ['.sdlc/scripts/adr.mjs', 'index'], { cwd: sandbox })
  check('ADR index regenerates', adrIndex.ok, adrIndex.stderr)

  const labels = run('node', ['.sdlc/scripts/labels.mjs', 'list'], { cwd: sandbox })
  check(
    'label definitions parse',
    labels.ok && labels.stdout.includes('state:ready'),
    labels.stderr
  )
} finally {
  try {
    run('git', ['worktree', 'prune'], { cwd: sandbox })
    rmSync(sandbox, { recursive: true, force: true, maxRetries: 3 })
  } catch {
    console.log(`\nCould not remove the sandbox; delete it manually: ${sandbox}`)
  }
}

const failed = results.filter((result) => !result.ok)
console.log('')
if (failed.length > 0) {
  console.error(
    `${colours.red}${failed.length} of ${results.length} checks failed.${colours.reset}`
  )
  process.exit(1)
}
console.log(`${colours.green}All ${results.length} checks passed.${colours.reset}`)
