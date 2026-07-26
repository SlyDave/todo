# Distribution

`.cursor/` is the only place you edit. Everything else is generated:

```
node .sdlc/scripts/sync-distributions.mjs          # regenerate
node .sdlc/scripts/sync-distributions.mjs --check  # fail if stale (use in CI)
```

Generated from it:

- **`.claude/agents/` and `.claude/skills/`** — compatibility mirrors. Cursor
  reads `.claude/` paths natively, so these cost nothing and let the same repo
  work with Claude Code.
- **`.cursor-plugin/`** — the installable plugin bundle.

## Template repository vs plugin

They serve different needs and are not mutually exclusive.

**As a template repository** you get everything: the agents, the rules, the
skills, *and* the enforcement layer — hooks, the worktree scripts, the pre-PR
gate, board validation, the ADR and contract scaffolding. This is the full
system, and it is what the workflow is designed around.

**As a plugin** you get the agents, rules, skills and MCP configuration
installed into a repository that already exists. That is the right choice for
bringing the roles to an existing codebase.

## What the plugin deliberately leaves out

**Hooks.** Hook commands resolve relative to the project root, so
`node .cursor/hooks/guard-writes.mjs` only works in a repository created from
this template. Shipping `hooks.json` in a plugin would point at scripts the host
repository does not have — and because hooks fail open unless `failClosed` is
set, that failure would be silent. A plugin user would believe the shared zone
was protected when it was not, which is worse than knowing it is unprotected.

**`.sdlc/`** — the scripts, the state file and the label definitions. The plugin
is a set of instructions; the template is a working system.

So a plugin install gives you the roles and the discipline, but the
worktree isolation, the shared-zone enforcement and the pre-PR gate all come
from the template. If you want those in an existing repository, copy `.sdlc/`
and `.cursor/hooks/` across as well and add `.cursor/hooks.json`.

## Installing the plugin locally to test it

Copy or symlink `.cursor-plugin/` into `~/.cursor/plugins/local/sdlc-ai`, then
reload Cursor.

## Keeping it honest

Run `node .sdlc/scripts/sync-distributions.mjs --check` in CI. Without it the
mirrors drift from `.cursor/`, and a stale mirror is worse than no mirror
because it silently contradicts the source.
