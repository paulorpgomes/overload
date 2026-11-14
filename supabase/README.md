# Refeições por foto no Supabase

Este projeto já tinha um banco remoto antes de receber migrações no repositório. O [snapshot consultado em 14/10/2026](../docs/supabase-schema-snapshot-2026-10-14.json) documenta esse estado. As migrações desta pasta são **incrementais** e devem ser aplicadas em ordem ao banco existente; o snapshot não é uma migração inicial.

No projeto Supabase conectado ao app, `20261014000000_photo_meals.sql` e `20261014000001_taco_food_catalog.sql` foram aplicados pelo SQL Editor em 15/10/2026. A consulta de duplicatas retornou zero linhas antes da primeira migração; após a segunda, o usuário confirmou que `select count(*) from public.food_catalog` retornou 578. Não reaplique essas migrações nesse banco. Como foram executadas pelo SQL Editor, não foram registradas automaticamente no histórico da CLI de migrações.

Antes de aplicar `20261014000000_photo_meals.sql`, confira se não surgiram refeições duplicadas:

```sql
select user_id, eaten_on, meal_type, count(*)
from public.meals
group by user_id, eaten_on, meal_type
having count(*) > 1;
```

A consulta precisa retornar zero linhas para que a nova restrição única seja criada. Depois, aplique `20261014000001_taco_food_catalog.sql`. Este segundo arquivo insere 578 alimentos a partir da planilha [TACO 4ª edição, NEPA/Unicamp](https://nepa.unicamp.br/tabela-brasileira-de-composicao-de-alimentos-4a-edicao/), com valores por 100 g de parte comestível. O gerador reproduzível está em [`scripts/generate_taco_seed.py`](../scripts/generate_taco_seed.py). A planilha original não é copiada para o repositório.

Configure `ANTHROPIC_API_KEY` somente no servidor. `ANTHROPIC_MEAL_IMAGE_MODEL` é opcional; o padrão está em `apps/web/lib/ai/extract-meal-photo.ts`. O app envia a imagem temporariamente para análise e não a salva no Supabase.

## Fotos e comentários no feed

`20261015000000_social_photos_comments.sql` foi aplicado pelo usuário no SQL Editor em 15/10/2026. A API remota confirmou a tabela `post_comments`, a coluna `posts.image_path`, os relacionamentos usados pelo feed e o bucket `post-images`. A migração não foi registrada no histórico da CLI. Não a reaplique nesse banco. Ela permite publicações sem legenda quando há uma foto e adiciona comentários. As imagens são visíveis somente para usuários autenticados, como o feed.

O app reduz cada foto no navegador, envia JPEG de até 2 MB e remove o arquivo quando a publicação é excluída. Se o banco rejeitar a publicação após o envio, a ação tenta remover o arquivo. A remoção após excluir um post também é feita pela aplicação; falhas no Storage devem ser verificadas nos logs do servidor para limpar eventuais arquivos órfãos.

Antes da publicação, confirme as condições de uso da TACO e avalie o reconhecimento e as porções com fotos de refeições reais cujas quantidades sejam conhecidas.
