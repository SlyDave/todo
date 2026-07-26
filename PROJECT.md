# To-Do SPA

## Vision

A personal, client-only to-do board hosted as a static site at **tasks.slydave.com**. One person manages tasks across three columns with drag-and-drop, local persistence, board metrics, and a monthly activity calendar — without accounts or a backend.

## Users

- **Single personal user** on one browser profile. No roles, no sharing, no multi-device sync.

## Capabilities (first useful version = all of these)

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

### Metrics and calendar

- Above columns: counts of tasks in each column.
- Stylised calendar histogram (GitHub-contributions style) for the **viewed month**, five colour intensity stages (brightest = peak day in that month).
- Month navigation controls.
- View modes: **activity** (any interaction), **created**, **completed**.

### UI

- Light and dark mode.
- British English only in UI copy and documentation.

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

## First useful version

Ship when every capability listed above works end-to-end on the static site with local persistence — not a subset.

## How we know it works

- Manual and automated checks cover: CRUD + drag-and-drop state changes, timestamps, soft-delete/restore within 30 days, stale icons, sort/filter/manual order, metrics counts, calendar month navigation and activity/created/completed modes, Markdown description rendering, theme toggle, and a successful GitHub Pages deploy path.
- Smoke: app loads from the static build and persists a task across refresh.

## Decisions (Stage 1)

- **Calendar activity** counts: create, edit details, change state, restore, and soft-delete.
- **Manual order** is a **per-column** rank; it always overrides the selected sort within that column.
- **Column metrics** count **all active tasks** in each column; the priority filter only affects card visibility.
