---
description: Gating por plano, menus liberados, limites e o que fica oculto em producao
globs: "src/{app,stores,features,shared}/**/*.{ts,tsx}"
---

# Planos, menus e o que aparece para quem

## Duas portas diferentes — não confunda

| Porta | Onde | Pergunta que responde |
|---|---|---|
| **Assinatura** | `fetchWithAuth` (403) + `ProtectedRoute` | "essa conta tem acesso ao produto?" |
| **Plano** | `planStore` + `RequirePlan` | "esse plano libera esse menu?" |

Menu não liberado → redireciona para `/dashboard/planos`. Nunca esconda o
menu sem rota protegida: link direto e histórico do navegador continuam
funcionando.

## O catálogo é espelhado — e o espelho é manual

`src/shared/lib/plans.ts` espelha `marketdash-backend/app/core/plans.py`.
Plano ou limite novo entra **nos dois, no mesmo commit** — senão o gating
diverge e a usuária vê o menu e toma 403.

| Plano | Menus | Páginas / Links |
|---|---|---|
| `essencial` | dashboard, campanhas, upload de cliques, indique, configurações, planos | 0 / 0 |
| `pro` | + captura, meus links | 15 / 30 |
| `max` | + **automações (Instagram)** | **-1 / -1** |

**`-1` significa ilimitado.** Renderizar o valor cru mostra "-1" na tela —
trate a sentinela antes de exibir.

E há a assimetria que já confundiu na tela: **`0` = "o plano não tem esse
recurso"**, não "tem e não usou". No Essencial, Links e Páginas mostram
**"—"**, não "0/0" — "0/0" não distingue problema de adoção (Pro que não
usa) de limitação de plano (Essencial que não tem).

`max` foi **lançado em 02/09/2026**: aparece na landing (`SalesPrecos.tsx`) e
em `/dashboard/planos` (`PLAN_ORDER`), com card dourado (`#F0A94A`) e badge
"Novo". A copy do Max **não promete o módulo de grupos de WhatsApp** enquanto
ele não estiver em produção — vende Instagram + ilimitados.

## Oculto em produção

`isProductionHost()` (`core/config/api.config.ts`) esconde a **aba WhatsApp**
em produção — fica disponível em homologação para validação.

A comparação é por **igualdade exata** do hostname. **Nunca troque por
`.includes()`**: `hml.marketdash.com.br` contém `marketdash.com.br` como
substring, e homologação passaria a se comportar como produção — escondendo
justamente as features que só existem para serem testadas lá.

## Feature flags

`feature-flags.json` fica na **raiz do monorepo** e é lido pelos dois lados
(alias `@feature-flags` aqui; `app/core/feature_flags.py` no backend). Flag
nova entra lá — não em constante duplicada.
