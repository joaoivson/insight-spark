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

1. Hidrata da cache do localStorage (`{recurso}-cache:{userId}`) — tela
   aparece na hora
2. **Dispara revalidação em background**, com guarda contra chamadas
   concorrentes
3. Substitui e regrava a cache

Sem o passo 2, celular e PC do mesmo usuário mostram números diferentes — foi
exatamente o bug que motivou o padrão.

**Chave de cache sempre escopada por usuário** (`getScopedKey`). Cache global
de dado de usuário é vazamento entre contas com outra roupa. Ao trocar de
usuário, o store compara `loadedUserId` e descarta o que estava em memória.

## Período e datas

Filtro de período usa os helpers de `@/shared/lib/date.ts`. Os atalhos
(`presetRangeKeys`) cortam no **fim do dia anterior em Brasília** — não
recalcule com `new Date()` na mão: entre 21h e 0h BRT o dia UTC já virou e a
tela mostra um período diferente do que a usuária pediu.

## Erro

Service devolve erro tratável; a tela decide o que mostrar. Nunca vaze
mensagem técnica do backend direto para a UI, e nunca engula o erro deixando
loading eterno — estado de erro é obrigatório.
