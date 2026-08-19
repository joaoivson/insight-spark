---
name: check
description: Rodar a verificacao completa do frontend MarketDash (tsc, lint, build) e reportar a saida real.
---

Rode a verificação do frontend e **mostre a saída** — não afirme que passou
sem evidência.

## 1. Type check

```bash
npx tsc --noEmit
```

Tem que passar limpo. Erro de tipo aqui é erro em runtime lá.

## 2. Lint

```bash
npm run lint
```

Erro bloqueia. Warning de `any` é tolerado no legado — mas **`any` novo não
entra**; se o warning apareceu num arquivo que você tocou, corrija.

## 3. Build

```bash
npm run build
```

O build é o teste mais completo que existe neste repo: resolve imports,
valida o alias `@/`, e falha em coisa que `tsc --noEmit` deixa passar.

## 4. Import quebrado entre repos

Se a mudança mexeu em plano, limite ou feature flag, confirme o espelho:

- `src/shared/lib/plans.ts` × `marketdash-backend/app/core/plans.py`
- `feature-flags.json` está na **raiz do monorepo** e é lido pelos dois lados

Divergência aí não quebra build — vira gating errado na tela do cliente.

## 5. O que isto NÃO verifica

`tsc`, lint e build passam com a tela toda quebrada: layout estourado no
celular, Skeleton ausente, "-1" renderizado, filtro que não filtra.

**Não existe suíte automatizada neste repo.** Se a mudança é visível, a
verificação só termina com `/validar-tela` (screenshot em mobile e desktop).

## 6. Reportar

Diga o que passou, o que falhou, cole a saída relevante — e diga
explicitamente se a validação visual foi feita ou não.
