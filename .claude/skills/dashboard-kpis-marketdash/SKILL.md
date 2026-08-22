---
name: "dashboard-kpis-marketdash"
description: "De onde sai cada número do dashboard do MarketDash: lucro, ROAS, receita, comissão, pedidos, desempenho por canal/categoria/SubID, filtros de período e impostos. Use ao mexer no cálculo, ao investigar 'esse número está errado', e ANTES de mudar qualquer coisa que a usuária confere contra o relatório da Shopee."
---

# KPIs do dashboard — MarketDash

## A regra que define o produto

```
Lucro = Comissão − Gasto com anúncio
ROAS  = Receita / Gasto com anúncio
```

**Não é `Receita − Custo`.** A afiliada não recebe a receita da venda, recebe
a **comissão**. `Receita − Custo` daria lucro fantasma — e é o erro que
alguém tenta "corrigir" a cada seis meses.

## ⚠️ O cálculo acontece AQUI, não no backend

O `get_kpis` do backend **não é o que a usuária vê**. O dashboard calcula os
KPIs no frontend, a partir das linhas cruas que vêm do `datasetStore`.

Consequências práticas:

- Mudar a fórmula no backend **não muda nada na tela**.
- As colunas `cost` e `profit` de `dataset_rows_v2` estão **mortas** — não
  são fonte de nada. Ler delas dá número errado com cara de certo.
- Corrigir um KPI significa corrigir **aqui**; e se o backend também expõe o
  mesmo número em algum lugar, os dois precisam mudar juntos ou divergem.

## De onde vem cada coisa

| Número | Fonte |
|---|---|
| **Receita** | `raw_data["Valor de Compra(R$)"]` da linha do CSV |
| **Comissão** | `raw_data["Comissão líquida do afiliado(R$)"]` |
| **Gasto** | `ad_spends` — lançamento manual + espelho do Meta |
| **Pedidos** | **`order_id` distinto** — venda com vários itens vira várias linhas |
| **Canal** | O canal real registrado nos **cliques**, não o do pedido |
| **Categoria** | **Nível 1** da hierarquia da Shopee |
| **SubID** | Campo do CSV |

Helpers em `src/shared/lib/kpi.ts`; formatação de gráfico em
`chart-utils.ts`; impostos em `tax.ts` / `taxes.ts`.

## Período — corta em Brasília, não em UTC

Os atalhos (**Ontem**, 7d, 14d, mês) cortam no **fim do dia anterior em
Brasília**. Os helpers estão em `src/shared/lib/date.ts`:

- `todayKeyBR()`, `yesterdayKeyBR()`, `addDaysKey()`
- `presetRangeKeys(kind)` / `presetRangeDates(kind)` — use estes, sempre
- `parseDateOnly`, `toDateKey`, `isBeforeDateKey`, `isAfterDateKey`

**Nunca recalcule período com `new Date()` na mão.** Entre 21h e 0h BRT o dia
UTC já virou: a usuária pede "hoje" e recebe amanhã. Foi um bug real, noturno
e intermitente — o pior tipo de achar.

O backend segue a mesma convenção: bucketing por dia civil é em **BRT**.
Divergir aqui faz os dois lados mostrarem números diferentes da mesma base.

## Filtros

- Categoria filtra só **nível 1**.
- Status `UNPAID` aparece como **"Não pago"**.
- Filtro ativo vira **chip nomeado e removível individualmente** — não um
  "Limpar tudo" genérico, que obriga a refazer o que a usuária queria manter.
- Card que aponta para uma lista precisa abrir a lista **já filtrada pelo
  mesmo critério**. Já houve o caso do card mandar um parâmetro que a lista
  não lia: clicava e abria sem filtro nenhum.

## Ao mexer em qualquer cálculo

1. A usuária **confere contra o relatório da Shopee**. Número que muda sem
   alguém pedir é achado — vai para o `CHANGELOG.md` da raiz, porque alguém
   vai comparar com o print da semana passada.
2. Alinhe à direita com `tabular-nums` — casa decimal sob casa decimal é o
   que faz a divergência saltar numa coluna de centenas de linhas.
3. Valide **na tela**, com dado real, em mobile e desktop (`/validar-tela`).
   Não existe teste automatizado aqui.
