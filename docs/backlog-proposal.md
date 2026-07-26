# Backlog proposal — First useful version

This document proposes the backlog for shipping the **first useful version** of the To-Do SPA as defined in `PROJECT.md`. It is a proposal only: no GitHub issues have been created from it.

Vocabulary follows `CONTEXT.md`. Architecture and ownership follow `docs/adr/2026-07-26-stack-selection.md` (Nuxt 4 static SPA, localStorage, path-based backend/frontend split).

---

## Milestone

### First useful version

Ship when every capability in `PROJECT.md` works end-to-end on the static site with local persistence — not a subset.

**Done when:** CRUD, drag-and-drop state changes, timestamps, soft-delete/restore within 30 days, stale indicators, sort/filter/manual order, column metrics, calendar month navigation and activity/created/completed modes, Markdown description rendering, theme toggle, and a successful GitHub Pages deploy path are all verified; smoke check that the app loads from the static build and persists a task across refresh.

---

## Epic 1 — Task domain and persistence

**Need:** A durable in-browser task model so the board can create, read, update, and soft-delete tasks with correct timestamps and Markdown-capable descriptions, without a backend.

**Depends on:** Nothing (foundation). UI epics are blocked by stories here.

### Story 1.1 — Persist tasks in local storage

**Size:** M · **Priority:** P0  
**Blocked by:** —

As the personal user, I need tasks saved in the browser’s local storage so my board survives a refresh on this device.

**Acceptance criteria**

- **Given** I have created or edited tasks on the board  
  **When** I refresh the page  
  **Then** those tasks reload from local storage with the same fields and column (ToDo, InProgress, or Complete)

- **Given** local storage is empty  
  **When** the application starts  
  **Then** the board shows no tasks and no error is raised

- **Given** persisted data is present  
  **When** the application starts  
  **Then** only well-formed task records are loaded; corrupt entries do not crash the app

### Story 1.2 — Create and edit task fields

**Size:** M · **Priority:** P0  
**Blocked by:** 1.1

As the personal user, I need to create and edit a task’s description (required, Markdown), optional title, priority, due date, and background colour.

**Acceptance criteria**

- **Given** I am adding a new task  
  **When** I save without a description  
  **Then** the task is not created and I am told description is required

- **Given** I provide a description (and optionally title, priority, due date, background colour)  
  **When** I save a new task  
  **Then** the task appears in ToDo with priority defaulting to medium when omitted, and **created** is set

- **Given** an existing task  
  **When** I change title, description, priority, due date, or background colour and save  
  **Then** those fields update and **details last modified** is updated, without changing **state last changed**

- **Given** a description containing Markdown  
  **When** the task is stored  
  **Then** the raw Markdown is persisted (rendering is a UI concern)

### Story 1.3 — Record column state and distinct timestamps

**Size:** S · **Priority:** P0  
**Blocked by:** 1.1

As the personal user, I need each task to live in exactly one column (ToDo, InProgress, Complete) with **created**, **details last modified**, and **state last changed** tracked separately.

**Acceptance criteria**

- **Given** a task in ToDo  
  **When** its column changes to InProgress or Complete  
  **Then** its state updates and **state last changed** is set to now, without treating the move as a details edit

- **Given** a newly created task  
  **When** it is first saved  
  **Then** **created**, **details last modified**, and **state last changed** are all set appropriately for creation in ToDo

- **Given** a details-only edit  
  **When** I save  
  **Then** **details last modified** updates and **state last changed** does not

### Story 1.4 — Soft-delete and restore in the domain

**Size:** M · **Priority:** P0  
**Blocked by:** 1.1, 1.3

As the personal user, I need soft-deleted tasks kept for 30 days and restorable, with activity recorded for the calendar.

**Acceptance criteria**

- **Given** an active task  
  **When** it is soft-deleted  
  **Then** it is no longer active on the board, remains recoverable, and the soft-delete is recorded as **activity** for that day

