# To-Do SPA

## Vision

A personal, client-only to-do board hosted as a static site at **tasks.slydave.com**. One person manages tasks across three columns with drag-and-drop, local persistence, board metrics, and a yearly activity calendar — without accounts or a backend.

## Users

- **Single personal user** on one browser profile. No roles, no sharing, no multi-device sync.

## Capabilities (version 1 — shipped as `v1.0.0`)

### Board

- Three columns / states: **ToDo**, **InProgress**, **Complete**.
- Drag and drop tasks between columns; dropping updates state and records **state-changed** time separately from detail edits.
- Sort modes via dropdown:
  - **Default** — due date, then priority, then alphabetically (by title; empty titles sort consistently).
  - **Alphabetically** — title, then due date, then priority.
  - **Due Date** — due date, then priority, then alphabetically.
  - **Priority** — priority, then due date, then alphabetically.
- Manual order override always wins over the selected sort until cleared/reordered.
- Multi-select **Priority** filter (low / medium / high), defaulting to all visible.

### Task fields

| Field             | Required | Notes                                                                                          |
| ----------------- | -------- | ---------------------------------------------------------------------------------------------- |
| Description       | Yes      | Supports **Markdown** for styled text                                                          |
| Title             | No       |                                                                                                |
| Priority          | No       | Low / Medium (default) / High. Icons: chevron down (low), flat bar (medium), chevron up (high) |
| Due date          | No       |                                                                                                |
| Background colour | No       |                                                                                                |

### Lifecycle and timestamps

- Soft-delete with confirmation; recoverable for **30 days**.
- Record **created**, **details last modified**, and **state last changed** (separate).
- Stale indicators (bottom-right of card, hover warning):
  - **ToDo** unactioned **> 15 days**
  - **InProgress** **> 3 days**

### Metrics and calendar (as shipped in v1)

- Above columns: counts of tasks in each column.
- Stylised calendar histogram (GitHub-contributions style) for the **viewed month**, five colour intensity stages (brightest = peak day in that month).
- Month navigation controls.
- View modes: **activity** (any interaction), **created**, **completed**.

### UI

- Light and dark mode.
- British English only in UI copy and documentation.

## Version 2 — Polish and quality of life

Milestone for layout, form, and visual polish. Still client-only; no non-goal changes. Stakeholder decisions (2026-07-27):

### Board layout

- Columns grow with their tasks (no fixed height that clips new cards); the page scrolls if needed.
- Activity calendar sits **above** the columns.
- Yearly contribution-style histogram: **seven rows** (Monday → Sunday), **columns = weeks**, month labels on columns, **rolling ~52 weeks ending today** (last column = current week; last cell = today). Compact height ≈ an empty column.
- Keep calendar view modes: **activity**, **created**, **completed**.

### Controls and chrome

- Dropdown option menus show full option text (not clipped to the trigger width).
- Priority icons use theme colours: **high** = theme red, **medium** = theme green, **low** = theme blue.
- Edit and soft-delete (delete) actions are **icons** with text tooltips (not text buttons).
- Primary add affordance label: **Create task** (matches the modal title).

### Create / edit modal

- Description field spans the full modal content width.
- Background colour: always show the colour picker; default selection is **none** (no separate “use background colour” checkbox). Colour picker layout wide enough that the colour preview is visible.
- Remove “Optional” and “Required” helper labels (required is indicated by the red asterisk on description only).
- **Create task** submit control is disabled until all mandatory fields are present (description).
- Title max length **50** characters; description max length **5000** characters.

### Card readability

- When a custom background colour is set, task title and body text use an automatic readable contrast colour derived from that background (luminance-based light/dark text).

## Non-goals

- No accounts, authentication, or multi-user boards.
- No backend, API, or cross-device sync (localStorage only).
- No native mobile apps.
- No email or push notifications.
- No file attachments.
- Soft-delete recovery remains local only.
- Do not reference other private projects in documentation or tickets.

## Constraints

- **Stack direction (stakeholder-fixed):** Nuxt (Vue), Nuxt UI, Font Awesome Pro icons, TypeScript, ESLint and Prettier at the strictest practical settings. Prefer latest stable toolchain; ask before upgrading if local tooling is behind.
- **Architecture:** Pre-rendered, client-side SPA; static hosting.
- **Host:** GitHub Pages on custom domain **tasks.slydave.com**.
- **CI/CD:** GitHub Actions for build and deploy.
- **Font Awesome Pro:** package token in gitignored `.env` for local development; repository secret for CI/CD. Never commit the token. Deep-import icons only (not whole packs). Pro (not Pro+).
- **Locale:** British English only.
- **Scale:** Personal use; dozens to low hundreds of tasks; edit-heavy on one device.

## Version milestones

- **v1.0.0 (First useful version)** — shipped and tagged: every v1 capability above works end-to-end on the static site with local persistence.
- **Version 2 (Polish and QoL)** — ship when every Version 2 item above is met end-to-end (including yearly calendar replacing the v1 monthly histogram UX).

## How we know it works

- Manual and automated checks cover: CRUD + drag-and-drop state changes, timestamps, soft-delete/restore within 30 days, stale icons, sort/filter/manual order, metrics counts, calendar (yearly contribution grid + activity/created/completed modes), Markdown description rendering, theme toggle, form length/contrast/polish rules from Version 2, and a successful GitHub Pages deploy path.
- Smoke: app loads from the static build and persists a task across refresh.

## Decisions (Stage 1 + Version 2)

- **Calendar activity** counts: create, edit details, change state, restore, and soft-delete.
- **Manual order** is a **per-column** rank; it always overrides the selected sort within that column.
- **Column metrics** count **all active tasks** in each column; the priority filter only affects card visibility.
- **Version 2 calendar** is a rolling yearly GitHub-style grid (Mon–Sun rows, week columns, ends today); modes remain activity / created / completed.
- **Version 2 contrast** on custom card colours is automatic from background luminance.
