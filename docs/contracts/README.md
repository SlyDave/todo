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

Frontend board columns consume these pure helpers. They **ignore** `manualOrder`;
per-column override behaviour is documented under Manual order override below
(story #17 / task #64).

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

## Manual order override (`app/utils/task-manual-order.ts`)

Per-column ranks for story #17. Sort-mode helpers above stay unchanged and continue
to ignore `manualOrder`. Frontend board UI consumes these pure helpers (and the
persistence methods on `useTaskStorage`) — no board UI lives in this module.

### Field

`Task.manualOrder: number | null` — per-column user-chosen rank. `null` means the
task follows the active `SortMode` when the column has no override.

### Active override

A column has an **active override** when at least one task in that column slice
has a non-null `manualOrder`. While active, display order follows manual ranks,
not the selected sort mode.

### Exports

| Export                         | Signature                                                                 | Behaviour                                                |
| ------------------------------ | ------------------------------------------------------------------------- | -------------------------------------------------------- |
| `columnHasManualOrderOverride` | `(tasks: readonly Task[]) => boolean`                                     | `true` when ≥1 non-null `manualOrder`                    |
| `compareManualOrder`           | `(a: Task, b: Task) => number`                                            | Ascending rank; nulls after numeric; then `id` ascending |
| `orderTasksForColumn`          | `(tasks: readonly Task[], mode: SortMode) => Task[]`                      | Override → manual sort; else → `sortTasks(mode)`         |
| `applyManualOrderRanks`        | `(orderedTasks: readonly Task[]) => Task[]`                               | Contiguous `0..n-1` in the given order; new array        |
| `clearManualOrderRanks`        | `(tasks: readonly Task[]) => Task[]`                                      | All `manualOrder: null`; new array                       |
| `withManualOrderOnColumnEnter` | `(newcomer: Task, destinationExcludingNewcomer: readonly Task[]) => Task` | Override → append after max rank; else force `null`      |
| `mergeTasksById`               | `(allTasks: readonly Task[], updates: readonly Task[]) => Task[]`         | Replace by id; preserve `allTasks` order                 |

### Persistence (`useTaskStorage`)

| Method             | Signature                                                               | Behaviour                                                                 |
| ------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `applyManualOrder` | `(state: TaskState, orderedIds: readonly string[], options?) => Task[]` | Validates ids cover every active task in the column; persists ranks       |
| `clearManualOrder` | `(state: TaskState, options?) => Task[]`                                | Persists all-null ranks for that column only                              |
| `changeState`      | unchanged signature                                                     | After the column move, applies `withManualOrderOnColumnEnter` before save |

Other columns' ranks are never rewritten by apply/clear/enter. Gaps left when a
task leaves an override column are left as-is until the next apply/reorder.

## Calendar histograms (`app/utils/calendar-histogram.ts`)

Shared intensity and mode helpers serve both monthly and yearly grids.

### Shared

| Export                                 | Notes                                                     |
| -------------------------------------- | --------------------------------------------------------- |
| `HistogramIntensity`                   | `0`…`4`                                                   |
| `intensityStage(count, peak)`          | Peak day → `4`; empty → `0`                               |
| `eventMatchesMode` / `activityDateKey` | Unchanged mode semantics (activity / created / completed) |

### Monthly (existing)

`buildMonthHistogram` / `useCalendarHistogram().forMonth` → `MonthHistogram` (`weekday`: Sun=0…Sat=6).

### Yearly (story #72 / task #78)

`buildYearHistogram(events, endDate, mode?)` / `useCalendarHistogram().forYear(options?)` → `YearHistogram`.

| Field                   | Meaning                                                      |
| ----------------------- | ------------------------------------------------------------ |
| `endDate`               | Inclusive UTC end (`YYYY-MM-DD`); defaults to today UTC      |
| `startDate`             | Monday of the first week column                              |
| `weekCount`             | `52` (`YEAR_HISTOGRAM_WEEK_COUNT`)                           |
| `days`                  | Column-major, length `weekCount * 7`                         |
| `YearDayCell.weekRow`   | `0` = Monday … `6` = Sunday (differs from monthly `weekday`) |
| `YearDayCell.weekIndex` | `0` = oldest … `51` = current week                           |
| `YearDayCell.inRange`   | `false` for days after `endDate` in the last week (padding)  |

Last column = current week; last in-range cell = `endDate`. Intensity peak is over in-range days in the yearly window only.