- **Given** a recoverable task within 30 days of soft-delete  
  **When** it is restored  
  **Then** it returns to its prior column with fields intact, and the restore is recorded as **activity** for that day

- **Given** a soft-deleted task older than 30 days  
  **When** recovery is attempted or purge runs  
  **Then** the task is no longer recoverable

- **Given** create, details edit, state change, restore, or soft-delete  
  **When** the event occurs  
  **Then** it contributes to **activity** for the calendar on that day

---

## Epic 2 — Board UI and drag-and-drop

**Need:** A three-column board where the user can view, create, and edit tasks and move them between ToDo, InProgress, and Complete by drag-and-drop.

**Depends on:** Epic 1 (domain before UI).

### Story 2.1 — Three-column board shell

**Size:** M · **Priority:** P0  
**Blocked by:** 1.1, 1.3

As the personal user, I need to see tasks grouped into ToDo, InProgress, and Complete columns.

**Acceptance criteria**

- **Given** persisted tasks in various columns  
  **When** I open the board  
  **Then** each task appears only in its current column (ToDo, InProgress, or Complete)

- **Given** the board is empty  
  **When** I view it  
  **Then** all three columns are visible and empty

### Story 2.2 — Create and edit tasks on the board

**Size:** L · **Priority:** P0  
**Blocked by:** 1.2, 2.1

As the personal user, I need board UI to add and edit tasks, including Markdown-rendered descriptions and priority icons.

**Acceptance criteria**

- **Given** I am on the board  
  **When** I create a task with a valid description and optional fields  
  **Then** it appears in ToDo and persists across refresh

- **Given** a task card  
  **When** I edit and save its fields  
  **Then** the card reflects the changes and Markdown in the description is rendered safely (sanitised)

- **Given** a task with priority low, medium, or high  
  **When** I view the card  
  **Then** the matching priority icon is shown (chevron down, flat bar, or chevron up)

- **Given** a task with a background colour  
  **When** I view the card  
  **Then** the card uses that colour

#### Tasks (story is large)

- **2.2.a** — Create-task form/flow (required description, optional fields, validation messaging in British English)
- **2.2.b** — Edit-task form/flow and card field display
- **2.2.c** — Sanitised Markdown rendering for descriptions
- **2.2.d** — Priority icons (Font Awesome Pro deep imports) and background colour on cards

### Story 2.3 — Drag-and-drop between columns

**Size:** M · **Priority:** P0  
**Blocked by:** 1.3, 2.1

As the personal user, I need to drag a task between columns so its state updates and **state last changed** is recorded separately from detail edits.

**Acceptance criteria**

- **Given** a task in ToDo  
  **When** I drop it on InProgress or Complete  
  **Then** it leaves ToDo, appears in the target column, persists that state, and **state last changed** updates

- **Given** a task moved by drag-and-drop  
  **When** I inspect timestamps  
  **Then** **details last modified** is unchanged by the move alone

- **Given** I start a drag and cancel or drop outside a valid column  
  **When** the gesture ends  
  **Then** the task remains in its original column

---

## Epic 3 — Sort, filter, and manual order

**Need:** Controllable ordering and priority filtering, with per-column manual order always winning over the selected sort.

**Depends on:** Epic 2 board shell (and domain fields for due date / priority / title).

### Story 3.1 — Sort modes

**Size:** M · **Priority:** P0  
**Blocked by:** 2.1, 1.2

As the personal user, I need a sort dropdown with Default, Alphabetically, Due Date, and Priority modes.

**Acceptance criteria**

- **Given** tasks with mixed titles, due dates, and priorities  
  **When** I choose **Default**  
  **Then** each column orders by due date, then priority, then alphabetically by title (empty titles sort consistently)

- **Given** the same tasks  
  **When** I choose **Alphabetically**  
  **Then** order is title, then due date, then priority

- **Given** the same tasks  
  **When** I choose **Due Date**  
  **Then** order is due date, then priority, then alphabetically

- **Given** the same tasks  
  **When** I choose **Priority**  
  **Then** order is priority, then due date, then alphabetically

