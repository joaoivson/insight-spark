# Contexto — MarketDash Frontend

> **Estado atual do repositório.** Sobrescreva as seções ao mudarem — o
> histórico vive em `DIARIO.md`. Última atualização: **2026-09-04**.
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
  aqui muda em todas de uma vez, que é o ponto), `Paginacao` (helpers
  `paginar`/`totalDePaginas` + o componente com seletor 25/50/100; vieram de
  `features/admin/components/AdminTableFooter.tsx` em 04/09, que agora só
  reexporta — a aba Anúncios das campanhas de grupos precisava dos mesmos e
  importar de `features/admin` cruzava fronteira de feature)
- `src/components/whatsapp/` — Configurações › Integrações › **WhatsApp**
  (desde 03/09/2026; era a aba "Dispositivos"). Desde 04/09 **sem abas
  internas**: a seção é só Números, e "Envio" virou Operação › **Parâmetros**
  (mesmo `EnvioSection`, agora dentro de um `SecaoCard`).
  `NumerosSection` orquestra o grid; `DispositivoCard` é o card compacto e
  clicável (sem grupos dentro — abre `/dashboard/configuracoes/numeros/:id`,
  a página `NumeroDetalhe`, também sem abas), `ConectarNumeroModal` oferece
  **QR ou código de pareamento**, `TabelaDeGrupos` é a tabela→DataCard de 3
  colunas (Ativo/Nome/Participantes) **paginada** (25/50/100) e
  `GerenciarDispositivoModal` renomeia/remove.
  `GruposDoDispositivo`, `BlacklistSection` e `WhatsappResumoSettings` foram
  removidos em 03/09
- `src/shared/lib/` — `date.ts` (helpers `*BR`), `kpi.ts`, `plans.ts`,
  `tax.ts`, `chart-utils.ts`, `storage.ts`, `supabase.ts`

## Campanha de grupos (`/dashboard/grupos/:id`)

Nove abas, controladas por `?tab=` (`CampanhaGrupoDetalhe.tsx`), nesta ordem
desde 04/09/2026:

**Visão geral · Números · Grupos · Roteiros · Link de entrada · Anúncios ·
Resultados · Atividade · Monitoramento**

O que muda com relação ao que existia antes:

- **Visão geral é LEITURA** (`VisaoGeralDaCampanha.tsx`): link de entrada
  copiável, KPIs operacionais, gráfico de entradas × saídas (7/14/30) e estado
  dos grupos. Era um formulário — a edição foi para o botão **Configurações** no
  topo (`ConfiguracoesDaCampanha.tsx`, um `ResponsiveModal`), que também tem o
  limite de participantes. Descrição saiu da UI.
- **Números** (`NumerosDaCampanha.tsx`) é a aba que define quais números a
  campanha usa — e a aba **Grupos** só oferece grupos deles. Sem número
  escolhido, Grupos mostra um estado que aponta para Números, não uma lista
  vazia.
- **Grupos**: coluna de ocupação (`944/900`), menu de três pontinhos com
  confirmação no lugar do `×`, e `ExportarLeadsModal.tsx`. **"Enviar oferta"
  não está aqui** — mudou para Roteiros, porque envio rápido é roteiro de um
  passo.
- Métrica financeira só em **Resultados**. A Visão geral não mostra comissão,
  lucro nem ROAS, e `null` vira "—" (nunca "0%", que afirmaria que ninguém
  converteu).

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

- **Campanhas de grupos: duas rodadas de correções (04/09 e 04/09b) em
  homologação**, validadas contra `hml.marketdash.com.br` e por screenshot em
  390px e 1440px. 🔴 A promoção para produção está **bloqueada pela política de
  privacidade** — o backend passou a guardar o número real de quem entra no
  grupo (079) e, desde a 080, a **lista de membros** dos grupos ativados. A
  `PrivacyPolicy.tsx` já descreve as duas coisas; ela precisa estar publicada
  **antes** das migrations. Ver `CONTEXTO.md` do backend e
  `docs/PROMOCAO_PARA_PRODUCAO.md` §3.8.
  ⚠️ **O link de entrada só ficou certo em hml em 05/09**: o `FRONTEND_URL` do
  backend apontava para produção, e a tela exibia `marketdash.com.br/g/{slug}`.
  Corrigido no backend e nas envs do Coolify — nada a fazer aqui.

  ⚠️ **O checkbox redondo é global**: `--radius: 0.75rem` + `rounded-sm` numa
  caixa de 16px. O `CheckboxQuadrado` foi aplicado só ao módulo de grupos; os
  outros 9 usos do app continuam redondos.
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
