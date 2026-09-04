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

## A terceira porta: módulo em beta

Além de assinatura e plano existe o **gate de módulo**, para o que já está no
código mas ainda não foi liberado:

```
usePlanStore().moduloLiberado(MODULO_GRUPOS_WHATSAPP)
```

Ele governa, juntos: Integrações › **WhatsApp**, Operação › **Parâmetros**,
e os menus **Campanhas** / **Ofertas** / **Templates** — tudo que só existe por
causa do disparo em grupo.

- Item de menu: `modulo: MODULO_GRUPOS_WHATSAPP` em `dashboard-menu.ts`;
  `menuVisivel()` filtra.
- Rota: `<RequireModulo modulo={...} element={...} />`. A rota **existe
  sempre** — `{cond && <Route/>}` fazia link direto cair em 404 por uma fração
  de segundo antes de a rota passar a existir.
- **Fecha por padrão.** Contexto ainda carregando, backend antigo sem o campo,
  módulo ausente do JSON → invisível. O default oposto abriria o módulo para a
  base inteira por um erro de digitação.

Quem decide é o **backend**, por conta, em `GET /subscription/plan` →
`modulos`. Não é mais `isProductionHost()`: aquele gate era build-time e
liberar um beta exigia rebuild + redeploy.

`isProductionHost()` continua existindo para o que é mesmo de ambiente (ex.: o
`PlatformBreakdownCard`, cujas fórmulas divergem dos KPIs). A comparação é por
**igualdade exata** do hostname. **Nunca troque por `.includes()`**:
`hml.marketdash.com.br` contém `marketdash.com.br` como substring, e
homologação passaria a se comportar como produção.

## Feature flags

`feature-flags.json` é lido pelos dois lados (alias `@feature-flags` aqui;
`app/core/feature_flags.py` no backend). Flag nova entra lá — não em constante
duplicada.

⚠️ O alias do Vite aponta para `marketdash-frontend/feature-flags.json`, e o
backend lê o da **raiz** do monorepo. Não são o mesmo arquivo: mantenha os dois
em sincronia, ou melhor — coloque a decisão no backend, que é runtime.

Módulo em beta mora em `modulos_beta`:

```json
"modulos_beta": {
  "grupos_whatsapp": { "liberado": false, "planos": [], "emails": ["a@b.com"] }
}
```

A env **`MODULOS_BETA`** (csv) manda sobre o arquivo — é a alavanca de
produção: liberar ou recolher um beta é variável no Coolify + restart, sem
rebuild. Definida e vazia fecha tudo; não definida cai no arquivo.
