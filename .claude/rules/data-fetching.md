---
description: Regras de data fetching, stores e integracao com a API no frontend MarketDash
globs: "src/**/*.{ts,tsx}"
---

# Data Fetching

## O caminho, sem atalho

```
Component → Zustand store → services/*.service.ts → fetchWithAuth (api.config.ts)
```

- **Componente nunca chama `fetch` direto.** Nem `axios`, nem `fetch` nativo.
- **Service nunca monta header de auth** — `fetchWithAuth` já faz.
- Estado de servidor com cara de query (lista paginada, detalhe) pode usar
  React Query em `hooks/queries/`; estado global compartilhado entre telas
  fica no store.

O motivo é concreto: o dia em que mudar auth, retry de 401 ou o header
`X-User-Id` é **um arquivo**, não trinta.

## O que `fetchWithAuth` já faz por você

1. `Authorization: Bearer <token>` (limpo de aspas e de "Bearer" duplicado)
2. Header `X-User-Id: user_N`
3. **Query param `?user_id=user_N`** (compatibilidade)
4. **401 → renova a sessão do Supabase uma vez e repete a request** antes de
   deslogar
5. **403 de assinatura** → modal ou checkout, conforme a rota

Não replique nada disso no service.

⚠️ Por causa do item 3: **endpoint novo do backend não pode usar `user_id`
como nome de query param** — o valor injetado sobrescreve o seu, em silêncio.

## Stores: stale-while-revalidate, não cache cego

O padrão canônico é o do `adSpendsStore`, replicado em `datasetStore` e
`clicksStore`:

1. Hidrata da cache do localStorage (`{recurso}-cache:{periodo}:{userId}`) —
   tela aparece na hora
2. **Dispara revalidação em background**, com guarda contra chamadas
   concorrentes
3. Substitui e regrava a cache

Sem o passo 2, celular e PC do mesmo usuário mostram números diferentes — foi
exatamente o bug que motivou o padrão.

**Chave de cache sempre escopada por usuário** (`getScopedKey`). Cache global
de dado de usuário é vazamento entre contas com outra roupa. Ao trocar de
usuário, o store compara `loadedUserId` e descarta o que estava em memória.

**E escopada por PERÍODO** (`dataset-cache:2026-08-28_2026-09-03:user_9`,
desde 04/09/2026). Uma chave só por usuário devolvia a fatia de "7 dias" para
quem tinha pedido "mês atual" — a tela mostrava um período afirmando outro até
a revalidação terminar. O store também guarda `loadedRangeKey` e trata período
diferente como cache frio.

**Teto para gravar: 8.000 linhas.** O localStorage tem 5–10 MB **por origem**,
divididos entre todos os caches. `setItem` de um JSON de 30 MB (67 mil linhas
de vendas) lança `QuotaExceededError`, o `catch` engole, e o cache nunca
persiste **justamente na conta grande** — toda carga vira carga fria, sem
sinal nenhum. Acima do teto o store nem tenta: o `JSON.stringify` desse
tamanho trava a thread antes mesmo de falhar.

## Peça à API o que a tela mostra

Baixar a base inteira e filtrar no cliente é o erro caro deste projeto: o
dashboard puxava **67.631 linhas (~30 MB)** para exibir as **3.882** dos
últimos 7 dias — 2.018 ms de banco contra **14 ms** com o filtro de data (o
índice `(user_id, date)` sempre existiu). O filtro do cliente continua fazendo
o corte fino; ele opera sobre o que a API já recortou, não sobre o histórico.

Consequência para quem mexe em filtro: **mudar o período tem que rebuscar** —
inclusive "Limpar filtros", que significa histórico inteiro. Sem isso a tela
diz "sem filtro" exibindo a fatia antiga.

## Período e datas

Filtro de período usa os helpers de `@/shared/lib/date.ts`. Os atalhos
(`presetRangeKeys`) cortam no **fim do dia anterior em Brasília** — não
recalcule com `new Date()` na mão: entre 21h e 0h BRT o dia UTC já virou e a
tela mostra um período diferente do que a usuária pediu.

## Erro

Service devolve erro tratável; a tela decide o que mostrar. Nunca vaze
mensagem técnica do backend direto para a UI, e nunca engula o erro deixando
loading eterno — estado de erro é obrigatório.