### Story 3.2 — Priority filter

**Size:** S · **Priority:** P0  
**Blocked by:** 2.1, 1.2

As the personal user, I need a multi-select priority filter (low / medium / high) defaulting to all visible.

**Acceptance criteria**

- **Given** tasks of mixed priorities  
  **When** the filter is at its default  
  **Then** low, medium, and high tasks are all visible

- **Given** I deselect one or more priorities  
  **When** the filter applies  
  **Then** only tasks matching the selected priorities remain visible in each column

- **Given** a filtered-out task  
  **When** I restore that priority to the selection  
  **Then** the task is visible again in its column

### Story 3.3 — Per-column manual order override

**Size:** M · **Priority:** P0  
**Blocked by:** 3.1, 2.3

As the personal user, I need a per-column manual order that always overrides the selected sort until cleared or reordered.

**Acceptance criteria**

- **Given** a sort mode is selected  
  **When** I reorder tasks within a column (manual order)  
  **Then** that column’s display follows the manual ranks, not the sort dropdown

- **Given** manual order is set in one column  
  **When** I change the sort dropdown  
  **Then** columns without manual order follow the new sort, and columns with manual order keep their ranks

- **Given** manual order exists in a column  
  **When** I clear or fully reorder that override as the product allows  
  **Then** the column returns to respecting the selected sort

---

## Epic 4 — Soft-delete and recovery UI

**Need:** Confirmed soft-delete from the board and a way to restore recoverable tasks within 30 days.

**Depends on:** Story 1.4 (domain) and board UI.

### Story 4.1 — Soft-delete with confirmation

**Size:** S · **Priority:** P0  
**Blocked by:** 1.4, 2.2

As the personal user, I need to soft-delete a task only after confirmation so accidental removals are avoided.

**Acceptance criteria**

- **Given** an active task  
  **When** I choose delete  
  **Then** I am asked to confirm before the soft-delete proceeds

- **Given** I cancel the confirmation  
  **When** the dialog closes  
  **Then** the task remains on the board unchanged

- **Given** I confirm soft-delete  
  **When** the action completes  
  **Then** the task leaves the active board and is recoverable for 30 days

### Story 4.2 — Restore recoverable tasks

**Size:** M · **Priority:** P0  
**Blocked by:** 1.4, 4.1

As the personal user, I need to find and restore tasks soft-deleted within the last 30 days.

**Acceptance criteria**

- **Given** at least one recoverable task  
  **When** I open recovery  
  **Then** I can see soft-deleted tasks still within the 30-day window

- **Given** a recoverable task  
  **When** I restore it  
  **Then** it returns to its prior column and fields, and disappears from the recoverable list

- **Given** a task soft-deleted more than 30 days ago  
  **When** I view recovery  
  **Then** that task is not listed and cannot be restored

---

## Epic 5 — Stale indicators (needs actioned)

**Need:** Visual stale cues so ToDo items unactioned over 15 days and InProgress items over 3 days show they need actioned.

**Depends on:** Domain timestamps/state and card UI.

### Story 5.1 — Needs actioned indicators on cards

**Size:** S · **Priority:** P0  
**Blocked by:** 1.3, 2.2

As the personal user, I need stale indicators on cards (bottom-right, with hover warning) when a task needs actioned.

**Acceptance criteria**

- **Given** a task in ToDo whose relevant unactioned period exceeds 15 days  
  **When** I view the card  
  **Then** a stale indicator appears at the bottom-right of the card

- **Given** a task in InProgress whose time in that state exceeds 3 days  
  **When** I view the card  
  **Then** a stale indicator appears at the bottom-right of the card

- **Given** a stale indicator is shown  
  **When** I hover it  
  **Then** a warning explains that the task needs actioned

- **Given** a task in Complete, or a ToDo/InProgress task within the thresholds  
  **When** I view the card  
  **Then** no stale indicator is shown for that task

---

## Epic 6 — Board metrics

**Need:** Counts above the columns for tasks in ToDo, InProgress, and Complete.

