---
status: accepted
date: 2026-07-26
deciders: orchestrator
issue: 0
---

# Adopt Nuxt 4 static SPA with Nuxt UI and localStorage

## Context

The stakeholder wants a personal To-Do SPA: pre-rendered, client-only, persisted in localStorage, hosted on GitHub Pages at tasks.slydave.com. They fixed Vue/Nuxt, Nuxt UI, Font Awesome Pro, TypeScript, and strict ESLint/Prettier. There is no backend or multi-user sync. The team template expects an ownership boundary between backend and frontend developers.

## Decision

Use a **single Nuxt 4 application** (official `ui` starter where possible), **static generation** for GitHub Pages, **Nuxt UI** for chrome and theming (light/dark), **Font Awesome Pro** (deep-imported icons) for priority and stale indicators, and **browser localStorage** for persistence. Treat architecture as a **monolith** for ownership: backend owns domain and persistence logic; frontend owns presentation. No separate API and no `docs/contracts/` interface beyond the existing skeleton note that none is required.

Toolchain targets the latest stable published packages at scaffold time (Nuxt 4.x, Nuxt UI 4.x, TypeScript 5.x with `strict` and `noUncheckedIndexedAccess`, ESLint and Prettier at the strictest practical configs). CI/CD via GitHub Actions; `FONTAWESOME_PACKAGE_TOKEN` from `.env` locally and a repository secret in Actions.

## Alternatives considered

- **Separate API + SPA (decoupled)** — Rejected: no server, no sync, no auth; an API would invent a backend the product forbids.
- **Plain Vue + Vite without Nuxt** — Rejected: stakeholder fixed Nuxt; loses Nuxt UI integration and static hosting conventions they already use elsewhere.
- **React / Next.js** — Rejected: stakeholder fixed Vue/Nuxt.
- **IndexedDB instead of localStorage** — Rejected for v1: scale is dozens to low hundreds of tasks; localStorage is enough and simpler. Revisit only if size limits bite.

## Consequences

- Easy static deploy and offline-after-load behaviour; hard to add true multi-device sync later without a new persistence ADR.
- Backend/frontend split is by path inside one app, not by deployable; shared manifests remain orchestrator-owned.
- Font Awesome Pro token must be present for `npm ci` locally and in CI or installs fail.
- Markdown in descriptions requires a sanitised renderer (XSS risk on card HTML) even though data is local.
