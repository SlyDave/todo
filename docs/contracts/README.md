# Interface contract

This project is a **client-only Nuxt SPA** with localStorage persistence and no
HTTP API. There is no OpenAPI, GraphQL, or Protobuf boundary between developers.

Ownership is by path inside the single application (see
`.sdlc/state.json` and `docs/adr/2026-07-26-stack-selection.md`). Domain and
persistence live under backend-owned globs; UI under frontend-owned globs.

If a future ADR introduces a real network API, replace this file with that
contract artefact and restore the shared-zone change process described in the
template documentation.

## Needs actioned (stale) helpers

Pure helpers in `app/utils/task-domain.ts` for story #22 card indicators:

- `isNeedsActioned(task, now?)` — `true` when the task needs actioned (stale).
- Thresholds (strict greater-than): ToDo **> 15 days**, InProgress **> 3 days** since `stateChangedAt`.
- Complete and tasks at or under the threshold are never flagged.
- Constants: `TODO_NEEDS_ACTIONED_DAYS` / `_MS`, `IN_PROGRESS_NEEDS_ACTIONED_DAYS` / `_MS`.

## Priority filter helpers

Pure helpers in `app/utils/priority-filter.ts` for story #16 card visibility:

- `ALL_TASK_PRIORITIES` — `low` / `medium` / `high` (default selection shows every task).
- `filterTasksByPriority(tasks, selectedPriorities)` — returns tasks whose `priority` is in the selected set (array or `Set`), preserving input order.
- Empty selection → `[]`. Full selection → every task returned.
- Does not interpret soft-delete, column state, or metrics; callers pass the list to filter and own column counts (filter only hides cards).
