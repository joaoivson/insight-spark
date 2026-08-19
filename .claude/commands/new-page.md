---
name: new-page
description: Criar uma pagina nova no dashboard do MarketDash (service, store, pagina, rota com gating de plano e entrada no menu).
---

Crie uma página nova seguindo o caminho do projeto.

## Input esperado

O usuário descreve a página (ex.: "tela de desempenho por SubID com filtro de
período").

Antes de escrever qualquer linha, resolva duas perguntas:

1. **Qual plano libera essa tela?** (`essencial` / `pro` / `max`)
2. **De onde vem o dado?** Endpoint existente ou precisa de um novo no
   backend?

## Passos

### 1. Tipos

`src/shared/types/` se o tipo for compartilhado; local à feature se não for.

### 2. Service

`src/services/{assunto}.service.ts`, usando `fetchWithAuth`.
**Não monte header de auth** — ele já injeta `Authorization`, `X-User-Id` e
`?user_id=user_N`, e já trata 401 (renova a sessão) e 403 de assinatura.

### 3. Estado

- Compartilhado entre telas → **store Zustand** em `src/stores/`, com o
  padrão **stale-while-revalidate** do `adSpendsStore` (hidrata da cache,
  revalida em background, chave escopada por usuário).
- Local à tela, com paginação/filtro próprios → **React Query** em
  `src/hooks/queries/`.

### 4. Página

`src/features/{feature}/pages/NomeDaPagina.tsx`.

Obrigatórios: **Skeleton** no loading, **mensagem amigável** no erro,
**empty state** com ação. Números à direita com `tabular-nums`. Período pelos
helpers de `@/shared/lib/date.ts` (cortam em BRT).

### 5. Mobile

Do primeiro rascunho, não depois: tabela vira `DataCard`, modal é
`ResponsiveModal`, filtros em chips removíveis, o número principal acima da
dobra.

### 6. Rota

`src/app/routes/app-routes.tsx`. Se a tela é de plano, envolva em
`RequirePlan` com o `menuKey` correspondente — esconder só o item de menu não
protege link direto nem histórico do navegador.

### 7. Menu

Entrada em `src/components/dashboard/` (sidebar **e** bottom nav do mobile).

### 8. Verificar

```bash
npx tsc --noEmit && npm run lint && npm run build
```

E **valide na tela** com Playwright, em mobile e desktop (`/validar-tela`).

### 9. Fechar

`CHANGELOG.md` da raiz se a tela é visível ao usuário; `.claude/memoria/`
(`DIARIO.md` sempre, `DECISOES.md` se houve decisão de layout ou trade-off).
