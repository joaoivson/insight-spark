# Decisões, pendências e débitos — Frontend

> Mudança visível ao usuário vai no `CHANGELOG.md` da raiz. Aqui fica o
> **porquê** — o que o changelog não carrega.
>
> Decisão revogada **não some** — vira linha nova dizendo o que revogou.

## Decisões

| Data | Decisão | Por quê |
|---|---|---|
| 2026-09-04 | **Visão geral da campanha é LEITURA; a edição vive em Configurações** | Era a primeira tela da campanha e não mostrava nada sobre ela — nome, descrição e toggles. O que a afiliada precisa ao abrir é o link que divulga, o ritmo de entradas e se ainda há grupo com vaga |
| 2026-09-04 | **A taxa de entrada usa `entradas_do_link`, não o total de entradas** | Com a entrada orgânica no numerador, campanha divulgada também fora do link dá taxa acima de 100% — e um número impossível na tela destrói a confiança nos outros |
| 2026-09-04 | **A ocupação exibida usa `min(capacidade, limite)`, igual ao backend** | Mostrar só a capacidade diria "há vaga" num grupo que o roteador já não escolhe. O número da tela tem que bater com a regra que tira o grupo da rotação |
| 2026-09-04 | **`paginar`/`Paginacao` moram em `components/shared`, não em `features/admin`** | A aba Anúncios das campanhas de grupos usa os mesmos helpers; importar de `features/admin` dentro de `features/dashboard` cruza fronteira de feature. O `AdminTableFooter` reexporta para não quebrar quem já importava |
| 2026-09-04 | **`npx tsc --noEmit` na raiz NÃO valida nada** | `tsconfig.json` tem `"files": []` e só referencia os projetos. O comando real é `tsc -p tsconfig.app.json --noEmit` — o do CLAUDE.md passa verde com erro de tipo no código |
| 2026-09-04 | **A tela pede à API só o período que exibe — filtrar no cliente deixou de ser opção para vendas** | Baixar 67.631 linhas (~30 MB) para mostrar as 3.882 dos últimos 7 dias custava 2.018 ms de banco contra 14 ms com o filtro de data. O filtro de data do cliente continua (o corte fino é dele), mas em cima do que a API já recortou |
| 2026-09-04 | **Cache de dado tabular é por USUÁRIO + PERÍODO, e só abaixo de 8.000 linhas** | Chave só por usuário devolvia a fatia de "7 dias" para quem pediu "mês atual". E `setItem` de 30 MB estoura a cota (5–10 MB por origem): o `catch` engolia, o cache nunca persistia na conta grande e toda carga era fria. Acima do teto nem tenta — `JSON.stringify` desse tamanho trava a thread antes de falhar |
| 2026-09-03 | **A densidade de Configurações mora num componente só (`SecaoCard`), não em cada aba** | O pedido era "fonte e padding grandes demais". Ajustar tela a tela desalinha as abas entre si — e a régua precisa ser medida, não sentida: o critério de aceite foi os 7 dias da semana cabendo em 1366×768 com o footer fixo, conferido por screenshot |
| 2026-09-03 | **Card de número deixou de carregar os grupos dentro — REVOGA parte da decisão de 31/08** | Aquele desenho resolvia o problema certo (cruzar duas listas para saber o que um chip fazia), mas assumia volume irreal: o sync traz TODOS os grupos do WhatsApp pessoal (492 no teste, ~6 de trabalho). O card compacto responde "este chip está de pé?"; o detalhe do número responde "o que ele faz". O bucket "Grupos sem dispositivo ativo" e o vínculo N:N daquela decisão continuam valendo |
| 2026-09-03 | **`history.replaceState` não avisa o React Router — param de OAuth não pode ter precedência de roteamento** | O componente do Facebook limpa o `?code` assim, mas ele continua nos `searchParams` em memória. Dar precedência a ele travava a navegação lateral em "Facebook Ads" pelo resto da visita. Regra: `?tab` explícito vence, e trocar de seção limpa `code`/`error` |
| 2026-09-03 | **A lista de contas do Facebook é carregada ao abrir o modal, nunca no mount** | `GET /ad-accounts` é ao vivo na Graph (contas + BMs, paginado): rodava a cada abertura de Configurações e, com muitos ad accounts, empurrava tudo pra baixo da dobra. Esconder visualmente não resolveria — a chamada continuaria acontecendo. O custo escondido dessa mudança foi perder o detector de token morto, que passou para o sync no backend |
| 2026-08-27 | **`dialog.tsx` e `alert-dialog.tsx` foram editados em `components/ui/`** — exceção consciente à regra de não tocar nos primitivos | `max-w-lg` sem margem lateral encosta o modal nas duas bordas em 390px, e isso valia para os ~18 `AlertDialog` de confirmação. Wrapper exigiria trocar o import em 22 arquivos com o mesmo risco. As classes aplicadas (`max-w-[calc(100%-2rem)] rounded-lg sm:max-w-lg`) são as do shadcn atual, então um `shadcn add` futuro reescreve com o equivalente em vez de regredir — há comentário no topo dos dois arquivos dizendo isso |
| 2026-08-27 | **O menu lateral do mobile foi removido, não consertado** | O `Sheet` existia sem nenhum gatilho que o abrisse: o header recebia `onMobileMenuToggle` e nunca renderizou hambúrguer. Era menu morto, e a navegação mobile do produto é a bottom nav — adicionar o hambúrguer contrariaria o design system |
| 2026-08-27 | **Tabela de 6 colunas vira card até `lg`, não até `md`** (uso da plataforma, despesas) | No tablet elas não cabem nem com scroll contido, e a coluna cortada não se anuncia — o usuário não descobre que há mais conteúdo à direita |
| 2026-08-25 | **Cadeado de plano no menu só renderiza com `planStore.context != null`** (sidebar + bottom nav) | O fallback do store é "essencial" antes do fetch e após falha — cadeado nesses estados trava assinante pagante no modal de upgrade. O cadeado é cosmético: quem garante é o `RequirePlan` da rota |
| 2026-08-25 | **Seção de Configurações deriva de `useSearchParams`, não de useState** — push no mobile, replace no desktop | Estado local seedado no mount não ressincroniza com navegação interna e quebra o Back físico do celular na subtela; derivar da URL resolve os dois e torna a seção compartilhável |
| 2026-08-25 | **`useIsMobile` tem valor inicial síncrono** (`window.innerWidth` no initializer) | `useState(undefined)` fazia o 1º render ser sempre "desktop": flash + montagem dupla de componentes com efeito de rede quando as árvores diferem por viewport |
| — | **Componente nunca chama API direto**: `Components → stores → services → api.config` | O dia em que o header muda (auth, `X-User-Id`, retry de 401) é um arquivo, não trinta |
| — | **shadcn/ui em `components/ui/` não se modifica** — estende via wrapper | `npx shadcn add` sobrescreve o arquivo; customização feita dentro dele evapora sem aviso |
| — | **Tema dark é o padrão** e as cores saem das variáveis do tema | Cor hardcoded quebra no dia do tema claro e não aparece em review |
| — | **`isProductionHost()` compara host por igualdade exata**, nunca `.includes()` | `hml.marketdash.com.br` **contém** `marketdash.com.br` — `includes` classificaria homologação como produção e esconderia features do ambiente onde elas são testadas |
| 2026-08-11 | **A aba WhatsApp fica oculta em produção** por `isProductionHost()` | Feature em maturação: fica disponível em hml para validação sem expor à base pagante |
| — | **`fetchWithAuth` injeta `user_id` como query param além do header** | Compatibilidade com endpoints antigos. **Consequência que virou regra do backend:** endpoint novo não pode usar `user_id` como nome de query param |
| — | **401 tenta renovar a sessão do Supabase UMA vez antes de deslogar** | Com requests paralelas, deslogar no primeiro 401 deixava a tela montar pela metade. Se a renovação falhar, desloga — sem dado falso |
| 2026-08-07 | **Stores usam stale-while-revalidate** (padrão do `adSpendsStore` replicado em `datasetStore` e `clicksStore`) | Sem revalidação, o cache em localStorage servia dado velho: celular e PC do mesmo usuário mostravam números diferentes |
| — | **KPI é calculado no frontend**, a partir das linhas cruas | Decisão herdada, não ideal — mas é o que a usuária vê. `get_kpis` do backend **não** alimenta o dashboard, e `cost`/`profit` de `dataset_rows_v2` estão mortos. Mudar o cálculo só no backend não muda nada na tela |
| — | **`Profit = Commission − Ad Spend`**, não `Revenue − Cost` | A afiliada não recebe a receita da venda, recebe a comissão |
| — | **Contagem de pedidos usa `order_id` distinto** | Venda com vários itens vira várias linhas no CSV |
| — | **Atalhos de período (Ontem/7d/14d/mês) cortam no fim do dia anterior em Brasília** — helpers `*BR` em `shared/lib/date.ts` | O corte em UTC fazia o painel virar o dia entre 21h e 0h BRT e a usuária via um período diferente do que pediu |
| — | **Comissão por canal usa o canal real dos cliques**, não o do pedido | Revoga a versão anterior que lia o canal do pedido |
| — | **Filtro de Categoria opera só no nível 1** | A hierarquia da Shopee é profunda demais para virar filtro útil |
| — | **Mobile é app-like**: bottom nav, `ResponsiveModal`, `DataCard`, tabela vira card | A usuária consulta pelo celular entre uma campanha e outra; tabela com scroll horizontal não se lê nessa situação |
| — | **Telas diretas e enxutas**, sem texto auxiliar decorativo | Texto explicativo só onde há consequência real (ação destrutiva, limite de plano). O resto vira ruído que ninguém lê |
| — | **Todo número alinhado à direita, com `tabular-nums`** | A usuária confere colunas contra o relatório da Shopee: casa decimal sob casa decimal faz a divergência saltar |
| 2026-08-19 | **Recarrega a página automaticamente quando um chunk dinâmico falha** | Aba aberta desde antes do deploy pedia um chunk que não existe mais e quebrava em branco |
| 2026-08-21 | **Seletor de emoji com lista curta escolhida a dedo, sem biblioteca** (`components/shared/EmojiPicker.tsx`) | Lib de emoji custa centenas de KB no bundle de uma tela que a aluna abre pelo celular; o conjunto usado numa mensagem de afiliado é pequeno e previsível |
| 2026-08-21 | **O preview do Direct só mostra o botão com link E título** — a mesma condição do backend | Mostrar o botão só por ter link prometeria na tela algo que o envio não manda |
| 2026-08-20 | **A grade de posts virou fileira de 4 + modal com busca**, e o modal carrega as páginas restantes ao abrir | A grade inteira (224 posts) empurrava os cards 2-4 para fora da tela. E filtrar só o que já foi paginado não acha o post procurado, que costuma estar no fim da lista |
| 2026-08-20 | **Modal de upgrade decide o plano pelo `menuKey` bloqueado**, reusando `MAX_ONLY_MENUS` | Era fixo em "plano Pro" e oferecia o upgrade ERRADO para a Automação Instagram, que é exclusiva do Max |
| 2026-08-20 | **Rótulo de menu não quebra linha** (`whitespace-nowrap`) e a sidebar foi para `w-72` | "Automação Instagram" pedia 168px num item de 144px: quebrava em duas linhas e, com nowrap sozinho, invadia o ícone de cadeado |

