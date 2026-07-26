#!/usr/bin/env node
// Applies the label definitions in .sdlc/labels.yml to the GitHub repository, so
// that a clone reproduces the board's vocabulary exactly.
//
//   node .sdlc/scripts/labels.mjs apply
//   node .sdlc/scripts/labels.mjs list

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fail, gh, info, pass, repoRoot } from './common.mjs';

// labels.yml is deliberately a fixed two-level shape (group -> list of
// name/color/description), so it is parsed directly rather than pulling in a
// YAML dependency the template would otherwise not need.
function parseLabels(source) {
  const labels = [];
  let current = null;

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, '');
    if (line.length === 0 || /^\s*#/.test(line)) continue;

    const item = /^\s*-\s*name:\s*"(.+)"\s*$/.exec(line);
    if (item) {
      current = { name: item[1], color: 'ededed', description: '' };
      labels.push(current);
      continue;
    }

    const field = /^\s+(color|description):\s*"(.*)"\s*$/.exec(line);
    if (field && current) {
      current[field[1]] = field[2];
    }
  }

  return labels;
}

const source = readFileSync(join(repoRoot, '.sdlc', 'labels.yml'), 'utf8');
const labels = parseLabels(source);
const command = process.argv[2] ?? 'list';

if (labels.length === 0) {
  fail('No labels parsed from .sdlc/labels.yml. Check the file has not been reformatted.');
  process.exit(1);
}

if (command === 'list') {
  for (const label of labels) console.log(`${label.name.padEnd(24)} #${label.color}  ${label.description}`);
  console.log(`\n${labels.length} label(s) defined. Apply them with: node .sdlc/scripts/labels.mjs apply`);
  process.exit(0);
}

if (command !== 'apply') {
  console.error('Usage: labels.mjs [apply|list]');
  process.exit(2);
}

let failures = 0;
for (const label of labels) {
  const result = gh([
    'label',
    'create',
    label.name,
    '--color',
    label.color,
    '--description',
    label.description,
    '--force',
  ]);
  if (result.ok) {
    info(`applied ${label.name}`);
  } else {
    fail(`${label.name}: ${result.stderr || result.stdout}`);
    failures += 1;
  }
}

if (failures > 0) {
  fail(`${failures} label(s) could not be applied. Check \`gh auth status\` and that a GitHub remote exists.`);
  process.exit(1);
}

pass(`Applied ${labels.length} label(s).`);
