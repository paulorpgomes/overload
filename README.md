# Overload

Aplicação web para registrar treinos e refeições, acompanhar metas e compartilhar publicações. O registro de refeições por foto usa um modelo multimodal para sugerir alimentos e porções. A pessoa revisa as sugestões antes de salvar; os valores nutricionais vêm do catálogo TACO ou do preenchimento manual.

## Organização

- `apps/web`: aplicação Next.js, interface e rotas de servidor.
- `packages/ui`: componentes de interface compartilhados.
- `packages/eslint-config` e `packages/typescript-config`: configurações do workspace.
- `supabase/migrations`: migrações incrementais do banco de dados.
- `docs/supabase-schema-snapshot-2026-10-14.json`: estrutura do banco anterior às migrações deste repositório.

## Executar localmente

Requer Node.js 20 ou superior, pnpm 10.33.4 e um projeto Supabase configurado com o esquema usado pela aplicação.

```bash
pnpm install
cp apps/web/.env.example apps/web/.env
pnpm dev
```

Preencha `apps/web/.env` com a URL e a chave pública do seu projeto Supabase. A chave `ANTHROPIC_API_KEY` habilita a análise de refeições por foto e a extração de treinos por texto; configure-a apenas no servidor. O arquivo `.env` é ignorado pelo Git.

As migrações em `supabase/migrations` foram criadas para um banco que já existia. Elas **não** montam um projeto Supabase vazio por conta própria. Consulte [as instruções do banco](supabase/README.md) e o snapshot do esquema anterior antes de aplicá-las. Não reaplique essas migrações ao banco de produção se elas já foram executadas pelo SQL Editor.

## Código e dados

Este repositório contém o código da aplicação e a documentação técnica necessária para entendê-lo. As fotos de testes, o texto do TCC, credenciais e o histórico do monorepo de desenvolvimento não fazem parte desta cópia pública.
