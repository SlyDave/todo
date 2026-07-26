# Interface contract

This project is a **client-only Nuxt SPA** with localStorage persistence and no
HTTP API. There is no OpenAPI, GraphQL, or Protobuf boundary between developers.

Ownership is by path inside the single application (see
`.sdlc/state.json` and `docs/adr/2026-07-26-stack-selection.md`). Domain and
persistence live under backend-owned globs; UI under frontend-owned globs.

If a future ADR introduces a real network API, replace this file with that
contract artefact and restore the shared-zone change process described in the
template documentation.
