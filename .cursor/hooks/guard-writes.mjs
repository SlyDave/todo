#!/usr/bin/env node
// preToolUse: keeps concurrently running subagents out of each other's way.
//
// The spike in docs/sdlc/hook-identity-findings.md established that a hook can
// tell a subagent from the main agent (conversation_id diverges) but cannot tell
// *which* subagent it is - subagentStart shares no join key with the preToolUse
// payload. So this hook enforces isolation, which needs no role identity, and
// leaves role-appropriateness to the pre-PR gate, which reads the branch name.
//
// Two rules:
//   1. No subagent may write to the shared zone, in any lane.
//   2. A subagent conversation is bound to the first lane it writes into.

import { resolve } from 'node:path';
import {
  allow,
  deny,
  ensureRunDir,
  isWriteTool,
  laneOf,
  readJson,
  readPayload,
  rootConversationId,
  runDir,
  targetPathOf,
  toProjectRelative,
  toRepoRelative,
  writeJson,
} from './lib.mjs';

// Evaluated against the project-relative path, so being inside a worktree does
// not grant access.
const SHARED_ZONE = [
  /^\.cursor\//,
  /^\.sdlc\//,
  /^\.github\//,
  /^\.claude\//,
  /^\.cursor-plugin\//,
  /^docs\/contracts\//,
  /^AGENTS\.md$/,
  /^\.env(\..*)?$/,
  /^(package|composer)\.json$/,
  /^(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|composer\.lock|poetry\.lock|Cargo\.lock|Gemfile\.lock|go\.sum)$/,
  /^(pyproject\.toml|requirements[^/]*\.txt|go\.mod|Cargo\.toml|Gemfile)$/,
  /^[^/]+\.(csproj|sln)$/,
];

const CLAIMS_PATH = resolve(runDir, 'claims.json');

function sharedZoneMatch(projectRelative) {
  return SHARED_ZONE.find((pattern) => pattern.test(projectRelative)) ?? null;
}

const payload = await readPayload();

if (!isWriteTool(payload.tool_name)) allow();

const rawTarget = targetPathOf(payload.tool_input);
const repoRelative = rawTarget ? toRepoRelative(rawTarget) : null;

// Writes outside the repository are none of our business.
if (!repoRelative) allow();

const root = rootConversationId();
const conversation = payload.conversation_id ?? payload.session_id ?? null;

// Fail open while we cannot tell who is writing: an unknown root means the
// sessionStart hook has not run, and guessing would block the main agent.
if (!root || !conversation || conversation === root) allow();

const projectRelative = toProjectRelative(repoRelative);
const shared = sharedZoneMatch(projectRelative);

if (shared) {
  deny(
    `Refused: '${projectRelative}' is in the shared zone and subagents may not edit it. ` +
      'Describe the change you need, including the exact diff, in your response to the orchestrator. ' +
      'It will apply the change and re-dispatch you. See .cursor/rules/workflow.mdc.',
  );
}

ensureRunDir();
const claims = readJson(CLAIMS_PATH, {});
const lane = laneOf(repoRelative);
const claimed = claims[conversation]?.lane;

if (!claimed) {
  claims[conversation] = { lane, claimedAt: new Date().toISOString(), firstWrite: repoRelative };
  writeJson(CLAIMS_PATH, claims);
  allow();
}

if (claimed === lane) allow();

const describe = (value) => (value === 'root' ? 'the main working tree' : `.worktrees/${value.slice('worktree:'.length)}`);

deny(
  `Refused: you are working in ${describe(claimed)} and '${repoRelative}' is in ${describe(lane)}. ` +
    'Agents are confined to the lane of their first write so that parallel work cannot collide. ' +
    'If you genuinely need a change in another lane, describe it in your response and let the orchestrator arbitrate.',
);
