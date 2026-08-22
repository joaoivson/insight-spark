# Contexto — MarketDash Frontend

> **Estado atual do repositório.** Sobrescreva as seções ao mudarem — o
> histórico vive em `DIARIO.md`. Última atualização: **2026-08-21**.
>
> Esta primeira versão foi montada por inspeção do código, do `CHANGELOG.md`
> da raiz e do `git log` de `develop`. Onde ela divergir do código, **o
> código vence** — e quem notar corrige a seção aqui.

## Stack (autoritativa — doc que divergir perde)

React 18 · **Vite** (não Next) · TypeScript · **Zustand** (estado global) ·
React Query (`hooks/queries/`) · **shadcn/ui** + Tailwind · React Router ·
Recharts · Supabase Auth SDK · Playwright (dev dep).

- Dev server na **8080**; proxy `/api` → **`http://localhost:8000`**
  (o `CLAUDE.md` diz 8081 e está desatualizado — o compose do backend expõe
  a 8000).
- Tema **dark por padrão**.
- Alias `@/` para `src/`; `@feature-flags` para o `feature-flags.json` da raiz
  do monorepo — o **mesmo arquivo** que o backend lê.

## Forma do código

```
Components → Zustand stores → services/*.service.ts → core/config/api.config.ts
```

Componente **nunca** chama API direto.

- `src/features/` — `auth`, `dashboard`, `admin`, `landing` (+ `sales`),
  `subscription`
- `src/stores/` — 9 stores (dataset, adSpends, clicks, campaigns, plan,
  adminPanel, facebookConnection, instagramConnection, taxSettings)
- `src/services/` — 22 services
- `src/hooks/queries/` — `useAdSpends`, `useClicks`, `useDatasetRows`
- `src/components/ui/` — shadcn, **não modificar**; estender via wrapper
- `src/components/shared/` — `DataCard`, `ResponsiveModal`,
  `FeedbackFloatingButton`
- `src/shared/lib/` — `date.ts` (helpers `*BR`), `kpi.ts`, `plans.ts`,
  `tax.ts`, `chart-utils.ts`, `storage.ts`, `supabase.ts`

## `fetchWithAuth` — o que ele injeta em TODA request

`src/core/config/api.config.ts`:

1. `Authorization: Bearer <token>` (limpo de aspas e de "Bearer" duplicado)
2. Header `X-User-Id: user_N`
3. **Query param `?user_id=user_N`** — por compatibilidade

⚠️ Por causa do item 3, **endpoint novo do backend não pode usar `user_id`
como nome de query param** — receberia esse valor, no formato errado, em
silêncio.

Também trata: **401 → tenta renovar a sessão do Supabase uma vez e repete a
request** antes de deslogar (evita tela montando pela metade com requests
paralelas); **403 de assinatura** → modal/checkout conforme a rota.

## Ambiente por hostname (runtime, não só build)

`API_BY_HOST` mapeia `marketdash.com.br` → `api.marketdash.com.br` e
`hml.marketdash.com.br` → `api.hml.marketdash.com.br`, mesmo se o
`VITE_API_URL` do build estiver errado.

`isProductionHost()` compara o host por **igualdade exata** — `.includes()`
classificaria `hml.marketdash.com.br` como produção, porque contém
`marketdash.com.br` como substring. É essa função que **esconde a aba
WhatsApp em produção**.

## Gating por plano

`planStore` + `RequirePlan` (`src/app/routes/RequirePlan.tsx`): menu não
liberado redireciona para `/dashboard/planos`. O catálogo espelha
`marketdash-backend/app/core/plans.py` em `src/shared/lib/plans.ts` —
**limite `-1` significa ilimitado** (MAX), e o frontend precisa tratar isso
ou mostra "-1" na tela.

## Cache local

`dataset-cache:{userId}` e `adspends-cache:{userId}` em localStorage, com
**stale-while-revalidate** nos stores. Sem a revalidação, celular e PC
mostravam números diferentes.

## Rodar e verificar

```bash
npm run dev          # :8080, proxy /api → :8000
npm run lint
npx tsc --noEmit
npm run build
```

Não há suíte de teste automatizada. **A verificação é visual, via Playwright**
— ver `/validar-tela`.

## Em voo / pendente

- Badge de desconto do plano Pro na página de vendas.
- Botão "Atualizar" do header é **dead code** desde a migração para SWR.
- **Automação Instagram** (telas): Rodadas 1 e 2 no ar em homologação. Editor
  com Card 1 em fileira de 4 + modal com busca, Card 3 com um campo por
  variação, Card 4 em três campos (Mensagem / Link / Texto do botão) e seletor
  de emoji nos Cards 3 e 4. Falta o **App Review** — sem ele, aluna comum nem
  completa o OAuth.
- Branch de trabalho: **`develop`**. Produção sai de `main`.
