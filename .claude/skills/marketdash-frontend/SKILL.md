---
name: "marketdash-frontend"
description: "Arquitetura e domínio do frontend MarketDash: features, rotas, autenticação Supabase, ambientes por hostname, integrações (Facebook, Shopee, Instagram, WhatsApp) e páginas de captura/links. Use ao navegar pelo código, ao implementar qualquer feature, e sempre que a pergunta for 'onde fica isso' ou 'por que essa tela se comporta assim'."
---

# MarketDash — Frontend

SaaS de analytics para afiliadas de marketing digital. A usuária vende
produtos de terceiros, ganha **comissão**, paga **anúncio**, e quer saber se
está no lucro. Consulta muito pelo **celular**.

## Mapa das features

| Feature | Telas principais |
|---|---|
| `dashboard` | `Dashboard`, `AdSpends`, `Campanhas` (=Anúncios), `UploadCSV`, `CustomLinks`, `CapturaSite`, `Automacoes`, `Afiliados`, `Reports`, `Integrations`, `Configuracoes`, `PlanosPage`, `ImpostosMeta`, `IndiquePage`, **`CampanhasGrupos` + `CampanhaGrupoDetalhe`** (campanhas de WhatsApp), `RoteiroEditor`, `NumeroDetalhe`, `Ofertas`, `Templates` |
| `admin` | `AdminDashboard`, `AdminClients`, `AdminClientDetail`, `AdminDre`, `AdminExpenses`, `AdminSyncStatus`, `AfiliadosPendentes` |
| `auth` | login, cadastro, definir/recuperar senha |
| `subscription` | planos, checkout, estado da assinatura |
| `landing` | landing pública + `sales` (11 seções, links Kiwify por plano/período) |

Rotas em `src/app/routes/app-routes.tsx`, com `RequireAdmin` e `RequirePlan`.


### ⚠️ "Campanhas" são DUAS coisas diferentes

| No menu | Rota | O que é | Código |
|---|---|---|---|
| **Anúncios** | `/dashboard/campanhas` | tráfego pago do Meta | `pages/Campanhas.tsx`, `campaigns.service.ts` |
| **Campanhas** | `/dashboard/grupos` | grupos de WhatsApp (MAX) | `pages/CampanhasGrupos.tsx` + `CampanhaGrupoDetalhe.tsx`, `campanhas_grupos.service.ts` |

O detalhe da campanha de grupos tem **nove abas**, controladas por `?tab=` (o
array `ABAS` é a fonte da verdade; `Tabs` é controlado pela URL, não
`defaultValue` — com `defaultValue`, link de outra tela não trocava de aba):

**Visão geral · Números · Grupos · Roteiros · Link de entrada · Anúncios ·
Resultados · Atividade · Monitoramento**

- **Visão geral é só leitura** (`VisaoGeralDaCampanha.tsx`) — a edição vive no
  botão **Configurações** (`ConfiguracoesDaCampanha.tsx`).
- **Números** define quais números a campanha usa, e a aba **Grupos** só
  oferece grupos deles.
- **"Enviar oferta" fica em Roteiros**, não em Grupos: envio rápido é roteiro
  de um passo.
- Métrica financeira só em **Resultados**.

## Autenticação

- Supabase Auth SDK → JWT → `fetchWithAuth` manda `Authorization: Bearer`.
- **401 não desloga na hora**: renova a sessão do Supabase **uma vez** e
  repete a request. Com requests paralelas, deslogar no primeiro 401 deixava
  a tela montar pela metade. Se a renovação falhar, aí sim desloga.
- **403 de assinatura**: dentro de `/dashboard`, o `ProtectedRoute` mostra o
  modal; fora, redireciona para checkout.
- Gotcha de backend que afeta teste de ponta a ponta: **`/register` não cria
  usuário no Supabase** — quem cria é o `/login` (migração preguiçosa).

## Ambientes — resolvidos em runtime, não só no build

`API_BY_HOST` em `core/config/api.config.ts` mapeia o hostname para a API
correta, mesmo se o `VITE_API_URL` do build estiver errado:

| Host | API |
|---|---|
| `marketdash.com.br` / `www.` | `api.marketdash.com.br` |
| `hml.marketdash.com.br` | `api.hml.marketdash.com.br` |
| `localhost` | proxy do Vite → `localhost:8000` |

`isProductionHost()` compara por **igualdade exata**. `.includes()`
classificaria `hml.marketdash.com.br` como produção (contém a string) e
esconderia, justamente em homologação, as features que só existem para serem
testadas lá. É essa função que oculta a aba **WhatsApp**
em produção.

Tudo que começa com `VITE_` vai para o bundle e é **público**. Segredo nunca
entra aí.

## Integrações — o lado da tela

| Integração | Store | Comportamento |
|---|---|---|
| **Facebook / Meta** | `facebookConnectionStore` | OAuth, seleção de contas de anúncio, sync manual. Desmarcar a última conta **pede confirmação** |
| **Shopee** | — (services + `datasetStore`/`clicksStore`) | Sync full/incremental e por período; Converter de links via `proxy_graphql` |
| **Instagram** | `instagramConnectionStore` | Automação comentário → direct, **exclusiva do MAX** |
| **WhatsApp** | — | Resumo diário; aba **oculta em produção** |

O botão de sync manual do usuário é **interativo** — no backend ele vai com
prioridade máxima justamente para não ficar atrás do batch. Se a tela mostrar
"sincronizando" para sempre, o problema costuma estar na fila do Celery, não
aqui.

## Páginas de captura e Meus Links

- `/c/{slug}` é **público, sem auth**. O backend serve OG tags em
  `/c/{slug}/og` para crawler de rede social.
- Meus Links tem o **Converter** (gera link curto) e o **Insight de cliques**,
  que é **forward-only**: só conta a partir da ativação, não retroage.

## Deploy

Vite + nginx (`nginx.conf`, `Dockerfile`). Aba aberta desde antes do deploy
pede um chunk que não existe mais — por isso existe o **reload automático em
falha de chunk dinâmico**. Não remova sem substituto.
