# Interface contract

The single source of truth for the boundary between the backend and the
frontend. Bootstrap creates the real artefact here once the stack is known: an
OpenAPI document, a GraphQL schema, a Protobuf definition, or a shared types
package.

## Why this exists

The two developers are isolated subagents. They cannot talk to each other, and no
amount of prompting changes that. Rather than routing every small question
through the orchestrator, they agree the interface up front and build against it
independently.

## Rules

**This directory is in the shared zone.** The hook layer refuses developer writes
here, in the main tree and inside worktrees alike. A developer that needs a
change describes the exact diff in its response; the orchestrator applies it and
re-dispatches whoever is affected.

That friction is intentional. A contract either developer can quietly change is
not a contract, and a silent change breaks the other one's work in a way that
only surfaces in QA.

**Never mock around a gap.** A frontend mock that diverges from the contract is a
defect hidden from QA until integration. If the contract is missing something,
say so and get it changed.

**A contract change is a real event.** It may invalidate work in flight and may
warrant an ADR if it constrains future design.
