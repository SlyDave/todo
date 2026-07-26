# To-Do

Personal, client-only to-do board with three columns (**ToDo**, **InProgress**, **Complete**), drag-and-drop, local persistence, board metrics, and a monthly activity calendar.

Hosted at [tasks.slydave.com](https://tasks.slydave.com).

## Stack

- Nuxt 4 + Nuxt UI (static GitHub Pages build)
- TypeScript, ESLint, Prettier
- Font Awesome Pro (deep-imported icons)
- Browser `localStorage` (no backend)

## Local development

Prerequisites: Node 22+, npm 12+, and a Font Awesome Pro package token.

```powershell
Copy-Item .env.example .env
# Set FONTAWESOME_PACKAGE_TOKEN in .env

npm install
npm run dev
```

Useful scripts:

| Script                                                           | Purpose                               |
| ---------------------------------------------------------------- | ------------------------------------- |
| `npm run dev`                                                    | Local development server              |
| `npm run build`                                                  | Static generate for GitHub Pages      |
| `npm run lint` / `format:check` / `typecheck` / `test` / `audit` | Quality gate                          |
| `npm run smoke`                                                  | Smoke-check static output after build |

## CI/CD

GitHub Actions builds and deploys on `main` using **npm 12** and the repository secret `FONTAWESOME_PACKAGE_TOKEN` (required for Pro package installs). Do not commit tokens; local use stays in gitignored `.env`.

## AI team workflow

This repository uses an orchestrated AI development team. See `AGENTS.md` and `docs/sdlc/README.md`. Day-to-day: `/standup` to start a session.
