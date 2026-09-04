---
name: "admin-painel-marketdash"
description: "Painel administrativo do MarketDash (telas de Dashboard, Clientes, Uso, Despesas, DRE e Sincronizações): o que cada card significa, quais números não podem divergir entre si e as armadilhas já vividas nas rodadas 6 e 7. Use ao mexer em qualquer tela de features/admin ou ao investigar 'esse número do painel está estranho'."
---

# Painel Admin — Frontend

Público: o dono do negócio. Aqui um número errado não quebra a tela — **muda
uma decisão**, e sai plausível.

## Telas

| Tela | Arquivo | Mostra |
|---|---|---|
| Dashboard | `AdminDashboard.tsx` | MRR, faturamento, novas × canceladas, plano × periodicidade (grid **2×2**) |
| Clientes | `AdminClients.tsx` | Lista paginada (20/pág.), busca, filtros de status/plano e chips de alerta |
| Detalhe | `AdminClientDetail.tsx` | Assinatura, cobranças, uso |
| Uso | aba em `AdminDashboard` / `PlatformUsageTab` | Usuárias ativas, dias ativos, atividade por usuária |
| Despesas | `AdminExpenses.tsx` | Lançamentos |
| DRE | `AdminDre.tsx` | Resultado |
| Sincronizações | `AdminSyncStatus.tsx` | `sync_runs` — o que rodou, quando, com que erro |

Protegidas por `RequireAdmin`. Os dados vêm de
`admin-panel.service.ts` / `adminPanelStore`.

## O que não pode divergir

**Card e lista filtrados pelo mesmo critério têm que dar o mesmo número.**
Já divergiram (17 × 26) porque o card excluía assinantes sem `user_id`
(importados do histórico, sem conta criada) e a lista não.

**Card que aponta para uma lista abre a lista já filtrada.** O card
"Sem acesso 10d+" mandava `?sem_acesso=N` e a lista só lia `?no_login_10d=1`
— clicava e abria sem filtro nenhum.

**Filtro aplicado na tela vale no export.** O CSV de clientes já exportou a
base inteira enquanto a tela mostrava o filtro. `q`, `status`, `plan` e os
alertas viajam para o endpoint de export.

## O que cada número significa (e a base que ele usa)

| Número | Base |
|---|---|
| MRR, ARPU, plano × periodicidade, **taxa de churn** | **quem está renovando** — não cancelada e com acesso |
| Aba Uso, alertas, lista de Clientes | **quem tem acesso**, mesmo cancelada |

São perguntas diferentes: "quem me paga mês que vem" ≠ "quem consegue entrar
hoje". Assinante **cancelado mantém acesso** até a data paga.

**MRR bruto** usa **preço de tabela** do catálogo de planos, não a última
cobrança (que pode ter cupom histórico). **Faturamento** vem de cobranças
únicas por `order_ref` — já apareceu **dobrado** por contar de duas fontes.

## Plano e limites na tela

O Essencial mostra **"—"** em Links/Páginas, não "0/0": o limite `0` significa
que **o plano não tem** o recurso, e "0/0" confundiria com problema de
adoção. O `-1` do MAX é **ilimitado** — nunca renderize cru.

Use `planLimit(plan, recurso)` de `shared/lib/plans.ts` para decidir.

## Gráficos

- `CHART_MARGIN` de `chart-defaults.tsx` — sem `margin`, o rótulo do último
  ponto do MRR/Faturamento é cortado na borda do SVG.
- Recharts ignora componente-wrapper em alguns slots: rótulo exposto por
  wrapper **não renderiza**, sem erro.
- Grid 2×2 no desktop; card esticado em largura total foi revertido.

## Lista de Clientes

- Paginação 20/página, com "Mostrando X–Y de N". Desde 04/09/2026 os helpers
  (`paginar`, `totalDePaginas`, `<Paginacao>`) moram em
  **`src/components/shared/Paginacao.tsx`** — o `AdminTableFooter` só
  reexporta, para não quebrar quem já importava dele. **Tabela nova importa de
  `components/shared`**, não de `features/admin`: fora do admin isso cruzaria
  fronteira de feature. O componente aceita `onPorPaginaChange` para mostrar o
  seletor 25/50/100 (a lista de Clientes não usa; a aba Anúncios das campanhas
  de grupos, sim).
- A busca varre a base inteira (client-side sobre o array já filtrado);
  trocar ordenação ou filtro volta para a página 1.
- Ordenação de uma coluna usa **o mesmo campo que a célula mostra** — já
  houve o caso de "Próx. cobrança" ordenar por outro campo.
- Chips de alerta (`expiring_7d`, `payment_failed`, `never_connected`,
  `no_login_10d`) são nomeados e removíveis individualmente.

## Antes de mergear

`/validar-tela` com screenshot **em cada card que mudou**, e confira o par
card × lista. Se algum número mudou, ele vai para o `CHANGELOG.md` da raiz —
alguém vai comparar com o print da semana passada.
