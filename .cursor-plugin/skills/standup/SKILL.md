---
name: standup
description: Start a working session. Reads the board, reports what moved, surfaces anything blocked on the stakeholder or awaiting an ADR decision, proposes the next batch of work, and dispatches it once the stakeholder agrees. Use when the stakeholder asks what is happening, what is next, or to get on with the work.
---

# Standup

You are the orchestrator opening a working session. Report, propose, then
dispatch — and do not dispatch before the stakeholder has agreed.

## 1. Read the board

```
node .sdlc/scripts/validate-board.mjs
node .sdlc/scripts/adr.mjs proposed
gh issue list --state open --limit 200 --json number,title,labels,parent,blockedBy,milestone,assignees
gh pr list --state open --json number,title,headRefName,labels,statusCheckRollup
```

Prefer the GitHub MCP `issues` toolset if it is configured; fall back to `gh`.

If `validate-board.mjs` reports problems, do not paper over them. Dispatch the
`product-owner` to fix the board before anything else, because every agent that
reads a broken board afterwards will act on it.

## 2. Report, briefly

Four short paragraphs at most. The stakeholder did not watch the last session.

- **What moved** since the last standup: merged pull requests, issues closed,
  issues that came back from QA.
- **What is in flight**: what is in `planning`, `in-progress` or `in-qa`, and who
  holds it.
- **What needs you**: every issue with `blocked:stakeholder`, with the actual
  question restated, and every ADR still `proposed`. Push for answers here —
  this is the part of standup that unblocks the most work.
- **What is at risk**: issues blocked by other issues, anything QA has rejected
  more than once, milestones drifting.

Do not narrate tool calls, and do not paste raw JSON.

## 3. Propose the next batch

Take the highest-priority `state:ready` issues that are genuinely unblocked. Aim
for one for each developer where independent work exists.

Say for each: the issue, why it is next, which developer will take it, and
anything you expect them to come back and ask. If nothing is workable, say so
plainly — that means the stakeholder is the bottleneck, and the useful thing you
can do is get their answers.

**Wait for the go-ahead.** An autonomous loop that has misunderstood a
requirement produces wrong code at machine speed.

## 4. Dispatch

For each issue the stakeholder approved:

```
node .sdlc/scripts/worktree.mjs create <role> <issue-number>
```

Then launch the developers. When the work is independent, emit **both Task calls
in a single message** so they run in parallel.

Each dispatch must be self-contained, because a subagent starts with no memory of
this conversation:

- The issue number, its title, and its full acceptance criteria
- Its parent epic and the milestone it serves
- The worktree path it is confined to and its branch name
- The relevant sections of the interface contract
- Any accepted ADRs that constrain the work
- The specific terms from `CONTEXT.md` that appear in the issue

A dispatch that says "carry on with the auth work" will waste an entire run.

## 5. Handle what comes back

**Questions.** Try to answer from `PROJECT.md`, `CONTEXT.md` and `docs/adr/`
first, and say where you found the answer. Only genuinely new questions reach the
stakeholder. Anything you cannot answer leaves the issue `blocked:stakeholder`
while the developer takes the next unblocked issue.

**Proposed ADRs.** Put them to the stakeholder now, not at the end. Work
depending on them is blocked until they are decided.

**Contract changes.** You own the shared zone. Apply the change yourself, then
re-dispatch whoever needed it and consider whether the other developer is
affected.

**A finished pull request.** Dispatch `qa` against it. Do not merge on the
developer's own assurance that it works.

**QA approval**, meaning the pull request carries `qa:approved`. Verify the gate
passed and that no ADR it depends on is still proposed, then, in this order:

```
node .sdlc/scripts/worktree.mjs remove <role>
gh pr merge <n> --squash --delete-branch
gh issue edit <issue> --remove-label "state:in-qa" --add-label "state:done"
```

Remove the worktree **before** merging. Git will not delete a branch that a
worktree has checked out, so `--delete-branch` fails if you merge first. And
`Closes #n` closes the issue without touching its labels, so set `state:done`
yourself or the board will still show the work as in QA.

## 6. Close the session

Tell the stakeholder what changed, what is now waiting on them, and what will
happen next time. If anything is still outstanding on their side, that is the
last thing you say, because it is the thing that decides how fast the next
session goes.
