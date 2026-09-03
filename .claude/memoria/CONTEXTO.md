# Contexto — MarketDash Frontend

> **Estado atual do repositório.** Sobrescreva as seções ao mudarem — o
> histórico vive em `DIARIO.md`. Última atualização: **2026-08-27**.
>
> Esta primeira versão foi montada por inspeção do código, do `CHANGELOG.md`
> da raiz e do `git log` de `develop`. Onde ela divergir do código, **o
> código vence** — e quem notar corrige a seção aqui.

## Stack (autoritativa — doc que divergir perde)

React 18 · **Vite** (não Next) · TypeScript · **Zustand** (estado global) ·
React Query (`hooks/queries/`) · **shadcn/ui** + Tailwind · React Router ·
Recharts · Supabase Auth SDK · Playwright (dev dep).

- Dev server na **8080**; proxy `/api` → **`http://localhost:8000`**
  (o `CLAUDE.md` diz 8081 e está desatualizado — o compose do backend expõe
  a 8000).
- Tema **dark por padrão**.
- Alias `@/` para `src/`; `@feature-flags` para o `feature-flags.json` da raiz
  do monorepo — o **mesmo arquivo** que o backend lê.

## Forma do código

```
Components → Zustand stores → services/*.service.ts → core/config/api.config.ts
```

Componente **nunca** chama API direto.

- `src/features/` — `auth`, `dashboard`, `admin`, `landing` (+ `sales`),
  `subscription`
- `src/stores/` — 9 stores (dataset, adSpends, clicks, campaigns, plan,
  adminPanel, facebookConnection, instagramConnection, taxSettings)
- `src/services/` — 22 services
- `src/hooks/queries/` — `useAdSpends`, `useClicks`, `useDatasetRows`
- `src/components/ui/` — shadcn, **não modificar**; estender via wrapper
- `src/components/shared/` — `DataCard`, `ResponsiveModal`, `EmojiPicker`,
  `SecaoCard` (a régua de densidade de TODAS as abas de Configurações — mexer
  aqui muda em todas de uma vez, que é o ponto)
- `src/components/whatsapp/` — Configurações › Integrações › **WhatsApp**
  (desde 03/09/2026; era a aba "Dispositivos"), com abas Números e Envio.
  `NumerosSection` orquestra o grid; `DispositivoCard` é o card compacto e
  clicável (sem grupos dentro — abre `/dashboard/configuracoes/numeros/:id`,
  a página `NumeroDetalhe`), `TabelaDeGrupos` é a tabela→DataCard de 3 colunas
  (Ativo/Nome/Participantes) e `GerenciarDispositivoModal` renomeia/remove.
  `GruposDoDispositivo`, `BlacklistSection` e `WhatsappResumoSettings` foram
  removidos nessa mesma rodada
- `src/shared/lib/` — `date.ts` (helpers `*BR`), `kpi.ts`, `plans.ts`,
  `tax.ts`, `chart-utils.ts`, `storage.ts`, `supabase.ts`

## Shell do dashboard (mobile)

`DashboardLayout` = sidebar (só desktop) + header + `main` + `MobileBottomNav`.

- **No mobile não existe menu lateral.** A navegação é a bottom nav (4 tabs +
  "Mais"); `DashboardSidebar` retorna `null` abaixo de `md`. O `Sheet` lateral
  foi removido em 27/08 — não tinha gatilho nenhum que o abrisse.
- O container do conteúdo tem **`min-w-0 overflow-hidden`**. O `min-w-0` não é
  decorativo: sem ele os `overflow-x-auto` das tabelas não ativam e o conteúdo
  é cortado sem scroll.
- Barra de ação fixa de página (editores) fica em
  `bottom-[calc(58px+env(safe-area-inset-bottom))] md:bottom-0` — em `bottom-0`
  ela some atrás da bottom nav (`z-40`).
- `dialog.tsx` / `alert-dialog.tsx` foram ajustados para não encostar nas
  bordas no celular — exceção registrada em `DECISOES.md`.

## Verificação visual

`mobile-audit.mjs` percorre as 25 rotas em **390×844, 820×1180 e 1440×900**,
grava screenshot, mede overflow e coleta erro de console/rede:

```bash
AUDIT_EMAIL=... AUDIT_PASSWORD=... node mobile-audit.mjs [--only=a,b] [--viewport=mobile]
```

Ele **não** cobre modal aberto, drawer nem filtro aplicado — esses vão no
`/validar-tela` interativo. Foi assim que o drawer de envio de oferta (conteúdo
de 749px em tela de 390px) apareceu.

