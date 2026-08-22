---
description: Padroes para componentes UI no frontend MarketDash
globs: "src/**/*.{ts,tsx}"
---

# Component Standards

## shadcn/ui é obrigatório — e não se modifica

- Todo primitivo vem de `@/components/ui/` (Button, Input, Dialog, Select,
  Table, Skeleton…). Nunca crie um do zero.
- **Não edite arquivos em `components/ui/`.** `npx shadcn@latest add <nome>`
  sobrescreve o arquivo e a sua customização evapora sem aviso. Precisa de
  variação? Faça um wrapper em `components/shared/`.

## Estados obrigatórios

| Estado | O que fazer |
|---|---|
| **Loading** | `<Skeleton />` com as dimensões aproximadas do conteúdo final. Nunca tela branca, nunca spinner solto |
| **Erro** | Mensagem amigável em português. Nunca stack trace, nunca "Error: 500" |
| **Vazio** | Mensagem + a ação que resolve ("Nenhum gasto no período. Lançar gasto") |

Lista vazia sem feedback e tela branca durante o carregamento são os dois
defeitos que mais aparecem em revisão aqui.

## Números — alinhados à direita, sempre

Valor, quantidade, percentual, contagem, ROAS — em qualquer tabela, card,
rodapé ou export:

```tsx
<TableCell className="text-right tabular-nums">{formatBRL(valor)}</TableCell>
```

`tabular-nums` é obrigatório junto: sem ela os dígitos têm larguras
diferentes e as colunas não empilham mesmo alinhadas. Vale para o **rodapé de
totais** e para o **export**, não só para a tela.

Texto (produto, canal, categoria, SubID) fica à esquerda. Data também — é
texto para o leitor, não grandeza comparável.

**Por quê:** a usuária confere as colunas contra o relatório da Shopee.
Alinhado à direita, casa decimal fica sob casa decimal e a divergência salta.

## Tailwind

- Classes utilitárias — nunca inline style, exceto valor **dinâmico vindo do
  dado** (cor de série de gráfico, largura de barra).
- Cores das variáveis do tema (`text-primary`, `bg-muted`,
  `text-muted-foreground`). Nunca `text-[#333]` — o tema dark é o padrão e a
  cor fixa quebra nele.
- Responsividade `sm:` / `md:` / `lg:`, **mobile-first** (ver
  `mobile-first.md`).

## Ícones

`lucide-react`, importados individualmente, `className="h-4 w-4"` como
tamanho padrão.

## Formulários

`react-hook-form` + `zod`. Erro no campo, botão com loading e desabilitado
durante o submit.

## TypeScript

- `@/` sempre; nunca `../../`.
- Sem `any` novo (o lint só avisa — o legado fica, o novo não entra).
- Tipos compartilhados em `src/shared/types/`.

## Texto na tela

Telas **diretas e enxutas**. Texto auxiliar só onde há consequência real:
ação destrutiva, limite de plano, dado que vai para terceiro. Parágrafo
explicativo decorativo vira ruído que ninguém lê e empurra o conteúdo para
baixo da dobra no celular.
