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

## Sort modes (`app/utils/task-sort.ts`)

Frontend board columns consume these pure helpers. Manual order override is out
of scope here (story #17).

### Types

`SortMode` is defined in `app/types/task.ts`:

```ts
type SortMode = 'default' | 'alphabetically' | 'dueDate' | 'priority'
```

### Exports

| Export         | Signature                                            | Behaviour                                             |
| -------------- | ---------------------------------------------------- | ----------------------------------------------------- |
| `compareTasks` | `(a: Task, b: Task, mode: SortMode) => number`       | Comparator for the mode; negative if `a` before `b`   |
| `sortTasks`    | `(tasks: readonly Task[], mode: SortMode) => Task[]` | Returns a **new** sorted array; does not mutate input |

### Key chains

| Mode             | Primary  | Then     | Then     |
| ---------------- | -------- | -------- | -------- |
| `default`        | due date | priority | title    |
| `dueDate`        | due date | priority | title    |
| `alphabetically` | title    | due date | priority |
| `priority`       | priority | due date | title    |

`default` and `dueDate` share the same key chain.

### Tie-break rules

- **Due date:** ascending (earliest first). `null` sorts after any dated task.
- **Priority:** `high` → `medium` → `low`.
- **Title:** case-insensitive `en-GB` (`localeCompare` with `sensitivity: 'base'`). Empty titles sort before non-empty (natural string order); covered by unit tests.
- **Final:** `id` ascending for a total order when all mode keys match.
