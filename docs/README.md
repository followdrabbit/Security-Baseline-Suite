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

## AI integrations updates (2026-04-13)

- `AI Integrations` is organized in three tabs under Settings:
  - `Provider`: New Provider, Edit Provider, Delete Provider.
  - `Model`: New Model, Edit Model, Delete Model.
  - `Integration`: provider/model selection, fallback model, credential setup, and connection test.
- `AI Integrations` includes full CRUD for providers and models.
- Provider catalog is stored in `ai_provider_catalog`; model registry is stored in `ai_provider_models`.
- Business rules covered by UI and local API:
  - model creation depends on an existing provider (model always belongs to a provider),
  - OpenAI uses provider-level API key and no endpoint input,
  - Azure OpenAI uses model-level API key and model-level endpoint.
- Each provider can define:
  - primary model,
  - fallback model,
  - optional additional parameters configured per model (disabled by default).
- In-app documentation (`src/pages/Documentation.tsx` + `src/i18n/translations.ts`) is aligned with this flow.

## QA snapshot (2026-04-13)

- Test command: `npm test` -> `165` tests passing.
- Coverage command: `npm run test:coverage`.
- Coverage summary:
  - statements: `48.36%`
  - branches: `60.27%`
