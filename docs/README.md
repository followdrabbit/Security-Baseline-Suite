# Documentation Index

This folder stores project documentation and visual assets.

## Contents

- `MIGRACAO_SQLITE_LOCAL.md`: migration summary from Supabase to local SQLite.
- `screenshots/`: UI screenshots used by README.

## Runtime reference

- Local API server: `local-api/server.mjs`
- SQLite file: `local-api/data/security-baseline.sqlite`
- Frontend local DB client: `src/integrations/localdb/client.ts`
- Local auth defaults:
  - `admin / admin1234`
  - password change required on first login
  - user creation done by admin in `Settings -> Usuarios locais`
