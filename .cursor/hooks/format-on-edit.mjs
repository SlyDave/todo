#!/usr/bin/env node
// afterFileEdit: formats the file that was just written, using whatever
// formatter bootstrap recorded for this stack. Standards that live only in a
// prompt decay; standards that run on every edit do not.
//
// No-ops silently until the project has been bootstrapped, and never fails the
// edit - a formatter that is broken or missing is not a reason to reject work
// that has already been written.

import { spawnSync } from 'node:child_process';
import { readPayload, readState, respond, targetPathOf, toRepoRelative } from './lib.mjs';

const payload = await readPayload();
const state = readState();
const command = state?.tooling?.formatCommand;

if (!command) respond({});

const target = toRepoRelative(targetPathOf(payload.tool_input) ?? payload.file_path ?? '');
if (!target) respond({});

const extensions = state?.tooling?.formatExtensions;
if (Array.isArray(extensions) && extensions.length > 0) {
  if (!extensions.some((extension) => target.endsWith(extension))) respond({});
}

try {
  spawnSync(command.replace('{file}', target), {
    shell: true,
    cwd: process.env.CURSOR_PROJECT_DIR ?? process.cwd(),
    timeout: 20_000,
    stdio: 'ignore',
  });
} catch {
  /* a failing formatter must not fail the edit */
}

respond({});
