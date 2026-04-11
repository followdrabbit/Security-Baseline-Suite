# Migracao para SQLite Local

Data: 2026-04-11

## Objetivo

Migrar a aplicacao para operar localmente com SQLite e remover dependencias de Supabase no runtime do projeto.

## Alteracoes realizadas

- Introduzida camada local em `src/integrations/localdb/`:
  - `client.ts` para consultas, auth local e chamadas de funcoes.
  - `types.ts` para tipagem do schema.
- API local consolidada em `local-api/server.mjs`:
  - endpoints de autenticacao local
  - endpoint generico de query (`/api/db/query`)
  - handlers de funcoes (`/functions/v1/*`)
- Remocao de componentes Supabase do codigo fonte.
- Remocao da dependencia `@supabase/supabase-js` do `package.json`.
- Ajuste dos testes para usar `localDb` nos mocks e importacoes.

## Validacao

Comandos executados apos a migracao:

```bash
npm test
npm run test:coverage
```

Resultado: testes passando e cobertura gerada com sucesso.

## Execucao local

```bash
npm run dev:local
```

Ou em terminais separados:

```bash
npm run db:local
npm run dev
```

## Observacoes para manutencao

- Nao reintroduzir variaveis `VITE_SUPABASE_*`.
- Nao reintroduzir imports de `@supabase/supabase-js`.
- Preferir a camada `localDb` para acesso a dados no frontend.
