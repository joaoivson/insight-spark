---
name: new-component
description: Criar um componente reutilizavel no frontend MarketDash usando shadcn/ui como base, com mobile e estados obrigatorios.
---

Crie um componente reutilizável seguindo os padrões do projeto.

## Input esperado

O usuário descreve o componente (ex.: "card de KPI com valor, variação
percentual e sparkline").

## Passos

### 1. Já existe?

Procure em `src/components/shared/`, `src/components/dashboard/` e nos
`components/` da feature. `DataCard`, `ResponsiveModal` e os gráficos de
`components/dashboard/charts/` já cobrem muita coisa — estender é melhor que
duplicar.

### 2. Tem primitivo shadcn?

Liste `src/components/ui/`. Falta algum? `npx shadcn@latest add <nome>`.

**Nunca edite um arquivo de `components/ui/`** — o `add` sobrescreve e a sua
customização some sem aviso. Variação vira **wrapper**.

### 3. Onde colocar

| Uso | Lugar |
|---|---|
| Em várias features | `src/components/shared/` |
| Só no dashboard | `src/components/dashboard/` |
| Só numa feature | `src/features/{feature}/components/` |

### 4. Escrever

- Function component, props tipadas (**sem `any`**)
- Aceite `className` para customização pelo chamador
- Tailwind, cores do **tema** (o padrão é dark) — nada de `text-[#333]`
- Ícones de `lucide-react`, `h-4 w-4`
- Se recebe dado assíncrono: Skeleton próprio no loading

### 5. Números

Se o componente mostra número: **alinhado à direita, `tabular-nums`**. Trate
as sentinelas — **`-1` é ilimitado**, e limite **`0`** significa "o plano não
tem o recurso" (renderize "—", não "0/0").

### 6. Mobile

Componente que abre sobreposição usa `ResponsiveModal` (drawer no mobile).
Componente de listagem tem versão card para telas pequenas. Alvo de toque
confortável.

### 7. Acessibilidade

Label em input, `aria-label` em botão só-ícone, navegação por teclado
funcionando.

### 8. Verificar

```bash
npx tsc --noEmit && npm run lint
```

Screenshot nos dois tamanhos se o componente entra numa tela existente.
