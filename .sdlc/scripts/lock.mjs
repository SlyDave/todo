#!/usr/bin/env node
// Inspects and clears the advisory shell lock held by .cursor/hooks/shell-lock.mjs.
// Useful when an agent run was interrupted while holding it.
//
//   node .sdlc/scripts/lock.mjs status
//   node .sdlc/scripts/lock.mjs clear

import { existsSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { info, pass, repoRoot, warn } from './common.mjs'

const lockPath = join(repoRoot, '.sdlc', 'run', 'shell.lock.json')
const command = process.argv[2] ?? 'status'

if (command === 'clear') {
  if (!existsSync(lockPath)) {
    info('No lock held.')
    process.exit(0)
  }
  rmSync(lockPath, { force: true })
  pass('Lock cleared.')
  process.exit(0)
}

if (command !== 'status') {
  console.error('Usage: lock.mjs [status|clear]')
  process.exit(2)
}

if (!existsSync(lockPath)) {
  info('No lock held.')
  process.exit(0)
}

try {
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'))
  const ageSeconds = Math.round((Date.now() - new Date(lock.acquiredAt).getTime()) / 1000)
  console.log(`Held by conversation ${lock.conversation} for ${ageSeconds}s`)
  console.log(`Command: ${lock.command}`)
  if (ageSeconds > 600)
    warn('Older than 10 minutes, so it is treated as stale and will be taken over.')
} catch {
  warn('Lock file is unreadable. Clear it with: node .sdlc/scripts/lock.mjs clear')
  process.exit(1)
}
