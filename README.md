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
- Configure AI providers and models (OpenAI, Azure OpenAI, Gemini, Grok/xAI, Anthropic Claude, Ollama)
- Manage AI provider catalog and model registry with full CRUD in Settings > AI Integrations
- Use dedicated tabs in AI Integrations:
  - Provider: new/edit/delete providers
  - Model: new/edit/delete models (always associated with an existing provider)
  - Integration: select provider/model, set fallback, save credentials, and test connection
- Configure optional additional model parameters in the Model tab (disabled by default)
- Support provider-scoped and model-scoped credentials/endpoints per provider rules
- Store API keys encrypted at rest in local SQLite configuration
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
- Password: `Admin@123456`

On first login, password change is mandatory.
After logging in as admin, go to **Settings -> Usuarios locais** to create other users with temporary passwords.
Each created user is required to change their password on first login.
Password policy: at least 12 chars, with uppercase, lowercase, number, special character, and no spaces.

## Auth lifecycle in local mode

1. Initial startup bootstraps only one account: `admin`.
2. Public sign-up and OAuth are disabled.
3. `admin` must change the default password at first login.
4. `admin` creates other local users in Settings.
5. Every created user must change password at first login.


## Recent updates (2026-04-13)

- `npm run dev:local` is compatible with Windows (`spawn EINVAL` mitigation in `scripts/dev-local.mjs`).
- Actions that require AI now validate provider configuration first and show a clear warning when missing.
  - Affected flows: New Project, Source Library, AI Workspace.
- AI Integrations was reorganized into 3 UX tabs in Settings:
  - `Provider`: create, edit, and delete providers.
  - `Model`: create, edit, and delete models per provider.
  - `Integration`: select provider/model, configure fallback, and test/save integration.
- Business rules in AI Integrations were formalized:
  - a model can only be created when a provider exists,
  - OpenAI uses provider-level key (single key for all models),
  - Azure OpenAI uses model-level key and model-level endpoint (per model/deployment).
- Additional model parameters moved to model lifecycle (create/edit) and are summarized during integration selection.
- i18n coverage was expanded across key UI surfaces:
  - Auth, sidebar/layout navigation, Teams, Notifications, Settings local user management,
  - Source/Pipeline runtime messages,
  - Documentation TOC labels and Mind Map controls/legend/filter labels.
- Password policy is enforced for local users:
  - minimum 12 characters,
  - uppercase + lowercase + number + special character,
  - no spaces.

## Tests and coverage

```bash
npm test
npm run test:coverage
```

Coverage is validated for updated auth, documentation, notifications, and AI integration flows in:
- `src/test/AuthPage.test.tsx`
- `src/test/Settings.test.tsx`
- `src/test/AIIntegrations.test.tsx`
- `src/test/Documentation.test.tsx`
- `src/test/NotificationBell.test.tsx`

Coverage snapshot (2026-04-13):
- Total tests: `165` (all passing)
- Global statements: `48.36%`
- Global branches: `60.27%`
- `src/pages/AuthPage.tsx`: `87.97%` statements
- `src/pages/Settings.tsx`: `97.71%` statements
- `src/pages/AIIntegrations.tsx`: `64.04%` statements
- `src/components/mindmap/MindMapToolbar.tsx`: `100%` statements

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
