# Aureum Baseline Studio

Aureum Baseline Studio is a platform for generating and managing security baselines with AI support.

## Current backend model

This repository now runs in local mode:

- Database: SQLite file (`local-api/data/security-baseline.sqlite`)
- API: Local Node.js server (`local-api/server.mjs`)
- Auth: Local email/password session
- Functions: Local HTTP handlers under `/functions/v1/*`

Supabase was removed from the application code and tests.

## Main capabilities

- Create and manage baseline projects
- Import sources from files and URLs
- Generate controls with local AI function flow
- Review controls in Baseline Editor and Mind Map
- Map controls to frameworks in Traceability
- Export data and manage baseline versions

## Requirements

- Node.js 22+
- npm 10+

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Run app and local API together:

```bash
npm run dev:local
```

Alternative (separate terminals):

```bash
npm run db:local
npm run dev
```

Default local API URL: `http://127.0.0.1:8787`

## Test credentials

- Email: `test@aureum.com`
- Password: `test1234`

## Tests and coverage

```bash
npm test
npm run test:coverage
```

## Tech stack

- React 18 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- TanStack Query
- Vitest + Testing Library
- SQLite (`node:sqlite`)

## Project structure

```text
src/
  components/
  contexts/
  hooks/
  pages/
  services/
  integrations/
    localdb/

local-api/
  server.mjs
  data/

scripts/
  dev-local.mjs

docs/
  README.md
  MIGRACAO_SQLITE_LOCAL.md
  screenshots/
```

## Migration status

As of 2026-04-11, the project is configured for local SQLite operation and no longer depends on Supabase runtime components.
