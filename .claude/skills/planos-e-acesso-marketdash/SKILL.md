---
name: "planos-e-acesso-marketdash"
description: "Planos, limites, gating de menu, assinatura e o que fica oculto em produção no frontend do MarketDash. Use ao mexer em planStore/RequirePlan, ao adicionar menu ou limite, e ao investigar 'sumiu o menu', 'apareceu -1 na tela' ou 'tomei 403'."
---

# Planos e acesso — Frontend

## As três portas — não são a mesma

| Porta | Onde | Pergunta |
|---|---|---|
| **Sessão** | Supabase Auth + `fetchWithAuth` (401) | "está logado?" |
| **Assinatura** | 403 tratado no `fetchWithAuth` + `ProtectedRoute` | "tem acesso ao produto?" |
| **Plano** | `planStore` + `RequirePlan` | "esse plano libera esse menu?" |

Falha em cada uma leva a um lugar diferente: login, checkout/modal,
`/dashboard/planos`. Trocar uma pela outra manda a usuária para a tela errada.

## Gating de menu

`RequirePlan` (`src/app/routes/RequirePlan.tsx`) carrega o plano
(`planStore.fetch()`), mostra loader enquanto carrega e redireciona para
`/dashboard/planos` se `allowsMenu(menuKey)` for falso.

**Esconder o item do menu não basta** — link direto e histórico do navegador
continuam funcionando. A rota precisa estar envolvida em `RequirePlan`.

## O catálogo — espelho manual, e o espelho quebra

`src/shared/lib/plans.ts` espelha `marketdash-backend/app/core/plans.py`.
Plano, menu ou limite novo entra **nos dois, no mesmo commit**. Se divergir, a
usuária vê o menu e toma 403 — ou não vê um menu que pagou.

| Plano | Menus | Páginas / Links / Créditos IA |
|---|---|---|
| `essencial` | dashboard, campanhas, upload de cliques, indique, configurações, planos | 0 / 0 / 0 |
| `pro` | + captura, meus links, diagnóstico IA | 15 / 30 / 200 |
| `max` | + **automações (Instagram)** | **-1 / -1** / 1000 |

`max` está **fora da página de vendas**: entra só por link direto da Kiwify.

## As duas sentinelas

- **`-1` = ilimitado.** Renderizar cru mostra "-1" na tela. Trate antes de
  exibir.
- **`0` = o plano não tem o recurso.** Mostre **"—"**, não "0/0" — "0/0" não
  distingue "não usa" (adoção, no Pro) de "não tem" (limitação, no
  Essencial). Decida com `planLimit(plan, recurso) === 0`.

## Assinatura cancelada continua com acesso

O cancelamento na Kiwify mantém o acesso até a data já paga. A tela **não**
deve tratar "cancelada" como "sem acesso" — quem responde isso é o backend
(`subscription_has_access()`), e o frontend reage ao **403**, não ao status
que ele acha que entendeu.

## Oculto em produção

`isProductionHost()` esconde **Diagnóstico IA** e a aba **WhatsApp** em
produção; em homologação eles aparecem, para validação.

A comparação é por **igualdade exata** do hostname. **Nunca troque por
`.includes()`**: `hml.marketdash.com.br` contém `marketdash.com.br` como
substring, e homologação passaria a esconder exatamente as features que só
existem para serem testadas lá.

## Feature flags

`feature-flags.json` fica na **raiz do monorepo**, lido pelos dois repos
(alias `@feature-flags` aqui, `app/core/feature_flags.py` no backend). Flag
nova entra lá — nunca em constante duplicada por repo.

## Depurar "sumiu o menu"

1. `planStore` carregou? (`loaded` / `loading`)
2. O `menuKey` da rota bate com a chave do catálogo?
3. O catálogo daqui bate com o do backend? (o espelho é manual)
4. É `RequirePlan` ou é 403 de assinatura? São redirecionos diferentes.
5. É `isProductionHost()` escondendo por ambiente?
