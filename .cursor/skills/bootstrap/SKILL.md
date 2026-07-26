---
name: bootstrap
description: First-run setup for a project created from this template. Use when .sdlc/state.json is missing or its status is uninitialised or bootstrapping, or when the stakeholder asks to set up, initialise or start the project. Runs the requirements interview, chooses a stack, scaffolds and installs, and produces the initial backlog.
---

# Bootstrap

You are the orchestrator running first-time setup. Nothing else happens until
this completes: no code, no issues, no subagent dispatch.

Read `.sdlc/state.json` first. If `status` is `bootstrapping`, a previous attempt
was interrupted — tell the stakeholder where it stopped and resume from that
stage rather than starting over. Set `status` to `bootstrapping` as soon as you
begin, and update the state file at the end of each stage so an interruption is
always recoverable.

There are five stages, in order, and stages 3 and 5 have stakeholder gates you
must not cross unilaterally.

---

## Stage 1 — Understand the project

Interview the stakeholder. Ask as many questions as you need, but ask **one or
two at a time** — a wall of questions gets a wall of shallow answers. Give your
own recommendation with each question so they have something to react to.

Cover, at minimum:

- **What is this, in one sentence?** Who uses it, and what do they get from it?
- **What must it do?** Push for concrete capabilities, not adjectives.
- **What must it explicitly not do?** Non-goals prevent more waste than goals.
- **Who are the users, and are there different kinds?** Roles drive
  authorisation, which drives the data model.
- **Scale and shape.** Rough numbers of users and records, read-heavy or
  write-heavy, real-time or batch, offline requirements.
- **Constraints that are already fixed.** Existing systems to integrate with,
  hosting, budget, compliance, languages the stakeholder must be able to
  maintain themselves.
- **What does the first useful version look like?** The smallest thing worth
  having.
- **How will you know it works?** This becomes the shape of the acceptance
  criteria.

Listen for the stakeholder's own vocabulary and write it down verbatim. Their
words seed `CONTEXT.md`, and replacing their terms with your own is how a project
ends up with two languages.

Stop interviewing when you can state the project back to them and they agree it
is right. Then write:

- **`PROJECT.md`** — vision, users, capabilities, non-goals, constraints, the
  definition of the first useful version, and open questions.
- **`CONTEXT.md`** — the domain terms gathered so far, in the stakeholder's
  language.

Show them `PROJECT.md` and get confirmation before continuing. Everything
downstream inherits its errors.

---

## Stage 2 — Choose the stack

Ask what technology stack they want. **"I don't know" is a completely valid
answer and you must say so when you ask.** So is "you decide". If they give you
one, your job is to sanity-check it against the requirements, not to argue them
out of a reasonable choice.

When they don't know, guide rather than interrogate. Work out what actually
constrains the choice:

- Who maintains this after you? A stack the stakeholder cannot read is a
  liability regardless of its merits.
- Is there an existing system or team convention to match?
- Does the shape of the problem push somewhere specific? Heavy relational data,
  real-time collaboration, document workflows, machine learning, native mobile,
  and simple CRUD all have different obvious answers.
- Where will it be deployed, and what is the operational appetite?
- What is the honest expected lifetime? A prototype and a decade-long system
  deserve different answers.

Then recommend one stack, name the two or three you rejected, and say why in
terms of *their* constraints rather than general opinion. Prefer boring,
well-supported technology with strong typing and a large ecosystem.

Decide the architecture at the same time, because it determines how the two
developers divide work:

- **Decoupled** — separate API and client. Ownership is by path.
- **Monolith** — one application with server-rendered views. Ownership is by
  layer: the backend developer takes domain, data and HTTP; the frontend
  developer takes templates, assets and client-side behaviour.

---

## Stage 3 — The Stack Decision, and the gate

Write `docs/adr/<today>-stack-selection.md` from `docs/adr/TEMPLATE.md`, with
`status: proposed`. Alongside it, present a **Stack Decision** to the stakeholder
containing:

1. The chosen stack and architecture, and why, in terms of their constraints.
2. The alternatives rejected, and why.
3. The ownership boundary the two developers will work to, stated as explicit
   path globs.
4. The strict tooling that will be configured — see
   `.cursor/rules/engineering-standards.mdc` for the bar per ecosystem.
5. **The literal list of commands you intend to run, in order.**

**Stop here and wait for approval.** Do not run anything until they say yes.

When they approve, mark the ADR `status: accepted` and record the decision in
`.sdlc/state.json`.

---

## Stage 4 — Scaffold, install, verify

Execute the approved command list as a batch, showing output. If you need to
deviate from the list — a scaffolder asks something you did not anticipate, a
package does not exist, a version conflicts — **stop and get re-approval for the
change**. An approved plan you silently departed from is not an approved plan.

Use official scaffolders (`create-next-app`, `composer create-project`,
`cargo new`, `dotnet new`, `rails new`) rather than hand-assembling a project.
Hand-rolled scaffolding produces something subtly non-idiomatic that fights its
own ecosystem forever.

Then configure the strict tooling, and add:

- `.env.example` with names and no values
- The interface contract skeleton in `docs/contracts/` if the architecture is
  decoupled
- A minimal smoke test that proves the application starts and responds

Record in `.sdlc/state.json`: the stack, the ownership globs, `tooling.checks`
for format, lint, typecheck, test and audit, `tooling.formatCommand` for the
edit hook, and `tooling.smokeTest`.

**Bootstrap is not complete until the build and the smoke test both pass.** Run
them. If they fail, fix them now — handing a broken skeleton to the developers
means every subsequent failure is ambiguous.

---

## Stage 5 — The backlog, and the second gate

Dispatch the `product-owner` subagent to turn `PROJECT.md` into a proposed
backlog: milestones, epics, stories with Given/When/Then acceptance criteria, and
tasks where a story is genuinely too large. Have it write to
`docs/backlog-proposal.md` as a **local document**, not to GitHub.

Review it yourself for obvious gaps, then present it to the stakeholder.

**Stop here and wait for approval.** Reviewing a markdown file is easy; unwinding
fifty wrong issues out of a GitHub project is not.

Once approved, set up GitHub:

1. Confirm a remote exists. If not, ask whether to create one
   (`gh repo create`) or to defer GitHub entirely and work locally for now.
2. `node .sdlc/scripts/labels.mjs apply`
3. Detect whether the repository belongs to an organisation with issue types
   defined. If it does, set `tracker.useIssueTypes` and pass `--type` as well as
   the `level:` labels. The labels remain the source of truth either way.
4. Create milestones, then issues top-down so parents exist before children,
   linking with `--parent` and recording known blockers with `--blocked-by`.
   Commands are in `docs/sdlc/github.md`.
5. Delete `docs/backlog-proposal.md`; GitHub is now the board.
6. `node .sdlc/scripts/validate-board.mjs` and fix anything it reports.

---

## Finishing

Set `status` to `ready` and `bootstrap.completedAt` in `.sdlc/state.json`, then
move this template's own README aside:

- The template's usage documentation belongs at `docs/sdlc/README.md`.
- The root `README.md` becomes the **project's** README, written for someone who
  has just cloned it.

Commit everything.

Then tell the stakeholder what exists now, what the first milestone is, and that
`/standup` is how they start a working session. Mention that subagents defined in
`.cursor/agents/` need a Cursor reload before they can be dispatched, if the
workspace has not been reloaded since the clone.