## Pendências

| Prioridade | Item | Contexto | Status |
|---|---|---|---|
| Média | **Botão "Atualizar" do header é dead code** — os stores revalidam sozinhos desde a migração para SWR | Botão que não faz nada ensina o usuário a desconfiar da tela | Pendente — remover ou dar função |
| Média | **Badge de desconto do plano Pro** na página de vendas | Rodada da landing (11 seções em `features/landing/sales`) | Pendente |
| Baixa | **`CLAUDE.md` diz proxy → 8081; o `vite.config.ts` aponta para 8000** | Quem segue o doc não conecta no backend | Pendente — corrigir o doc |
| Baixa | **Dois `vite.config.ts.timestamp-*.mjs` versionados na raiz** | Artefato temporário do Vite | Pendente — apagar e ignorar |
| ~~Alta~~ | ~~**Disparo de deploy engolia falha**~~ (`curl ... \|\| echo`, nos DOIS workflows) | Mesmo defeito que deixou o worker Celery com código velho por semanas | **Resolvido em 21/08** — usa o `trigger-deploy.sh` do backend, que confere o HTTP |

## Débitos técnicos

| Item | Onde | Impacto | Plano |
|---|---|---|---|
| **Sem teste automatizado** | — | Playwright está no `package.json` mas não há suíte; toda verificação é manual | Validação por screenshot é obrigatória (`/validar-tela`) enquanto não houver |
| **`min-width: auto` de flex/grid** | telas com `flex`/`grid` | Filho não encolhe sem `min-w-0`: o container fica mais largo que a tela, o `overflow-x-auto` interno nunca ativa e o conteúdo é cortado sem scroll | Ao criar coluna de grid ou filho de flex que recebe conteúdo variável, `min-w-0` junto |
| **Catálogo de planos duplicado** | `shared/lib/plans.ts` × `backend/app/core/plans.py` | Espelho manual: plano novo em um lado e não no outro dá gating divergente | Ao mexer em um, mexer no outro no mesmo commit |
| **`@typescript-eslint/no-explicit-any` é warn, não error** | `eslint.config.js` | `any` passa no lint | Não introduzir `any` novo; o legado fica |
- **22/08/2026 — Automação Instagram oculta em produção** por `isProductionHost()`:
  item do menu, aba de Configurações (incluindo o deep-link `?tab=instagram`) e as
  4 rotas `/dashboard/automacoes*`, que em produção nem são registradas. O código
  foi parar em `main` num merge de branch inteiro; a feature depende do App Review
  da Meta e das migrations 052-056, não aplicadas lá. Homologação segue liberada.
- **02/09/2026 — Instagram LIBERADO em produção** (supera a decisão de 22/08):
  App Review aprovado e migrations 052-056 aplicadas. Em `main` (2d336a8) o
  gate `!isProductionHost()` saiu das 4 rotas; em `develop` (06a396d) o bloco
  compartilhado foi SEPARADO (Grupos/Ofertas/Templates continuam gated). Os
  patches divergem de propósito — o futuro merge develop→main vai conflitar em
  `app-routes.tsx` e deve resolver mantendo a versão de develop.
- **22/08/2026 — `npx tsc --noEmit` NÃO valida `src/`.** O `tsconfig.json` da raiz
  tem `"files": []` e usa project references; sem `-b` nada é compilado. É o comando
  que os workflows de deploy rodam, ou seja, **a checagem de tipos do CI é inócua**.
  Para validar de verdade: `npx tsc -b` (tem ~26 erros pré-existentes — o que
  importa é o número não subir) + `npm run build`.
