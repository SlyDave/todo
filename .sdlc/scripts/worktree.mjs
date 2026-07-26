#!/usr/bin/env node
// Creates and removes the per-role worktrees that keep parallel developers from
// colliding.
//
//   node .sdlc/scripts/worktree.mjs create backend 42
//   node .sdlc/scripts/worktree.mjs remove backend
//   node .sdlc/scripts/worktree.mjs list
//
// Worktrees live inside the repository at .worktrees/<role> rather than in a
// sibling directory, because Cursor's file tools are scoped to the workspace
// root and an agent cannot reach ../project-backend.

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { ROLES, fail, info, pass, repoRoot, run } from './common.mjs'

const [, , command, role, issue] = process.argv

function usage() {
  console.error('Usage: worktree.mjs create <backend|frontend|qa> <issue-number>')
  console.error('       worktree.mjs remove <backend|frontend|qa>')
  console.error('       worktree.mjs list')
  process.exit(2)
}

function requireRole(value) {
  if (!ROLES.includes(value)) {
    fail(`Unknown role '${value}'. Expected one of: ${ROLES.join(', ')}`)
    process.exit(2)
  }
}

function defaultBranch() {
  const remote = run('git', ['symbolic-ref', 'refs/remotes/origin/HEAD'])
  if (remote.ok) return remote.stdout.replace('refs/remotes/origin/', '')
  const local = run('git', ['symbolic-ref', '--short', 'HEAD'])
  return local.ok ? local.stdout : 'main'
}

if (command === 'list') {
  const result = run('git', ['worktree', 'list'])
  console.log(result.stdout || 'No worktrees.')
  process.exit(result.ok ? 0 : 1)
}

if (command === 'create') {
  if (!role || !issue) usage()
  requireRole(role)
  if (!/^\d+$/.test(issue)) {
    fail(`Issue number must be numeric, got '${issue}'.`)
    process.exit(2)
  }

  const path = join('.worktrees', role)
  const branch = `${role}/issue-${issue}`

  if (existsSync(join(repoRoot, path))) {
    fail(
      `${path} already exists. Another agent may still be working there. ` +
        `Finish or remove it first: node .sdlc/scripts/worktree.mjs remove ${role}`
    )
    process.exit(1)
  }

  const base = defaultBranch()
  // Fetch is best-effort: the template must work in a repo with no remote yet.
  run('git', ['fetch', 'origin', base])

  const branchExists = run('git', ['rev-parse', '--verify', '--quiet', branch]).ok
  const args = branchExists
    ? ['worktree', 'add', path, branch]
    : ['worktree', 'add', '-b', branch, path, base]

  const created = run('git', args)
  if (!created.ok) {
    fail(`Could not create the worktree: ${created.stderr || created.stdout}`)
    process.exit(1)
  }

  pass(`${path} is on ${branch}, based on ${base}.`)
  info('Dispatch the agent with this path as its lane. Its first write binds it there for the run.')
  process.exit(0)
}

if (command === 'remove') {
  if (!role) usage()
  requireRole(role)

  const path = join('.worktrees', role)
  if (!existsSync(join(repoRoot, path))) {
    info(`${path} does not exist; nothing to remove.`)
    process.exit(0)
  }

  const dirty = run('git', ['status', '--porcelain'], { cwd: join(repoRoot, path) })
  if (dirty.ok && dirty.stdout.length > 0) {
    fail(
      `${path} has uncommitted changes and will not be removed. ` +
        'Commit them or discard them deliberately, then run this again.'
    )
    console.error(dirty.stdout)
    process.exit(1)
  }

  const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: join(repoRoot, path)
  }).stdout

  const removed = run('git', ['worktree', 'remove', path])
  if (!removed.ok) {
    fail(`Could not remove the worktree: ${removed.stderr || removed.stdout}`)
    process.exit(1)
  }

  pass(`Removed ${path}.`)

  // A branch checked out in a worktree cannot be deleted, so `gh pr merge
  // --delete-branch` leaves it behind. Clean it up here, but only once it is
  // fully merged, so nothing is lost if removal happened for another reason.
  if (branch && branch !== defaultBranch()) {
    const deleted = run('git', ['branch', '--delete', branch])
    if (deleted.ok) {
      pass(`Deleted the merged branch ${branch}.`)
    } else {
      info(`Left ${branch} in place; it is not fully merged yet.`)
    }
  }

  process.exit(0)
}

usage()
