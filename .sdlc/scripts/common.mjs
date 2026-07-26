// Shared helpers for the .sdlc scripts. Node standard library only, so the
// tooling works before any project dependencies have been installed.

import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const statePath = join(repoRoot, '.sdlc', 'state.json')

export const ROLES = ['backend', 'frontend', 'qa']

export function readState() {
  try {
    return JSON.parse(readFileSync(statePath, 'utf8').replace(/^\uFEFF/, ''))
  } catch {
    return null
  }
}

export function writeState(state) {
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`)
}

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: 'utf8',
    shell: options.shell ?? false,
    input: options.input,
    stdio: options.inherit ? 'inherit' : 'pipe'
  })
  return {
    ok: result.status === 0,
    code: result.status ?? 1,
    stdout: (result.stdout ?? '').trim(),
    stderr: (result.stderr ?? '').trim(),
    error: result.error
  }
}

export function gh(args, options = {}) {
  return run('gh', args, options)
}

/** gh 2.94 introduced --parent, --type, --blocked-by and --blocking. */
export function ghSupportsIssueRelationships() {
  const version = gh(['--version'])
  if (!version.ok) return false
  const match = /gh version (\d+)\.(\d+)\.(\d+)/.exec(version.stdout)
  if (!match) return false
  const [major, minor] = [Number(match[1]), Number(match[2])]
  return major > 2 || (major === 2 && minor >= 94)
}

export const colours = {
  reset: '\u001b[0m',
  red: '\u001b[31m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  dim: '\u001b[2m'
}

export function fail(message) {
  console.error(`${colours.red}FAIL${colours.reset} ${message}`)
}

export function warn(message) {
  console.warn(`${colours.yellow}WARN${colours.reset} ${message}`)
}

export function pass(message) {
  console.log(`${colours.green}OK${colours.reset}   ${message}`)
}

export function info(message) {
  console.log(`${colours.dim}${message}${colours.reset}`)
}
