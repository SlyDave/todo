# Domain language

Terms below are the stakeholder’s words. Prefer them in UI copy, tickets, and code names where practical.

| Term                      | Meaning                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------- |
| To-Do SPA                 | This application: a single-page to-do board                                         |
| Column / state            | One of: ToDo, InProgress, Complete                                                  |
| ToDo                      | Column for tasks not yet started                                                    |
| InProgress                | Column for tasks being worked                                                       |
| Complete                  | Column for finished tasks                                                           |
| Task                      | A work item on the board                                                            |
| Title                     | Optional short label on a task                                                      |
| Description               | Mandatory body; may include Markdown                                                |
| Priority                  | Optional: low, medium (default), high                                               |
| Due date                  | Optional date the task is due                                                       |
| Background colour         | Optional card colour                                                                |
| Manual order              | User-chosen order that overrides the sort dropdown                                  |
| Default (sort)            | Due date, then priority, then alphabetically                                        |
| Soft-delete / recoverable | Deleted tasks kept for 30 days and restorable                                       |
| Created                   | When the task was first created                                                     |
| Details last modified     | When title, description, priority, due date, or colour last changed                 |
| State last changed        | When the column/state last changed (separate from details)                          |
| Unactioned                | Sitting in ToDo without needed attention (stale after 15 days)                      |
| Needs actioned            | Stakeholder phrasing for stale warning (ToDo >15 days or InProgress >3 days)        |
| Activity                  | Calendar mode: create, edit details, change state, restore, soft-delete on that day |
| Manual order              | Per-column rank that overrides the sort dropdown within that column                 |
| Created (calendar)        | Calendar mode counting tasks created that day                                       |
| Completed (calendar)      | Calendar mode counting tasks moved to Complete that day                             |
| Light mode / dark mode    | Theme preference                                                                    |
| Local storage             | Browser persistence; no server sync                                                 |

## Locale

British English only (e.g. colour, prioritise in prose where used).
