---
description: Padrao mobile app-like do MarketDash — bottom nav, ResponsiveModal, DataCard, tabela vira card
globs: "src/{features,components}/**/*.tsx"
---

# Mobile-first — o produto é usado no celular

A usuária consulta o painel **entre uma campanha e outra, no celular**. Toda
tela nasce mobile e ganha o desktop depois, não o contrário.

## Os três componentes do padrão

| Componente | Onde | Para quê |
|---|---|---|
| `ResponsiveModal` | `components/shared/` | Dialog no desktop, **drawer/bottom sheet no mobile**. Nunca use `Dialog` cru numa tela que a usuária abre pelo celular |
| `DataCard` | `components/shared/` | A linha de tabela vira card no mobile: rótulo + valor empilhados, o número em destaque |
| Bottom nav | `components/dashboard/` | Navegação principal no mobile fica embaixo, ao alcance do polegar — não numa sidebar escondida atrás de um hambúrguer |

## Tabela no mobile

Tabela com scroll horizontal **não se lê** no celular: a usuária perde a
coluna de referência ao rolar. O padrão é **converter para cards** no
breakpoint pequeno — mesma informação, empilhada, com o número que importa em
destaque.

Se a tabela for realmente irredutível (comparação de muitas colunas), o
scroll horizontal precisa estar num container próprio com
`overflow-x: auto` — a **página** nunca rola na horizontal.

## Alvos de toque

Botão, chip de filtro e ícone clicável precisam de área de toque confortável.
Ícone de 16px sem padding é impossível de acertar com o polegar.

## Ordem na tela

No mobile o espaço acima da dobra é curto. Nele vai:

1. O número que responde a pergunta principal (lucro, ROAS)
2. O filtro de período
3. O resto

Texto auxiliar decorativo empurra o conteúdo para baixo da dobra — por isso a
regra de **telas diretas e enxutas**: explicação só onde há consequência real.

## Filtros

Filtros ficam em **chips** — visíveis, nomeados e removíveis individualmente.
Um "Limpar tudo" genérico obriga a usuária a refazer os filtros que queria
manter, e ela não vê quais estão ativos.

## Verificação

Mudou tela? Screenshot **nos dois tamanhos** (mobile e desktop), via
Playwright — ver `/validar-tela`. `npx tsc --noEmit` verde não diz nada sobre
o layout no celular.
