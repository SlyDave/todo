# Domain language

Terms below are the stakeholder’s words. Prefer them in UI copy, tickets, and code names where practical.

| Term                      | Meaning                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------- |
| To-Do SPA                 | This application: a single-page to-do board                                             |
| Column / state            | One of: ToDo, InProgress, Complete                                                      |
| ToDo                      | Column for tasks not yet started                                                        |
| InProgress                | Column for tasks being worked                                                           |
| Complete                  | Column for finished tasks                                                               |
| Column counts / metrics   | Counts above the board of all active tasks per column; priority filter hides cards only |
| Task                      | A work item on the board                                                                |
| Title                     | Optional short label on a task; maximum 50 characters                                   |
| Description               | Mandatory body; may include Markdown; maximum 5000 characters                           |
| Priority                  | Optional: low, medium (default), high; when sorting by priority, high → medium → low    |
| Due date                  | Optional date the task is due; when sorting by due date, earliest first; nulls last     |
| Background colour         | Optional card colour; picker default is **none** (no colour); no separate enable checkbox |
| None (colour)             | Default background-colour selection meaning no custom card colour                       |
| Manual order              | Per-column user-chosen rank that overrides the sort dropdown within that column         |
| Default (sort)            | Due date (earliest first, nulls last), then priority (high → medium → low), then A–Z    |
| Soft-delete / recoverable | Deleted tasks kept for 30 days and restorable                                           |
| Created                   | When the task was first created                                                         |
| Details last modified     | When title, description, priority, due date, or colour last changed                     |
| State last changed        | When the column/state last changed (separate from details)                              |
| Unactioned                | Sitting in ToDo without needed attention (stale after 15 days)                          |
| Needs actioned            | Stakeholder phrasing for stale warning (ToDo >15 days or InProgress >3 days)            |
| Activity                  | Calendar mode: create, edit details, change state, restore, soft-delete on that day     |
| Created (calendar)        | Calendar mode counting tasks created that day                                           |
| Completed (calendar)      | Calendar mode counting tasks moved to Complete that day                                 |
| Yearly activity calendar  | Compact GitHub-style contribution grid above the columns: 7 rows Mon–Sun, week columns, month headers, rolling ~52 weeks ending today (last column = current week; last cell = today) |
| Create task               | Label for the primary add affordance and the create-modal title/submit control          |
| Contrast text             | Automatic light or dark text colour chosen from card background luminance so title and body stay readable |
| Light mode / dark mode    | Theme preference                                                                        |
| Local storage             | Browser persistence; no server sync                                                     |

## Locale

British English only (e.g. colour, prioritise in prose where used).
