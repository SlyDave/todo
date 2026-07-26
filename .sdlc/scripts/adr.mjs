#!/usr/bin/env node
// Reads the ADR directory.
//
//   node .sdlc/scripts/adr.mjs index      regenerate docs/adr/README.md
//   node .sdlc/scripts/adr.mjs proposed   list records still awaiting the stakeholder
//
// `proposed` exits non-zero when any record is outstanding, which is what makes
// it usable as a check rather than just a report.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { colours, fail, pass, repoRoot } from './common.mjs';

const adrDir = join(repoRoot, 'docs', 'adr');
const SKIP = new Set(['README.md', 'TEMPLATE.md']);
const STATUS_ORDER = ['proposed', 'accepted', 'rejected', 'superseded'];

function readRecords() {
  let names;
  try {
    names = readdirSync(adrDir).filter((name) => name.endsWith('.md') && !SKIP.has(name));
  } catch {
    return [];
  }

  return names.sort().map((name) => {
    const body = readFileSync(join(adrDir, name), 'utf8');
    const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(body)?.[1] ?? '';
    const field = (key) => new RegExp(`^${key}:\\s*(.+)$`, 'm').exec(frontmatter)?.[1]?.trim() ?? '';
    const title = /^#\s+(.+)$/m.exec(body)?.[1]?.trim() ?? name.replace(/\.md$/, '');
    return {
      file: name,
      title,
      status: (field('status') || 'unknown').toLowerCase(),
      date: field('date'),
      issue: field('issue'),
      deciders: field('deciders'),
    };
  });
}

const records = readRecords();
const command = process.argv[2] ?? 'index';

if (command === 'proposed') {
  const proposed = records.filter((record) => record.status === 'proposed');
  if (proposed.length === 0) {
    pass('No ADRs are awaiting a stakeholder decision.');
    process.exit(0);
  }
  console.error(
    `${colours.yellow}${proposed.length} ADR(s) awaiting a stakeholder decision:${colours.reset}`,
  );
  for (const record of proposed) {
    console.error(`  - ${record.title} (${record.file}${record.issue ? `, issue #${record.issue}` : ''})`);
  }
  console.error('\nAny issue depending on these is blocked. Put them to the stakeholder.');
  process.exit(1);
}

if (command !== 'index') {
  console.error('Usage: adr.mjs [index|proposed]');
  process.exit(2);
}

const lines = [];
if (records.length === 0) {
  lines.push('No ADRs recorded yet.');
} else {
  for (const status of STATUS_ORDER) {
    const group = records.filter((record) => record.status === status);
    if (group.length === 0) continue;
    lines.push(`## ${status.charAt(0).toUpperCase()}${status.slice(1)}`, '');
    for (const record of group) {
      const detail = [record.date, record.issue ? `issue #${record.issue}` : null].filter(Boolean).join(', ');
      lines.push(`- [${record.title}](${record.file})${detail ? ` - ${detail}` : ''}`);
    }
    lines.push('');
  }

  const unknown = records.filter((record) => !STATUS_ORDER.includes(record.status));
  if (unknown.length > 0) {
    lines.push('## Unrecognised status', '');
    for (const record of unknown) lines.push(`- [${record.title}](${record.file}) - status: ${record.status}`);
    lines.push('');
  }
}

const readmePath = join(adrDir, 'README.md');
const existing = readFileSync(readmePath, 'utf8');
const begin = '<!-- BEGIN GENERATED INDEX -->';
const end = '<!-- END GENERATED INDEX -->';

if (!existing.includes(begin) || !existing.includes(end)) {
  fail(`docs/adr/README.md is missing the ${begin} / ${end} markers.`);
  process.exit(1);
}

const updated = `${existing.slice(0, existing.indexOf(begin) + begin.length)}\n\n${lines
  .join('\n')
  .trim()}\n\n${existing.slice(existing.indexOf(end))}`;

writeFileSync(readmePath, updated);
pass(`Indexed ${records.length} ADR(s).`);
