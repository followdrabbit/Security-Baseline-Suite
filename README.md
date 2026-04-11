# Aureum

Aureum is a Security Baseline Suite for generating and managing security baselines with AI support.

## Current backend model

This repository now runs in local mode:

- Database: SQLite file (`local-api/data/security-baseline.sqlite`)
- API: Local Node.js server (`local-api/server.mjs`)
- Auth: Local username/password session (no email signup, no OAuth)
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

## Default admin credentials

- Username: `admin`
- Password: `admin1234`

On first login, password change is mandatory.
After logging in as admin, go to **Settings -> Usuarios locais** to create other users with temporary passwords.
Each created user is required to change their password on first login.

## Auth lifecycle in local mode

1. Initial startup bootstraps only one account: `admin`.
2. Public sign-up and OAuth are disabled.
3. `admin` must change the default password at first login.
4. `admin` creates other local users in Settings.
5. Every created user must change password at first login.

## Tests and coverage

```bash
npm test
npm run test:coverage
```

Coverage is validated for the updated auth/user-management flows in:
- `src/test/AuthPage.test.tsx`
- `src/test/Settings.test.tsx`

Coverage snapshot (2026-04-11):
- Global statements: `38.08%`
- Global branches: `64.06%`
- `src/pages/AuthPage.tsx`: `87.24%` statements
- `src/pages/Settings.tsx`: `97.44%` statements

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
