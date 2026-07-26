# sdlc-ai

A template repository that ships a pre-configured AI development team. Clone it,
answer some questions, and you get a project with a stack, a backlog, and five
agents that know their jobs and stay out of each other's way.

## The team

| Role | Where it lives | What it owns |
| --- | --- | --- |
| Orchestrator | `AGENTS.md` — the main chat agent | Talking to you, arbitration, ADRs, merging |
| Product Owner | `.cursor/agents/product-owner.md` | The backlog, the board, `CONTEXT.md` |
| Backend Developer | `.cursor/agents/backend-developer.md` | Server-side implementation |
| Frontend Developer | `.cursor/agents/frontend-developer.md` | Client-side implementation |
| QA | `.cursor/agents/qa.md` | Verification, integration and E2E tests |

The orchestrator is the main chat agent rather than a subagent, because in Cursor
only the main agent can ask you a question and remember the answer. The other
four are subagents it dispatches.

## Getting started

1. **Use this template** on GitHub, then clone your new repository.
2. **Check the prerequisites** below.
3. **Open it in Cursor and reload the workspace.** Subagents in `.cursor/agents/`
   are not registered until Cursor has indexed them.
4. **Say anything.** The orchestrator reads `.sdlc/state.json`, sees the project
   is uninitialised, and starts the interview. Or type `/bootstrap` explicitly.

Bootstrap asks what you are building, asks as many questions as it needs, and
then asks what stack you want. **"I don't know" is a valid answer** — it will
work out what actually constrains the choice and recommend one, telling you what
it rejected and why.

Nothing is installed until you approve a written list of the exact commands, and
bootstrap is not finished until the build and a smoke test pass.

## Prerequisites

- **Node 18 or later** — the hooks and scripts are plain Node with no
  dependencies.
- **Git 2.20 or later** — for worktrees.
- **GitHub CLI 2.94 or later** — earlier versions lack `--parent`, `--type` and
  `--blocked-by`, which the workflow depends on. Check with `gh --version`, then
  `gh auth login`.
- **A GitHub repository with Issues enabled.** The board is GitHub Issues.
- **Optional: `GITHUB_PAT` in your environment** to enable the GitHub MCP server,
  which the agents prefer over the CLI. See
  [docs/sdlc/github.md](docs/sdlc/github.md).
- **A trusted Cursor workspace**, or the hooks will not run.

## Daily use

`/standup` reads the board, tells you what moved, surfaces anything waiting on
you, proposes the next batch of work, and dispatches it once you agree.

`/groom` hands a batch of new requirements to the Product Owner to break down.

Work flows through six states — `triage`, `ready`, `planning`, `in-progress`,
`in-qa`, `done` — with strict ownership of each transition. One issue, one
branch, one pull request, reviewed by QA and merged by the orchestrator.

## How it keeps agents out of each other's way

Each developer works in its own git worktree under `.worktrees/`, on its own
branch. Three layers stop them colliding:

- **The hook layer** refuses any subagent write to the shared zone (package
  manifests, lockfiles, CI config, the interface contract, `.cursor/`, `.sdlc/`),
  and binds each subagent to the lane of its first write.
- **The pre-PR gate** (`node .sdlc/scripts/gate.mjs`) runs format, lint,
  typecheck, test and audit, and rejects a branch that touched paths its role
  does not own.
- **The board validator** (`node .sdlc/scripts/validate-board.mjs`) catches
  issues with no state label, two state labels, or two developers claiming one
  issue.

There is a real limit worth knowing: hooks can tell a subagent from the main
agent, but they **cannot tell which subagent it is**. That is measured, not
assumed — see [docs/sdlc/hook-identity-findings.md](docs/sdlc/hook-identity-findings.md).
Role-appropriate paths are therefore checked at the gate, using the branch name.

`node .sdlc/scripts/selftest.mjs` verifies all of this in a throwaway copy of the
repository, touching neither your working tree nor GitHub.

## What lives where

```
AGENTS.md                  orchestrator brief, always in context
.cursor/agents/            the four subagents
.cursor/rules/             workflow, engineering standards, ADR conventions
.cursor/skills/            bootstrap, standup, groom
.cursor/hooks/             enforcement, written in Node for Windows portability
.cursor/mcp.json           GitHub MCP via ${env:GITHUB_PAT}
.sdlc/state.json           status, stack, ownership boundary, tooling commands
.sdlc/labels.yml           committed label definitions
.sdlc/scripts/             gate, board validation, worktrees, labels, ADR index
docs/adr/                  decision records
docs/contracts/            the backend/frontend interface contract
docs/context/proposals/    terminology awaiting the Product Owner
docs/sdlc/                 this system's own documentation
```

`.cursor/` is canonical. `.claude/` and `.cursor-plugin/` are generated from it
by `node .sdlc/scripts/sync-distributions.mjs` — see
[docs/sdlc/distribution.md](docs/sdlc/distribution.md).

## Further reading

- [docs/sdlc/roles.md](docs/sdlc/roles.md) — what each agent does and why
- [docs/sdlc/github.md](docs/sdlc/github.md) — MCP setup and every `gh` command
- [docs/sdlc/distribution.md](docs/sdlc/distribution.md) — template vs plugin
- [docs/sdlc/validation.md](docs/sdlc/validation.md) — the self-test, and the
  manual walkthrough it cannot cover
- [docs/sdlc/hook-identity-findings.md](docs/sdlc/hook-identity-findings.md) —
  what hooks can and cannot enforce

Bootstrap moves this file to `docs/sdlc/README.md` and replaces the root
`README.md` with your project's own.
