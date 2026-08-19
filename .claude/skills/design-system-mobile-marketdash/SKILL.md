---
name: "design-system-mobile-marketdash"
description: "Design system do MarketDash: padrão mobile app-like (bottom nav, ResponsiveModal, DataCard, tabela→card), uso de shadcn/ui, tipografia de números, gráficos Recharts, chips de filtro e a regra de telas diretas. Use ao criar ou revisar qualquer tela, ao 'melhorar o visual', e ao decidir como um dado deve aparecer."
---

# Design System — MarketDash

Tema **dark por padrão**. shadcn/ui + Tailwind. Estética enxuta: a tela
responde uma pergunta, não conta uma história.

## Mobile é o caso principal

A usuária consulta **entre uma campanha e outra, no celular**. Toda tela
nasce mobile.

| Componente | Uso |
|---|---|
| `ResponsiveModal` | Dialog no desktop, **drawer no mobile**. Substitui `Dialog` cru em qualquer tela que se abra no celular |
| `DataCard` | A linha de tabela vira card: rótulo + valor empilhados, número em destaque |
| Bottom nav | Navegação principal no mobile, ao alcance do polegar |

**Tabela com scroll horizontal não se lê no celular** — a usuária perde a
coluna de referência ao rolar. Converta para cards no breakpoint pequeno. Se
a tabela for irredutível, o scroll fica num container com `overflow-x: auto`
— a **página** nunca rola na horizontal.

## Números — a regra mais específica deste produto

Todo número à **direita**, com **`tabular-nums`**:

```tsx
<TableHead className="text-right tabular-nums">Comissão</TableHead>
<TableCell className="text-right tabular-nums">{formatBRL(v)}</TableCell>
```

Sem `tabular-nums` os dígitos têm larguras diferentes e as colunas não
empilham mesmo alinhadas. Vale para o **rodapé de totais** e para o
**export**, não só para a tela.

**Por quê:** a usuária confere as colunas contra o relatório da Shopee. Casa
decimal sob casa decimal faz a divergência saltar.

Texto (produto, canal, categoria, SubID) e data ficam à esquerda.

### Sentinelas que não se renderiza cru

- **`-1` = ilimitado** (plano MAX). "-1" na tela é bug.
- **Limite `0` = o plano não tem o recurso** → mostrar **"—"**, não "0/0".
  "0/0" não distingue "não usa" (problema de adoção, no Pro) de "não tem"
  (limitação, no Essencial).

## Telas diretas

Sem texto auxiliar decorativo. Explicação só onde há **consequência real**:
ação destrutiva, limite de plano, dado que vai para terceiro. Parágrafo
introdutório empurra o conteúdo para baixo da dobra no celular e ninguém lê.

Ordem no mobile: **(1)** o número que responde a pergunta principal, **(2)**
o filtro de período, **(3)** o resto.

## Filtros

Chips: **visíveis, nomeados, removíveis um a um**. Botão "Limpar tudo"
genérico faz a usuária refazer o que queria manter — e ela não vê quais
filtros estão ativos.

## Gráficos (Recharts)

- Cores das variáveis do tema, série a série — não `#hex` solto.
- **`margin` sempre.** Sem ela o rótulo do último ponto é cortado na borda
  direita do SVG. Existe um `CHART_MARGIN` padrão em `chart-defaults.tsx` —
  use.
- Recharts não reconhece componente-wrapper em alguns slots (rótulo, tick):
  passe o elemento que ele espera, ou o conteúdo simplesmente não renderiza,
  sem erro.
- Grid de cards: 2×2 no desktop em vez de um card esticado em largura total.

## Estados

Loading = Skeleton com as dimensões do conteúdo final. Erro = mensagem
amigável em português. Vazio = mensagem + a ação que resolve. Os três são
obrigatórios em qualquer tela que busca dado.

## shadcn/ui

Primitivos de `@/components/ui/`, **nunca editados** — `npx shadcn add`
sobrescreve. Variação vira wrapper em `components/shared/`.

Para direção visual mais ampla (layout novo do zero, "deixar premium"), a
skill global `ui-shadcn-premium` complementa esta — mas **as regras deste
arquivo vencem** onde houver conflito: elas vêm de bug real deste produto.