**Depends on:** Board shell and active (non-soft-deleted) tasks.

### Story 6.1 — Column counts above the board

**Size:** S · **Priority:** P0  
**Blocked by:** 2.1

As the personal user, I need counts of tasks in each column shown above the columns.

**Acceptance criteria**

- **Given** active tasks distributed across columns  
  **When** I view the board  
  **Then** counts above the columns match the number of active tasks in ToDo, InProgress, and Complete

- **Given** I move, create, or soft-delete a task  
  **When** the board updates  
  **Then** the counts refresh to match

- **Given** the priority filter hides some tasks  
  **When** counts are shown  
  **Then** counts still reflect **all active tasks** in each column (not only the filtered-visible subset); the filter affects card visibility only

---

## Epic 7 — Calendar histogram

**Need:** A stylised monthly calendar histogram (GitHub-contributions style) with month navigation and activity / created / completed view modes.

**Depends on:** Domain activity events and timestamps (Epic 1).

### Story 7.1 — Monthly histogram with intensity stages

**Size:** M · **Priority:** P0  
**Blocked by:** 1.4, 1.3

As the personal user, I need a calendar histogram for the viewed month with five colour intensity stages (brightest = peak day in that month).

**Acceptance criteria**

- **Given** activity in the viewed month  
  **When** I view the calendar  
  **Then** each day shows an intensity among five stages scaled to the peak day of that month

- **Given** a month with no events  
  **When** I view the calendar  
  **Then** days show the lowest intensity and the month is still navigable

- **Given** the histogram  
  **When** rendered  
  **Then** it reads as a contributions-style month grid, not a plain list of numbers

### Story 7.2 — Month navigation

**Size:** S · **Priority:** P0  
**Blocked by:** 7.1

As the personal user, I need controls to move between months.

**Acceptance criteria**

- **Given** I am viewing a month  
  **When** I navigate to the previous or next month  
  **Then** the histogram updates to that month’s data and intensity scaling

- **Given** I navigate away and back  
  **When** I return to a month  
  **Then** the same day’s intensities are consistent with stored events

### Story 7.3 — Calendar view modes

**Size:** M · **Priority:** P0  
**Blocked by:** 7.1, 1.2, 1.3, 1.4

As the personal user, I need view modes for **activity**, **created**, and **completed**.

**Acceptance criteria**

- **Given** mode **activity**  
  **When** I view a day  
  **Then** the count includes create, edit details, change state, restore, and soft-delete on that day

- **Given** mode **created**  
  **When** I view a day  
  **Then** the count is tasks created that day

- **Given** mode **completed**  
  **When** I view a day  
  **Then** the count is tasks moved to Complete that day

- **Given** I switch modes  
  **When** the same month is shown  
  **Then** intensities recalculate for the selected mode’s peak day in that month

---

## Epic 8 — Theme and British English polish

**Need:** Light and dark mode, and British English-only UI copy (including colour spelling).

**Depends on:** Board UI present enough to host theme chrome; can proceed in parallel with later board features once shell exists.

### Story 8.1 — Light and dark mode

**Size:** S · **Priority:** P0  
**Blocked by:** 2.1

As the personal user, I need to switch between light mode and dark mode.

**Acceptance criteria**

- **Given** the application is running  
  **When** I toggle to dark mode  
  **Then** the board and chrome use the dark theme

- **Given** dark mode is active  
  **When** I toggle to light mode  
  **Then** the board and chrome use the light theme

- **Given** I have chosen a theme  
  **When** I refresh the page  
  **Then** the chosen light or dark mode is still applied

### Story 8.2 — British English UI copy

**Size:** S · **Priority:** P1  
**Blocked by:** 2.2, 4.1, 5.1, 8.1

As the personal user, I need all user-visible copy in British English (e.g. colour, needs actioned wording where shown).

**Acceptance criteria**

- **Given** any primary board, form, confirmation, stale warning, metrics, or calendar label  
  **When** I read the UI  
  **Then** copy uses British English spelling and the domain terms from `CONTEXT.md` where they appear

