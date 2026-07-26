#!/usr/bin/env node
// sessionStart: records the root conversation id that guard-writes.mjs needs in
// order to tell the main agent from a subagent, and injects the state of the
// project into the first turn.
//
// This event is fire-and-forget - the agent loop does not wait for it and it
// cannot block session creation - so it only reports, never gates.

import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { ensureRunDir, projectDir, readPayload, readState, recordRootConversationId, respond, runDir } from './lib.mjs';

const payload = await readPayload();

ensureRunDir();
recordRootConversationId(payload.conversation_id ?? payload.session_id);

// Lane claims are per-session. Carrying them across sessions would pin a stale
// conversation id to a worktree that no longer exists.
try {
  rmSync(resolve(runDir, 'claims.json'), { force: true });
} catch {
  /* ignore */
}

const notes = [];
const state = readState();

if (!state || state.status === 'uninitialised' || state.status === 'bootstrapping') {
  notes.push(
    'This project has not been bootstrapped. Before doing anything else, run the `bootstrap` skill ' +
      'to agree requirements, choose a stack and set up the board.',
  );
} else {
  const adrDir = resolve(projectDir, 'docs', 'adr');
  let proposed = [];
  try {
    proposed = readdirSync(adrDir)
      .filter((name) => name.endsWith('.md') && name !== 'README.md' && name !== 'TEMPLATE.md')
      .filter((name) => /^status:\s*proposed\s*$/m.test(readFileSync(resolve(adrDir, name), 'utf8')));
  } catch {
    /* no ADR directory yet */
  }

  if (proposed.length > 0) {
    notes.push(
      `${proposed.length} ADR(s) are still awaiting a stakeholder decision: ${proposed.join(', ')}. ` +
        'Raise these with the stakeholder this turn, and keep raising them until they are accepted or rejected. ' +
        'Any issue depending on them is blocked.',
    );
  }

  const worktrees = resolve(projectDir, '.worktrees');
  if (existsSync(worktrees)) {
    const active = readdirSync(worktrees, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    if (active.length > 0) {
      notes.push(
        `Worktrees left over from a previous session: ${active.join(', ')}. ` +
          'Check whether that work was finished, and remove them with `node .sdlc/scripts/worktree.mjs remove <role>`.',
      );
    }
  }
}

respond(notes.length > 0 ? { additional_context: notes.join('\n\n') } : {});
