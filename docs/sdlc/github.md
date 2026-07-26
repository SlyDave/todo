# GitHub integration

The board is GitHub Issues. There are two ways to reach it, and the agents should
prefer the first when it is available.

## 1. GitHub MCP server (preferred)

`.cursor/mcp.json` points at GitHub's hosted MCP server. It needs a personal
access token in your environment as `GITHUB_PAT`, because GitHub's server
requires a PAT rather than OAuth when used from Cursor.

Create a token with `repo` scope — add `project` scope only if you decide to use
a Projects v2 board, which this template does not require. Then set it in your
shell profile so Cursor inherits it:

```powershell
# Windows, PowerShell profile
$env:GITHUB_PAT = 'github_pat_...'
```

```bash
# macOS / Linux
export GITHUB_PAT='github_pat_...'
```

Useful toolsets: `issues` for issues and sub-issues, `pull_requests` for review
and merge. Never commit the token; `.cursor/mcp.json` only ever contains the
`${env:GITHUB_PAT}` placeholder.

**The MCP server is not available to Cursor Cloud Agents.** Cloud agents read
their MCP configuration from the team dashboard, not from the repository, so a
cloud agent must use the CLI below.

## 2. The `gh` CLI (fallback, and what the scripts use)

**Requires gh 2.94 or later.** That release added `--type`, `--parent`,
`--blocked-by` and `--blocking`, which this workflow depends on. Check with
`gh --version`.

```bash
gh auth status
gh auth login   # if needed
```

### Reading the board

```bash
gh issue list --state open --limit 200 \
  --json number,title,labels,parent,blockedBy,milestone,assignees

gh issue view 42 --json number,title,body,labels,parent,subIssues,blockedBy,comments
```

### Creating work

```bash
# An epic
gh issue create --title "Ordering" --body-file epic.md --label "level:epic,state:triage"

# A story beneath it
gh issue create --title "Place an order" --body-file story.md \
  --label "level:story,state:triage" --parent 12

# A task beneath the story
gh issue create --title "Order total calculation" --body-file task.md \
  --label "level:task,state:triage" --parent 13
```

In an organisation that defines issue types, add `--type Story` as well. The
`level:` labels stay authoritative so personal repositories behave identically.

### Dependencies

```bash
gh issue edit 14 --add-blocked-by 13
gh issue edit 13 --add-blocking 14
gh issue edit 14 --remove-blocked-by 13
```

Use these rather than writing "blocked by #13" in the body. The Product Owner
sequences work by querying this data.

### Moving through the workflow

Exactly one `state:` label at a time, so always remove the old one in the same
call:

```bash
gh issue edit 42 --remove-label "state:ready" --add-label "state:planning"
gh issue comment 42 --body-file plan.md
```

### Parking on a question

```bash
gh issue comment 42 --body-file questions.md
gh issue edit 42 --add-label "blocked:stakeholder" \
  --remove-label "state:planning" --add-label "state:ready"
```

### Pull requests

```bash
gh pr create --base main --head backend/issue-42 \
  --title "Order total calculation" --body-file pr.md

# Once QA has approved, in this order:
node .sdlc/scripts/worktree.mjs remove backend
gh pr merge 7 --squash --delete-branch
gh issue edit 42 --remove-label "state:in-qa" --add-label "state:done"
```

The pull request body must contain `Closes #42` and state how each acceptance
criterion is met.

Two things bite here. Git will not delete a branch that a worktree still has
checked out, so merging before removing the worktree makes `--delete-branch`
fail and strands the local branch. And `Closes #42` closes the issue but leaves
its labels untouched, so the state label must be moved by hand or the board goes
on showing merged work as in QA.

### QA's verdict

GitHub refuses to let an account approve or request changes on its own pull
request, and every agent here runs under the stakeholder's single identity.
`gh pr review --approve` and `--request-changes` therefore fail with *"Can not
request changes on your own pull request"*, and `reviewDecision` is always
empty. Do not use either as a merge gate.

What does work is a comment-type review, which carries the detail, paired with a
label, which carries the verdict a machine can read:

```bash
gh pr review 7 --comment --body-file findings.md
gh pr edit 7 --add-label "qa:rejected"

# or, once it passes
gh pr edit 7 --add-label "qa:approved" --remove-label "qa:rejected"
```

The orchestrator checks for `qa:approved` before merging:

```bash
gh pr view 7 --json labels --jq '[.labels[].name]'
```

If you give QA its own machine account and put that token in `GITHUB_PAT`, real
approvals become available and are worth preferring. The label remains the
gate, so nothing else has to change.

### Milestones and labels

```bash
node .sdlc/scripts/labels.mjs apply
gh api repos/{owner}/{repo}/milestones -f title="MVP" -f description="..."
gh issue edit 42 --milestone "MVP"
```

## Troubleshooting

**`gh: command not found`** — install the GitHub CLI, then `gh auth login`.

**`--parent` is not recognised** — you are below gh 2.94. Upgrade.

**`--set-parent` is not recognised** — there is no such flag. Setting a parent on
an existing issue is `gh issue edit 42 --parent 12`; `--set-parent` only ever
appears in prose about GitHub, never in the CLI.

**`--type` fails** — issue types are configured per organisation. Personal
repositories do not have them, which is expected; the `level:` labels cover it.

**A `--jq` expression silently returns nothing on Windows** — PowerShell strips
the inner double quotes out of something like `--jq '[.labels[].name] |
join(",")'`, leaving jq a syntax error, and an agent that reads the empty result
as "no labels" will draw exactly the wrong conclusion. Keep `--jq` expressions
free of embedded double quotes, or take the raw `--json` output and parse it in
Node.

**`gh ... --json > file.json` produces JSON that will not parse on Windows** —
PowerShell's `>` writes UTF-16 with a byte order mark. Pipe to
`Out-File -Encoding utf8` if you must write a file, but prefer not to: the
helpers in `.sdlc/scripts/common.mjs` read the process output directly and never
touch the disk, which sidesteps both this and the quoting problem above.

**MCP tools are missing** — `GITHUB_PAT` is not set in the environment Cursor
inherited, or the workspace needs a reload. Fall back to `gh` in the meantime.

**No remote** — the board needs one. `gh repo create` from inside the repository,
or work locally and defer GitHub until you have one.
