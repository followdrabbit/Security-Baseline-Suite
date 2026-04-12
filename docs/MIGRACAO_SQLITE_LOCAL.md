# Migracao para SQLite Local

Data: 2026-04-12

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
- Fluxo de autenticacao local ajustado para distribuicao open source:
  - login por `usuario/senha` (sem signup publico e sem OAuth)
  - bootstrap com usuario padrao `admin`
  - troca obrigatoria de senha no primeiro login
  - criacao de novos usuarios apenas pelo admin
  - novos usuarios com troca obrigatoria de senha no primeiro login
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

Cobertura validada com foco nos fluxos alterados:
- `src/test/AuthPage.test.tsx`: login local + troca obrigatoria de senha
- `src/test/Settings.test.tsx`: criacao/listagem de usuarios locais pelo admin
- Snapshot de cobertura apos os ajustes:
  - Global statements: `39.90%`
  - Global branches: `58.76%`
  - `src/pages/AuthPage.tsx`: `87.97%` statements
  - `src/pages/Settings.tsx`: `97.16%` statements
  - `src/components/mindmap/MindMapToolbar.tsx`: `100%` statements

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


## Atualizacoes posteriores

- Fluxos que dependem de IA agora validam configuracao de provedor antes de executar extracao/pipeline e exibem aviso claro quando ausente.
- Cobertura i18n foi expandida para navegacao, notificacoes, equipes, pagina de autenticacao e controles do Mind Map.
- `npm run dev:local` foi ajustado para compatibilidade com Windows (`spawn EINVAL`).
