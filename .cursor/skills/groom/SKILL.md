---
name: groom
description: Hand the Product Owner a batch of raw requirements, change requests or feedback to break down into milestones, epics, stories and tasks. Use when the stakeholder describes new work in prose, when scope changes, or when the board has issues sitting in state:triage.
---

# Groom

Use this when the stakeholder has described work in prose, or when issues have
accumulated in `state:triage`.

## Before dispatching

Capture what the stakeholder actually said, in their words, and ask about
anything that is obviously ambiguous now — a question you ask before grooming
costs one exchange, and the same question discovered mid-implementation costs a
parked issue and a wasted run.

Specifically, pin down:

- Whether this is new scope or a change to something already agreed. A change
  may invalidate work in flight or an accepted ADR.
- Which milestone it belongs to, or whether it needs a new one.
- How the stakeholder will know it is done. This becomes the acceptance criteria.
- Whether it is more urgent than what is already `state:ready`.

## Dispatch

Send the `product-owner` subagent the raw requirement verbatim, plus the answers
above, plus any relevant accepted ADRs and the terms from `CONTEXT.md` it
touches. It cannot see this conversation.

Ask it to:

1. Break the work down into milestones, epics, stories and tasks, and place them
   under the correct parents.
2. Write Given/When/Then acceptance criteria on every story. Use cases live here,
   not as separate issues.
3. Set `level:`, `priority:` and `state:` labels, and record blockers with
   `--blocked-by`.
4. Re-sequence the existing backlog if this changes what should come next.
5. Fold any new terminology into `CONTEXT.md`, and absorb anything sitting in
   `docs/context/proposals/`.
6. Flag anything it could not resolve, rather than inventing an answer.
7. Run `node .sdlc/scripts/validate-board.mjs` before finishing.

## After

Report back what was created, what changed in priority order, and anything the
Product Owner flagged as needing a decision. Put those questions to the
stakeholder immediately — issues created in `state:triage` that nobody grooms are
just a slower way of forgetting.
