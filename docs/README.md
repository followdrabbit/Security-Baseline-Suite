# Documentation Index

This folder stores project documentation and visual assets.

## Contents

- `MIGRACAO_SQLITE_LOCAL.md`: migration summary from Supabase to local SQLite.
- `screenshots/`: UI screenshots used by README.

## Documentation surfaces

- Repository docs: `README.md`, `llm.txt`, and files under `docs/`.
- In-app documentation page: `src/pages/Documentation.tsx`.
- In-app localized docs content: `src/i18n/translations.ts` (`docs` section for `en`, `pt`, `es`).

## Runtime reference

- Local API server: `local-api/server.mjs`
- SQLite file: `local-api/data/security-baseline.sqlite`
- Frontend local DB client: `src/integrations/localdb/client.ts`

## Local auth and password policy

- Default credentials for distributed code:
  - `admin / Admin@123456`
- First login requires password change.
- User creation is admin-only in `Settings -> Usuarios locais`.
- Password policy:
  - min 12 chars,
  - uppercase + lowercase + number + special char,
  - no spaces.

## AI prerequisite behavior

- Any flow that depends on AI must validate provider configuration first.
- If no provider is configured, the app shows a blocking warning and does not run extraction/pipeline steps.

## AI integrations updates (2026-04-12)

- `AI Integrations` now includes full CRUD for providers and models.
- Provider catalog is stored in `ai_provider_catalog`; model registry is stored in `ai_provider_models`.
- Each provider can define:
  - primary model,
  - fallback model,
  - optional advanced parameter flags (disabled by default).
- In-app documentation (`src/pages/Documentation.tsx`) was updated to describe these flows.

## QA snapshot (2026-04-12)

- Test command: `npm test` -> `165` tests passing.
- Coverage command: `npm run test:coverage`.
- Coverage summary:
  - statements: `47.67%`
  - branches: `60.47%`
