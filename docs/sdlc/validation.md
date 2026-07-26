# Validating the template

## Automated

```
node .sdlc/scripts/selftest.mjs
```

Copies the repository into a throwaway directory under the system temp folder,
initialises a git repository there, and exercises the enforcement layer. It never
touches your working tree, your git history, or GitHub.

Nineteen checks, covering:

- **Hook decisions** — the main agent may write the shared zone; a subagent may
  not, including from inside its own worktree; a subagent claims a lane on its
  first write and is then confined to it; writes outside the repository are
  ignored.
- **Worktree lifecycle** — creation puts the role on `<role>/issue-<n>`, a second
  create refuses to clobber an occupied lane, removal works once the lane is
  committed, and removal deletes a merged branch while keeping an unmerged one.
- **The pre-PR gate** — refuses an uncommitted tree, passes for a branch that
  stayed inside its lane, and fails, naming the offending file, for one that
  strayed into another role's paths.
- **Supporting tooling** — derived distributions are in sync with `.cursor/`, the
  ADR index regenerates, and the label definitions parse.

The self-test is how the path-ownership bug was found where the gate resolved git
operations against the script's own location instead of the working directory,
which made it silently inspect the main tree and pass a branch it had never
looked at. Run it after changing anything in `.cursor/hooks/` or
`.sdlc/scripts/`.

## The GitHub half

The self-test deliberately creates nothing on GitHub. Everything from the board
outwards needs a real remote, so it has to be walked by hand.

This has been done once, against a scratch repository, taking two stories from
`triage` through to `done` with real issues, worktrees, pull requests, a QA
rejection and a re-review. It found five things, all since fixed, and they are
worth knowing about because four were invisible locally:

- **`blockedBy` is not an array.** GitHub returns
  `{"nodes": [...], "totalCount": n}`, so the board validator's length check was
  always `undefined` and the blocked-issue rule had never once fired. It also now
  ignores blockers that are already closed.
- **QA cannot approve a pull request.** GitHub rejects `--approve` and
  `--request-changes` on a pull request opened by the same account, and all five
  agents share the stakeholder's identity. `reviewDecision` is therefore always
  empty and useless as a merge gate. QA now records its verdict as a comment-type
  review plus a `qa:approved` or `qa:rejected` label, which is what the
  orchestrator checks.
- **The pre-PR gate ignored uncommitted work.** It diffs committed history, so a
  developer with a trespassing but uncommitted change got a cheerful "0 files
  within your lane". It now refuses to run against a dirty tree.
- **`gh pr merge --delete-branch` cannot delete a branch a worktree holds**, and
  it aborts before deleting the remote branch too, stranding both. Remove the
  worktree first. `worktree.mjs remove` now also deletes the branch if it is
  fully merged, so getting the order wrong is self-healing.
- **`Closes #n` closes the issue but leaves its labels alone**, so merged work sat
  on the board still labelled `state:in-qa`. The validator now checks closed
  issues for stale state labels, which nothing looking only at open issues could
  ever have caught.

### Repeating it

1. Create a scratch repository, public or private, with Issues enabled:
   `gh repo create sdlc-ai-scratch --private --clone`

1. Create a scratch repository, public or private, with Issues enabled:
   `gh repo create sdlc-ai-scratch --private --clone`
2. Copy this template into it and commit.
3. Open it in Cursor and **reload the workspace**, so the subagents in
   `.cursor/agents/` are registered.
4. Say anything. The orchestrator should notice `.sdlc/state.json` is
   `uninitialised` and start the interview rather than doing what you asked.
5. Give it a small project — a URL shortener is about the right size — and answer
   "I don't know" when it asks about the stack, to exercise the guided path.
6. Check that it stops for approval before running any install command, and that
   it does not mark bootstrap complete until a build and a smoke test pass.
7. Check the board: labels applied, milestones created, epics and stories linked
   by parent, acceptance criteria present as Given/When/Then.
8. Run `/standup` and take **one** issue all the way through:
   `ready` to `planning` to `in-progress` to `in-qa` to `done`, with a pull
   request that QA reviews and the orchestrator merges.

The mechanical half of that walk — labels, milestone, hierarchy, dependency,
states, worktree, gate, pull request, rejection, re-review, merge — is
reproducible without any agents involved, which is how the five findings above
were isolated. What it cannot tell you is whether the agents *choose* to follow
the workflow, which is what the next section is for.

### What to watch for

- Does the developer genuinely stop and park when it hits an unanswered
  question, or does it guess? Guessing is the failure this workflow exists to
  prevent.
- Does QA run the application, or only read the diff?
- Does the orchestrator raise proposed ADRs unprompted at the top of a turn?
- Does `node .sdlc/scripts/validate-board.mjs` stay clean after each transition?
- Does the orchestrator try to write code itself instead of dispatching? The hook
  layer will not stop it, because the main agent is allowed to write.

### Known limits you will hit

`.cursor/mcp.json` does not reach Cursor Cloud Agents, so cloud runs fall back to
the `gh` CLI. Hooks need a trusted workspace, and prompt-based hooks and
`sessionStart` do not run in the cloud at all. Treat the enforcement layer as
present locally and absent in the cloud, where the pre-PR gate is the only thing
still guarding the lanes.