⚠️ O `.env` do frontend aponta para o Supabase `iprdyorxqdiivthtcvxf` e o
backend local, para o de homologação (`ytjpdvjuxtvxacredekk`). O login funciona
e **toda** chamada volta 401 (`unrecognized JWT kid`). Suba o Vite com as envs
de hml por fora, sem tocar em arquivo:

```bash
HML_KEY=$(grep '^SUPABASE_KEY=' ../marketdash-backend/.env | cut -d= -f2-)
VITE_SUPABASE_URL="https://ytjpdvjuxtvxacredekk.supabase.co" \
  VITE_SUPABASE_ANON_KEY="$HML_KEY" npm run dev
```

## `fetchWithAuth` — o que ele injeta em TODA request

`src/core/config/api.config.ts`:

1. `Authorization: Bearer <token>` (limpo de aspas e de "Bearer" duplicado)
2. Header `X-User-Id: user_N`
3. **Query param `?user_id=user_N`** — por compatibilidade

⚠️ Por causa do item 3, **endpoint novo do backend não pode usar `user_id`
como nome de query param** — receberia esse valor, no formato errado, em
silêncio.

Também trata: **401 → tenta renovar a sessão do Supabase uma vez e repete a
request** antes de deslogar (evita tela montando pela metade com requests
paralelas); **403 de assinatura** → modal/checkout conforme a rota.

## Ambiente por hostname (runtime, não só build)

`API_BY_HOST` mapeia `marketdash.com.br` → `api.marketdash.com.br` e
`hml.marketdash.com.br` → `api.hml.marketdash.com.br`, mesmo se o
`VITE_API_URL` do build estiver errado.

`isProductionHost()` compara o host por **igualdade exata** — `.includes()`
classificaria `hml.marketdash.com.br` como produção, porque contém
`marketdash.com.br` como substring. É essa função que **esconde a aba
WhatsApp em produção**.

## Gating por plano

`planStore` + `RequirePlan` (`src/app/routes/RequirePlan.tsx`): menu não
liberado redireciona para `/dashboard/planos`. O catálogo espelha
`marketdash-backend/app/core/plans.py` em `src/shared/lib/plans.ts` —
**limite `-1` significa ilimitado** (MAX), e o frontend precisa tratar isso
ou mostra "-1" na tela.

## Cache local

`dataset-cache:{userId}` e `adspends-cache:{userId}` em localStorage, com
**stale-while-revalidate** nos stores. Sem a revalidação, celular e PC
mostravam números diferentes.

## Rodar e verificar

```bash
npm run dev          # :8080, proxy /api → :8000
npm run lint
npx tsc -b            # `--noEmit` NÃO valida src/ (project references)
npm run build
```

Não há suíte de teste automatizada. **A verificação é visual, via Playwright**
— ver `/validar-tela`.

## Em voo / pendente

- Badge de desconto do plano Pro na página de vendas.
- Botão "Atualizar" do header é **dead code** desde a migração para SWR.
- **Automação Instagram: EM PRODUÇÃO desde 02/09** (App Review aprovado em
  01/09). Gate de ambiente removido em `main` (2d336a8) e separado em
  `develop` (06a396d) — os dois patches divergem de propósito, NÃO fazer
  merge develop→main por causa disso. O cadeado por plano (MAX) continua.
  Pendente: prints `public/instagram/passo-{1,2,3}*.png` (design).
- **Automação em STORY (hml, 02/09 à tarde)**: Card 1 do editor virou toggle
  Publicações×Stories + SelecionarStory (thumbs 9:16, aviso de 24h); no escopo
  story o card de resposta pública some e o direct vira card 3. Barra de ações
  corrigida (não cobre mais o sidebar, `md:left-72`) + botão Voltar — esse fix
  TAMBÉM está em produção (`main 1ce08d2`). Pendência cosmética: o preview
  ainda mostra o mock de comentário no escopo story.
- **Plano Max LANÇADO em 02/09**: card dourado (`#F0A94A`, badge "Novo") na
  landing (`SalesPrecos.tsx`) e em `/dashboard/planos`. R$ 97/207/627, toggle
  "até 29%/46%". Copy sem WhatsApp (módulo fora de produção). Commits
  `develop 60931a6` / `main b0eefd5` (cherry-pick — arquivos eram idênticos).
- Branch de trabalho: **`develop`**. Produção sai de `main`.