- **Given** fields referring to card colour  
  **When** labelled in the UI  
  **Then** the spelling **colour** is used, not “color”

---

## Epic 9 — Deploy and CI verification

**Need:** Static build and GitHub Actions deploy to GitHub Pages on **tasks.slydave.com**, with Font Awesome Pro token handled via secrets, matching the accepted stack ADR.

**Depends on:** Application scaffold and a buildable app; verification stories can track the deploy path once core features compile.

### Story 9.1 — Static build for GitHub Pages

**Size:** M · **Priority:** P0  
**Blocked by:** — (scaffold/ADR; blocked in practice until the Nuxt app exists)

As the stakeholder, I need a static generation build suitable for GitHub Pages hosting.

**Acceptance criteria**

- **Given** a clean install with the Font Awesome Pro token available to the package manager  
  **When** the production static build runs  
  **Then** it completes successfully and produces deployable static assets

- **Given** the static build output  
  **When** served as static files  
  **Then** the To-Do SPA loads in the browser (smoke)

### Story 9.2 — GitHub Actions build and deploy

**Size:** M · **Priority:** P0  
**Blocked by:** 9.1

As the stakeholder, I need CI to build and deploy to GitHub Pages for **tasks.slydave.com** using the repository secret for Font Awesome Pro.

**Acceptance criteria**

- **Given** a push to the configured deploy branch  
  **When** GitHub Actions runs  
  **Then** it installs dependencies using `FONTAWESOME_PACKAGE_TOKEN` from repository secrets, builds, and deploys to GitHub Pages

- **Given** a successful deploy  
  **When** I open the hosted site  
  **Then** the app loads and a task persisted in that browser profile survives refresh (hosted smoke)

- **Given** documentation and workflow config  
  **When** reviewed  
  **Then** the Font Awesome Pro token is never committed; local use remains gitignored `.env`

---

## Dependency summary (blocked-by style)

```text
1.1 Persist local storage
 ├── 1.2 Create/edit fields
 ├── 1.3 State + timestamps
 │    ├── 1.4 Soft-delete/restore domain (+ activity events)
 │    ├── 2.1 Board shell ─────────────┬── 2.2 Create/edit UI (+ tasks)
 │    │                                 ├── 2.3 Drag-and-drop
 │    │                                 ├── 3.1 Sort ◄── 1.2
 │    │                                 ├── 3.2 Priority filter ◄── 1.2
 │    │                                 ├── 3.3 Manual order ◄── 3.1, 2.3
 │    │                                 ├── 6.1 Column metrics
 │    │                                 └── 8.1 Theme
 │    ├── 5.1 Stale / needs actioned ◄── 2.2
 │    └── 7.x Calendar ◄── 1.4 (events), 7.1 → 7.2 / 7.3
 ├── 4.1 Soft-delete UI ◄── 1.4, 2.2
 │    └── 4.2 Restore UI
 └── 8.2 British English polish ◄── key UI surfaces
9.1 Static build → 9.2 Actions deploy
```

**Sequencing principle:** Domain and persistence (Epic 1) before board UI (Epic 2); board shell before DnD, sort/filter/manual order, metrics, and theme; soft-delete UI after domain soft-delete; calendar after activity/timestamp domain; deploy verification once the app builds.

**Suggested first slice for developers:** 1.1 → 1.2 + 1.3 → 2.1 → 2.2 / 2.3 in parallel with 1.4, then 3.x, 4.x, 5.1, 6.1, 7.x, 8.x, with 9.x as soon as static build is viable.

---

## Out of scope (do not file under this milestone)

- Accounts, authentication, multi-user boards  
- Backend API or cross-device sync  
- Native mobile apps  
- Email or push notifications  
- File attachments  
- Server-side soft-delete recovery  

---

## Proposal counts

| Level     | Count |
| --------- | ----- |
| Milestone | 1     |
| Epics     | 9     |
| Stories   | 20    |
| Tasks     | 4     | (only under story 2.2) |
