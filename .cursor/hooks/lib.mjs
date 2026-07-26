// Shared helpers for the hook scripts.
//
// Hooks fail open in Cursor unless `failClosed` is set, so everything here is
// written to degrade quietly rather than throw. A hook that crashes must not
// take the agent down with it.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

export const projectDir = process.env.CURSOR_PROJECT_DIR ?? process.cwd();
export const runDir = resolve(projectDir, '.sdlc', 'run');

export function readPayload() {
  return new Promise((res) => {
    let raw = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      raw += chunk;
    });
    process.stdin.on('end', () => {
      try {
        res(JSON.parse(raw.replace(/^\uFEFF/, '')));
      } catch {
        res({});
      }
    });
    process.stdin.on('error', () => res({}));
  });
}

export function respond(body) {
  process.stdout.write(JSON.stringify(body ?? {}));
  process.exit(0);
}

export function allow() {
  respond({ permission: 'allow' });
}

export function deny(reason) {
  process.stderr.write(`${reason}\n`);
  respond({ permission: 'deny', agentMessage: reason, userMessage: reason });
}

export function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return fallback;
  }
}

export function writeJson(path, value) {
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
    return true;
  } catch {
    return false;
  }
}

export function readState() {
  return readJson(resolve(projectDir, '.sdlc', 'state.json'), null);
}

/**
 * The main agent keeps one conversation id for the whole session; every
 * subagent gets its own. `sessionStart` records the root id, and
 * `subagentStart` confirms it via `parent_conversation_id`. Without a recorded
 * root we cannot safely assume anything, so callers treat null as "unknown"
 * and fail open.
 */
export function rootConversationId() {
  return readJson(resolve(runDir, 'session.json'), {}).rootConversationId ?? null;
}

export function recordRootConversationId(id) {
  if (!id) return;
  const path = resolve(runDir, 'session.json');
  const current = readJson(path, {});
  if (current.rootConversationId === id) return;
  writeJson(path, { ...current, rootConversationId: id, recordedAt: new Date().toISOString() });
}

/** Absolute path -> repo-relative with forward slashes, or null if outside the repo. */
export function toRepoRelative(candidate) {
  if (typeof candidate !== 'string' || candidate.length === 0) return null;
  const absolute = isAbsolute(candidate) ? candidate : resolve(projectDir, candidate);
  const rel = relative(projectDir, absolute);
  if (rel.startsWith('..') || isAbsolute(rel)) return null;
  return rel.split(sep).join('/');
}

/**
 * Which lane a repo-relative path belongs to. Worktrees live under
 * `.worktrees/<name>`; everything else is the root tree.
 */
export function laneOf(repoRelativePath) {
  const match = /^\.worktrees\/([^/]+)(?:\/|$)/.exec(repoRelativePath);
  return match ? `worktree:${match[1]}` : 'root';
}

/**
 * A worktree is a full checkout, so `.worktrees/backend/docs/contracts/api.yaml`
 * is the same project file as `docs/contracts/api.yaml`. Shared-zone rules are
 * evaluated against this stripped form, otherwise a developer could edit shared
 * files simply by being inside a worktree.
 */
export function toProjectRelative(repoRelativePath) {
  return repoRelativePath.replace(/^\.worktrees\/[^/]+\//, '');
}

const WRITE_TOOLS = new Set(['Write', 'StrReplace', 'Delete', 'EditNotebook', 'Edit', 'MultiEdit']);

export function isWriteTool(toolName) {
  return WRITE_TOOLS.has(toolName);
}

/** Tool inputs disagree on the key name for their target path. */
export function targetPathOf(toolInput) {
  if (!toolInput || typeof toolInput !== 'object') return null;
  for (const key of ['file_path', 'path', 'target_notebook', 'filePath', 'targetFile']) {
    if (typeof toolInput[key] === 'string' && toolInput[key].length > 0) return toolInput[key];
  }
  return null;
}

export function ensureRunDir() {
  try {
    mkdirSync(runDir, { recursive: true });
  } catch {
    /* ignore */
  }
}

export function fileExists(path) {
  return existsSync(path);
}
