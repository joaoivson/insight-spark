# Decisões, pendências e débitos — Frontend

> Mudança visível ao usuário vai no `CHANGELOG.md` da raiz. Aqui fica o
> **porquê** — o que o changelog não carrega.
>
> Decisão revogada **não some** — vira linha nova dizendo o que revogou.

## Decisões

| Data | Decisão | Por quê |
|---|---|---|
| 2026-09-08 | **Antes de concluir que o Docker está fora, confira o PATH** | O `docker` mora em `/usr/local/bin` (symlink para dentro do `Docker.app`) e **não está no PATH do shell do agente**: `command not found` sai como 127 e vira "engine parada". Perdi 10 min esperando um Docker que estava de pé há 2 dias, com o `marketdash_app` saudável na :8000 |
| 2026-09-08 | **O app declara `lang="pt-BR"` e bloqueia tradução em três camadas — incluindo um guard de runtime em `removeChild`/`insertBefore`** | Traduzir a página **derruba o React**: o tradutor troca os nós de texto por elementos `font`, o React chama `removeChild` num nó que já não é filho e lança `NotFoundError`; sem ErrorBoundary, a árvore inteira cai (tela preta, parece "deslogou"). `notranslate` só vale para o tradutor nativo do Chrome — extensão, webview do Instagram e o "traduzir" do Android ignoram, e só o guard cobre esses |
| 2026-09-08 | **Comentário no `index.html` não escreve nome de tag entre `<` e `>`** | O Vite injeta os scripts procurando a abertura de `head` por texto: um comentário que a contenha faz os scripts do dev server caírem **dentro** dele — HMR morre em silêncio e o build de produção passa normal |
| 2026-09-08 | **Layout de colunas em página com sidebar começa em `lg:`, não em `sm:`** | A viewport do tablet passa de 640 px, mas a sidebar aberta come ~300 px: sobram ~500 px de container, as colunas fixas não cabem e o bloco flexível é espremido a quase zero, com o texto vazando por cima dos números. Breakpoint tem que corresponder ao **container**, não à viewport |
| 2026-09-08 | **Lista longa pagina (25, seletor 25/50/100) em vez de renderizar tudo** | Meus Links ficou ilimitado no plano MAX; centenas de linhas de uma vez é custo garantido para um ganho que a busca já entrega |
| 2026-09-08 | **Link sem clique nenhum vai para o FIM da ordenação por "último clique"** | `null` no topo enterraria justamente os links que a afiliada está caçando — os que pararam de receber clique |
| 2026-09-05b | **Select de "cheio" com TRÊS estados — nada limpa o override sozinho** | Revoga o comportamento de 04/09b, que causou o bug relatado como "o sync apaga minha marcação": marcar "Sim" num grupo já cheio pela ocupação gravava `null`, a assinatura não mudava, o botão não acendia e nenhum PUT saía. Da tela é indistinguível de sobrescrita pelo sync. "Automático" passa a ser a porta de volta explícita |
| 2026-09-05b | **O Select mostra a INTENÇÃO; o resultado fica na coluna Ocupação** | São duas perguntas diferentes ("o que eu mandei" x "como está agora") e juntá-las no mesmo controle foi o que tornou o override invisível |
| 2026-09-05b | **Laranja de ocupação a partir de 90%, não a partir de `cheio`** | 767/900 (85%) já aparecia alaranjado: cor de alerta em situação normal treina a usuária a ignorar a cor |
| 2026-09-05b | **Card de métrica só pode ter nome que diga a unidade real** | "Leads" era clique no `/g/` (o pixel dispara antes do redirect) e convivia com "Entradas" na mesma linha — R$0,97 ao lado de R$24,64, e ela acreditaria no menor. Viraram "Cliques no link"/"Custo por clique" |
| 2026-09-05b | **Todo custo derivado mostra o denominador na nota** | "R$32,64 por permanência" vinha de 1.305,73 ÷ 40, e o 40 não existia em lugar nenhum da tela. Entrou a coluna "Ficaram" e o denominador nas notas |
| 2026-09-05b | **"—" com o motivo, nunca R$0,00, quando não há venda rastreada** | E o critério NÃO é o grupo ter `sub_id` — ele nasce na ativação, sempre. Conta vínculo manual ou sub_id que trouxe pedido de verdade |
| 2026-09-05b | **Filtro de lista paginada filtra no SERVIDOR** | Sobre uma página de 50, filtrar no cliente daria "3 saídas" numa campanha com 300 — e o número pareceria um dado, não um artefato da paginação |
| 2026-09-05b | **Saída não exibe origem** | Origem é de onde a pessoa veio ao ENTRAR. "Saída · origem desconhecida" fazia parecer que o sistema perdeu informação que nunca existiu |
| 2026-09-05b | **Toggle de status tem DUAS posições — "arquivada" não entra** | Arquivar some da listagem e mata o link público: é destino, não estado de operação, e não pode ficar a um clique no cabeçalho. Fica na listagem, com confirmação |
| 2026-09-05b | **`truncate` no `Button` do shadcn não corta o filho** | O botão é um container flex; a classe precisa ir num `<span>` interno. Sem isso os chips de grupo com nome comprido vazavam e se sobrepunham |
| 2026-09-05 | **Número que muda de ESCOPO precisa dizer o escopo na tela** | A busca de Sub ID passou de "desde sempre" para 30 dias por desempenho. Sem o rótulo, a afiliada vê a comissão do sub_id cair e conclui que perdeu venda — mudança silenciosa de significado vira chamado |
| 2026-09-05 | **Link que a tela só EXIBE não se depura na tela** | "A página do grupo não funciona" era `FRONTEND_URL` do backend apontando para produção em homologação. A URL vem montada da API; o primeiro olhar é no valor que chegou, não no componente que o renderiza |
| 2026-09-04b | **A tela NÃO recalcula lotação — `cheio` e `teto` vêm prontos do backend** | Havia uma cópia em JS de `LEAST(capacidade, COALESCE(limite, capacidade))`. Estava certa, mas era a terceira cópia da mesma regra, e "linha amarela com o grupo ainda aberto" é exatamente o sintoma de a tela e o roteador divergirem |
| 2026-09-04b | **Filtro na aba Grupos não pode tocar o payload do PUT** | O `PUT /grupos` substitui o conjunto INTEIRO: mandar a lista filtrada apagaria da campanha todos os grupos escondidos pelo filtro. A lista visível carrega o índice real e as setas ficam desabilitadas fora do "Todos" |
| 2026-09-04b | **Ação em lote é rascunho, como as setas — nunca grava na hora** | Duas semânticas de salvamento na mesma tela é o pior desfecho: a afiliada perde a noção do que já foi persistido. E `cheio_override` teve que entrar na `assinatura()`, senão a mudança não acende o botão e some sem aviso |
| 2026-09-04b | **Erro do servidor que RECUSA a mudança precisa reverter a seleção local** | Depois do 409 de "número em uso" a tela ficava com o checkbox desmarcado, "Alterações não salvas" aceso e "1 grupo nesta campanha" embaixo — um estado que não existe em lugar nenhum e que se lê como "o bloqueio não funcionou" |
| 2026-09-04b | **Tirar um toggle da tela não basta quando o backend ainda lê a coluna** | Só apagar os switches PageView/Lead deixaria linha antiga com `false` continuando a apagar o evento em silêncio — o oposto do pedido. O backend passou a hardcodar os dois e a ignorar `pixel_eventos` |
| 2026-09-04b | **Card da listagem deixou de ser `<button>`** | O trigger do menu de três pontinhos é outro botão: botão dentro de botão é HTML inválido, e o clique borbulha para o `navigate`. `stopPropagation` não resolve o HTML |
| 2026-09-04b | **`CheckboxQuadrado` é wrapper, não edição de `components/ui/checkbox.tsx`** | `npx shadcn add checkbox` sobrescreve o arquivo sem aviso. E o defeito é do TEMA: `rounded-sm` = `calc(var(--radius) - 4px)` = 8px numa caixa de 16px, ou seja, um círculo — vale para os 15 usos do app, não só para o módulo de grupos |
| 2026-09-04b | **Prévia do link nasce COLAPSADA e vazia** | O link vai em anúncio, e ali o Meta usa a criativa dele, não a OG tag. Prévia é exceção — só importa quando o link também circula em conversa. Já configurada, abre expandida: quem voltou para ajustar o título não deve ter que redescobrir onde ele está |
| 2026-09-04b | **Aviso de cache do WhatsApp é nota de rodapé, não alerta** | Estava em `text-amber-500`, a MESMA cor de "Alterações não salvas" — lido como erro. É informação permanente sobre como o WhatsApp funciona, não algo que a afiliada fez de errado |
| 2026-09-04 | **Array montado inline no JSX do pai NÃO pode entrar nas deps de um efeito que reseta seleção** | `grupos={vinculos.map(...)}` é referência nova a cada render do pai; com ele nas deps, um toast expirando remarcava todos os grupos do modal de export por baixo da afiliada, e ela exportava 10 achando que exportava 3. A pré-seleção acontece na ABERTURA (ref de guarda), não a cada render |
| 2026-09-04 | **Modal que age sobre dado do servidor usa o estado SALVO, não o rascunho da tela** | O export lia `vinculos` (a lista com as edições ainda não salvas): grupo recém-adicionado não existe para o backend e o CSV voltava 422 dizendo que ele "não pertence a esta campanha" — verdade no banco, incompreensível para quem acabou de vê-lo na lista |
| 2026-09-04 | **Skeleton de tela inteira só na PRIMEIRA carga** | Trocar o período desmontava busca e chips junto com a lista: a barra de filtros sumia ~1s a cada clique e comparar 7d × 14d virava piscar de layout. Recarga posterior troca só o corpo |
| 2026-09-04 | **Refetch não sobrescreve seleção NÃO salva** | Trocar o período na aba Anúncios reescrevia os checkboxes com o que está no banco — justamente quando ela troca de janela para conferir o gasto ANTES de salvar. O flag de "sujo" vai por `ref` para não virar dependência do efeito de carga |
| 2026-09-04 | **Recurso secundário de um painel não entra no mesmo `Promise.all` do principal** | O link de entrada é um card do topo; um 502 nele derrubava a aba inteira para "Tentar novamente", escondendo KPIs e gráfico que já haviam chegado. Efeito próprio, falha isolada |
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
| Alta | **Projeto sem ErrorBoundary** | Qualquer throw em render derruba a árvore inteira e vira tela preta — foi o que amplificou o bug da tradução (08/09). O guard trata *aquela* causa, não a classe | Pendente — avaliar um boundary no `AppProviders` |
| Baixa | **Ações em massa em Meus Links** (checkbox por linha para desativar/excluir em lote) | Pedido no documento como "não entra agora"; a linha já tem o lugar reservado, com comentário | Pendente |
| ~~Baixa~~ | ~~**Meus Links validado só com API mockada**~~ | — | **Resolvido em 08/09** — passada com login real (`relacionamento@`) contra o `marketdash_app` local (banco hml): 200 em `/links` e `/links/1/insight`, busca/ordem/filtro/paginação e modal de insight OK nos 3 tamanhos. A conta de hml só tem **1 link**, então o comportamento com muitas linhas continua coberto pela passada mockada de 30 |
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
