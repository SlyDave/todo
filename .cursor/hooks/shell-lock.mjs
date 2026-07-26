#!/usr/bin/env node
// beforeShellExecution / afterShellExecution: a single advisory lock around the
// commands that worktrees do not isolate.
//
// Separate worktrees give each agent its own files and its own dependency tree,
// but they still share ports, local databases, Docker, and package manager
// caches. Two agents running migrations or starting a dev server at the same
// moment will fail in confusing ways, so those commands are serialised.
//
//   node .cursor/hooks/shell-lock.mjs acquire
//   node .cursor/hooks/shell-lock.mjs release

import { resolve } from 'node:path'
import { rmSync } from 'node:fs'
import { allow, ensureRunDir, readJson, readPayload, respond, runDir, writeJson } from './lib.mjs'

const LOCK_PATH = resolve(runDir, 'shell.lock.json')
const STALE_AFTER_MS = 10 * 60 * 1000
const WAIT_TIMEOUT_MS = 60 * 1000
const POLL_INTERVAL_MS = 750

// Commands that touch shared machine state rather than worktree-local state.
const GUARDED = [
  /\b(npm|pnpm|yarn|bun)\s+(install|ci|add|remove|update)\b/,
  /\b(composer|bundle)\s+(install|update|require)\b/,
  /\b(pip|pip3|poetry|uv)\s+(install|add|sync)\b/,
  /\bdotnet\s+(restore|add)\b/,
  /\b(migrate|migration|db:migrate|migrate:fresh|prisma\s+migrate|alembic)\b/,
  /\bdocker(\s+compose)?\s+(up|down|build|run)\b/,
  /\b(playwright|cypress)\b/,
  /\b(dev|serve|start|preview)\b.*\b(--port|:\d{4})\b/
]

const mode = process.argv[2] ?? 'acquire'
const payload = await readPayload()
const conversation = payload.conversation_id ?? payload.session_id ?? 'unknown'
const command = payload.tool_input?.command ?? payload.command ?? ''

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function currentLock() {
  const lock = readJson(LOCK_PATH, null)
  if (!lock) return null
  if (Date.now() - new Date(lock.acquiredAt).getTime() > STALE_AFTER_MS) return null
  return lock
}

if (mode === 'release') {
  const lock = readJson(LOCK_PATH, null)
  if (lock && lock.conversation === conversation) {
    try {
      rmSync(LOCK_PATH, { force: true })
    } catch {
      /* ignore */
    }
  }
  respond({})
}

if (!GUARDED.some((pattern) => pattern.test(command))) allow()

ensureRunDir()

const deadline = Date.now() + WAIT_TIMEOUT_MS
for (;;) {
  const held = currentLock()
  if (!held || held.conversation === conversation) {
    writeJson(LOCK_PATH, { conversation, command, acquiredAt: new Date().toISOString() })
    allow()
  }
  if (Date.now() >= deadline) {
    respond({
      permission: 'deny',
      agentMessage:
        `Refused: another agent has been running '${held.command}' for ` +
        `${Math.round((Date.now() - new Date(held.acquiredAt).getTime()) / 1000)}s and this command needs the same ` +
        'shared resources (ports, database, Docker or the package manager cache). ' +
        'Do something else and try again, or report the contention to the orchestrator.'
    })
  }
  sleep(POLL_INTERVAL_MS)
}
