# Diário — MarketDash Frontend

> **Append-only. Entrada nova no topo.** Nunca reescreva entrada antiga — se
> estava errada, escreva uma nova dizendo que estava errada e por quê.
>
> Formato: `## AAAA-MM-DD — título curto` · o que mudou · **por quê** · o que
> ficou pendente. O "por quê" é a parte que o `git log` não dá.
>
> Mudança visível ao usuário também entra no `CHANGELOG.md` da raiz. Aqui vai
> o raciocínio; lá, o fato.

---

## 2026-09-04 — Configurações, rodada 2: Parâmetros ganha tela, o gate vira flag e a isca de autofill

O que mudou: quinta seção **Operação › Parâmetros** (o `EnvioSection` saiu de
dentro do WhatsApp); WhatsApp e `NumeroDetalhe` perderam as `Tabs` de uma aba
só; `TabelaDeGrupos` paginada com filtro Ativos/Todos; `ConectarNumeroModal`
com QR **ou** código de pareamento; `RequireModulo` + `moduloLiberado()` no
lugar de `isProductionHost()`; `SecaoCard` reapertado e adotado pelo card de
Marketplaces.

**Por que Parâmetros saiu do WhatsApp.** Janela de envio não é configuração de
canal — ela limita a operação inteira, inclusive campanha que ainda nem existe.
Como aba de WhatsApp, ficava invisível justamente para quem entra pelo módulo
de Campanhas e nunca abre a tela do chip. E a aba que sobrou ("Números",
sozinha) era moldura sem quadro; sai também, aqui e na página do número.

**Por que o gate deixou de ser hostname.** `isProductionHost()` é build-time:
liberar o módulo para uma conta de teste em produção pedia rebuild + redeploy,
e a spec pedia beta sem redeploy. A decisão foi para o backend, por conta, e a
env `MODULOS_BETA` virou a alavanca de produção. Duas consequências que valem
lembrar: o gate **fecha por padrão** (contexto carregando, backend antigo,
chave ausente → invisível — o default oposto abriria o módulo para a base
inteira por um typo no JSON), e as rotas do módulo **existem sempre**, porque
`{cond && <Route/>}` fazia link direto cair em 404 por uma fração de segundo
antes de a rota passar a existir. O preço aceito é o menu piscar uma vez por
carregamento de página.

**A isca de autofill.** A rodada de 03/09 achou que `autocomplete="off"` +
ids neutros resolviam o Chrome preenchendo o App ID da Shopee com o e-mail de
login. Não resolveram: o Chrome **ignora** `autocomplete="off"` quando decide
que o formulário é de login, e preenche o primeiro par usuário/senha que acha.
Só cedeu com nomes que não casam com heurística nenhuma
(`ref_publica`/`ref_secreta`) **mais** um par `username`/`password` invisível
abrindo o formulário para absorver o preenchimento.

**Desambiguar grupo homônimo é pelo JID, não pela data.** `criado_em` é a data
do primeiro sync — igual para grupos que entram juntos, que é exatamente o caso
(dois `#130 SALESDASH + VENDE-C`). E o fragmento só entra na linha **onde o
nome se repete**: em 493 grupos, sempre seria ruído.

**Densidade medida, não estimada.** O critério ("os 7 dias cabem sem scroll")
falhava por 57px em 1280×720. Foram quatro cortes somados — `py-1` na linha do
dia, `space-y-1` entre elas, `mb-2.5` no header do card e padding único
`p-3.5` (o `md:p-4` fazia mobile e desktop terem densidades diferentes). Fecha
em 720/720 e 768/768.

**O badge de sync atrasada achou a causa no mesmo dia.** Ele mostrou
"Sincronização parada há 14 dias" e o número não fechava: no banco, 19 contas
tinham `last_sync_at` cravado em 05/08 — os 24 jobs `shopee-sync-*` do pg_cron
estavam `active = false` desde então, **29 dias**. As duas contas com data
recente (entre elas a de teste) tinham rodado sync **manual**, e era isso que a
tela media. Produção foi religada em 04/09.

A lição é de leitura de tela, não de código: **`last_sync_at` da conta que você
usa para testar mede o seu próprio clique em "Sincronizar agora", não a
automação.** O badge continua valendo — ele foi o que fez alguém olhar — mas
quem responde "o cron vive?" é `sync_runs.trigger`.

---

## 2026-09-03 — Configurações: 4 seções, grupos com toggle e o upgrade de período que não abria

O que mudou: `Configuracoes.tsx` reescrito (4 seções, sem "Dispositivos" nem
"Canais"; WhatsApp virou integração com abas Números/Envio); `SecaoCard` como
régua única de densidade; grid de números + página nova
`/dashboard/configuracoes/numeros/:id`; `TabelaDeGrupos` com toggle Ativo;
modal de seleção de contas do Facebook com carga lazy; Instagram enxuto com
modal de passos; contador de uso na Assinatura; `PlanosPage` comparando plano +
periodicidade. Saíram `BlacklistSection`, `WhatsappResumoSettings`,
`GruposDoDispositivo` e `whatsapp.service.ts`.

**Isto reverte parte da entrada de 2026-08-31 ("um card por número, com os
grupos dentro") — e a razão é volume, não gosto.** Aquele desenho resolvia o
problema certo (cruzar duas listas com o dedo para saber o que um chip fazia),
mas assumia uma quantidade de grupos que não é a real: ao conectar o WhatsApp
pessoal, o sync traz *tudo* — 492 grupos no teste, dos quais talvez 6 são de
trabalho. Lista inline dentro do card, nesse volume, é inutilizável. O card
compacto passa a responder só "este chip está de pé?" e o detalhe do número
responde "o que ele faz". As duas armadilhas daquela entrada continuam
valendo e foram preservadas: o bucket **"Grupos sem dispositivo ativo"** (órfão
de soft-delete não pode sumir da tela) e o vínculo N:N. O que morreu foi o
marcador **"também em: X"** — junto com a coluna "Envio", ambas sempre vazias
para a usuária e sem significado que ela pudesse usar.

**Densidade em um arquivo, não em sete.** O pedido era "fonte e padding grandes
demais", e a armadilha óbvia era ajustar tela a tela e desalinhar as abas entre
si. Por isso `SecaoCard`: a régua é uma só, e o critério de aceite (os 7 dias
da semana cabendo em 1366×768 com o footer fixo) foi medido por screenshot, não
por impressão.

**O bug que mais custava dinheiro era de uma linha.** `isCurrent: id ===
currentPlan` ignorava a periodicidade: quem estava no Max Mensal via o card Max
desabilitado nas abas Trimestral e Anual e simplesmente não tinha como fazer
upgrade de período. Aconteceu com aluna real. Agora casa plano + período, e o
mesmo plano em outro período fica habilitado como "Mudar para trimestral".

**Duas coisas que a validação por screenshot pegou e o `tsc` não:** o rótulo do
dia cortado ("Don" em vez de "Dom" — o Switch comia o `w-16`), e a navegação
lateral travando em "Facebook Ads" para sempre depois do OAuth. Essa segunda é
sutil: o componente do Facebook limpa a URL com `history.replaceState`, que
**não avisa o React Router** — o `?code` continuava nos `searchParams` em
memória e tinha precedência sobre o `?tab`. Agora `tab` explícito vence.

Pendências: contas do Facebook selecionadas antes desta rodada não têm nome
gravado no backend e aparecem pelo id até a afiliada re-salvar a seleção no
modal. A página do número renderiza os 493 grupos de uma vez (~29k px de
altura) — funciona e tem busca, mas paginação/virtualização é o próximo passo
natural se o volume incomodar.

---

## 2026-09-02 — Rodada 9 (item 3): gráfico Novas × canceladas + labels de periodicidade

O que mudou: `trimLeadingNoMovement` corta os meses sem movimento do início
da série do gráfico Novas × canceladas (AdminDashboard.tsx) — clone
estrutural do `trimLeadingEmpty` que o MRR/Faturamento já usavam; o BarChart
ganhou `margin={CHART_MARGIN}`, que era o ÚNICO dos gráficos do admin sem
ele — por isso o label "31"/"32" da maior barra cortava no topo.
`translateFrequency` (admin-panel.service.ts) aprendeu "annually"/"quarter".

Por quê assim: a folga do label não foi resolvida com domain/YAxis custom
porque o codebase já tem a solução canônica (CHART_MARGIN, criado na Rodada 7
exatamente para label cortado) — faltava aplicar aqui. O corte de meses ficou
no frontend, e não no backend, porque é o mesmo padrão dos cards vizinhos e
não muda a API para outros consumidores. O "annually" cru vem do banco (o
recorder guarda o rótulo da Kiwify só lowercased); o backend normaliza o
cálculo, mas a coluna Periodicidade da tabela de clientes renderiza o valor
cru — sem a entrada nova o rótulo apareceria em inglês (caso real: João
Victor e Alice, as duas anuais "annually" de produção).

Pendente: nada. Validação visual feita com interceptação de rotas no
Playwright (supabase.co estava inalcançável da máquina — ver memória global).

---

## 2026-08-31 — Dispositivos: um card por número, com os grupos dentro

`NumerosSection.tsx` (555 linhas) misturava casca, lista de números, tabela de
grupos e quatro modais. Virou orquestrador; nasceram `DispositivoCard`,
`GruposDoDispositivo` e `GerenciarDispositivoModal`.

**A mudança de fundo não é visual.** Antes: uma lista de números e, embaixo,
uma tabela com os grupos de *todos* eles juntos, com uma coluna "Dispositivo"
que só dizia o nome. Para responder "o que este chip aqui está fazendo?", a
afiliada cruzava as duas listas com o dedo. Agora cada número carrega os
próprios grupos dentro de um bloco expansível.

**Três armadilhas que o layout tinha que resolver:**

1. **O mesmo grupo aparece em dois blocos** quando dois chips estão nele. Isso
   é o desenho (vínculo N:N, o motor faz failover entre eles), não bug — mas
   sem o marcador **"também em: X"** parece bug. Sinalizado só quando
   `instancia_ids.length > 1`.
2. **Grupo órfão sumiria da tela.** Remover número é soft-delete e o vínculo
   histórico fica no banco. Daí o bucket "Grupos sem dispositivo ativo" no
   fim — sem ele, remover um chip apagaria grupos da tela sem explicação.
3. **Os dois vazios pedem ações diferentes** (a lição de 26/08 registrada no
   DIARIO do backend): *conectado e sem grupos* → "use Sincronizar"; *não
   conectado* → "conecte este número". Mandar conectar quem já está conectado
   foi o que fez parecer que a conexão não tinha sido reconhecida.

**Pausado ≠ desconectado.** O badge de status continua "Conectado" e a pausa é
um segundo badge âmbar + card apagado. São eixos independentes no backend
(ver DIARIO de lá, mesma data) e a tela não pode fundi-los.

**O toggle é otimista.** `definirPausa` atualiza o array local, chama, e
reverte em erro. Sem isso o switch fica preso até o round-trip e a afiliada
clica de novo achando que não pegou. `criar`/`remover`/`sincronizar` seguem só
re-fetchando — lento demais só para um switch.

**Achado na validação visual (390px).** O cabeçalho usava `truncate` e o badge
"Envio pausado" disputava a linha: o status virava **"Conect…"** — o dado mais
importante do card cortado por causa do secundário. Virou `flex-wrap` +
`whitespace-nowrap`. Só apareceu no screenshot; `tsc` e lint passavam verdes.

**Gotcha de ambiente para a próxima validação.** O app do docker-compose local
aponta `WAHA_URL` para o WAHA de **homologação** (hostname interno do Coolify,
inalcançável da máquina) — criar número local devolve 502 `motivo="rede"`,
mesmo com o container `waha` do perfil `whatsapp` de pé. Os ramos que exigem
número novo (QR, card desconectado) foram validados com `page.route`
interceptando `/instancias` e `/grupos`: app real, CSS real, zero escrita no
banco compartilhado.

---

## 2026-08-27 — Rodada mobile/tablet: auditoria por screenshot e correção geral

Relato de que o app estava "totalmente quebrado" no celular e no tablet.
Auditoria visual das 25 rotas (aluna + admin) em 390×844, 820×1180 e 1440×900,
com `mobile-audit.mjs` medindo overflow e erros de console. **Elementos
passando da borda: mobile 51 → 14, tablet 32 → 0, desktop 0 → 0.** Os 14 que
sobram são a nav rolável do admin (a aba fora da vista é o próprio scroll) e
dois blobs decorativos clipados na Captura.

**A causa-raiz que amplificava todo o resto** estava no shell: o container do
conteúdo em `DashboardLayout` não tinha `min-w-0`. Filho de flex não encolhe
abaixo do conteúdo, então os `overflow-x-auto` internos nunca ativavam e o
`overflow-hidden` do próprio shell cortava a tabela **em silêncio** — sem
scroll, sem aviso. Foi por isso que a sonda de overflow do documento vinha
"0px" com a tela visivelmente cortada; a sonda passou a medir
`max(html, body).scrollWidth`.

O que mais quebrava, por tela:

- **Ofertas** abria em duas colunas no celular com um card desenhado para a
  linha inteira: sobravam ~29px e nome, preço e comissão saíam cortados. Entre
  640 e 1023px eram três colunas de 153px e o botão de abrir na loja vazava —
  virou 1 coluna no celular e 2 no tablet.
- **Editor de automação**: barra de ações em `bottom-0 z-20` contra a bottom
  nav em `z-40` — "Publicar automação" era literalmente inalcançável no
  celular. O `RoteiroEditor` já tinha resolvido isso e serviu de modelo.
- **Painel admin** não tinha estratégia mobile nenhuma: a tabela de uso da
  plataforma era cortada em 329px, os filtros de largura fixa somavam mais que
  a tela e os rótulos longos do DRE empurravam os valores para fora.
- **Envio rápido de oferta**: colunas de grid sem `min-w-0` faziam o conteúdo
  ter 749px dentro de um drawer de 390px. **Só apareceu na validação
  interativa** — o script que fotografa rotas paradas não abre modal.
- **Meus Links** não passava `title` ao layout (h1 vazio no header) e repetia o
  padding do `main`, perdendo 56px dos 390px.

**Por quê assim.** O shell veio primeiro de propósito: mudar a base depois
obrigaria a revalidar tudo de novo. O menu lateral mobile foi **removido**, não
consertado — ele não tinha gatilho nenhum (o header recebia
`onMobileMenuToggle` e nunca renderizou o hambúrguer), e a navegação mobile
do produto é a bottom nav.

**Pendente:**

- `SubscriptionPlanModal` continua com `Dialog` cru (`max-w-4xl`, gate de
  assinatura) — a margem lateral da base já resolve o pior; migrar para
  `ResponsiveModal` fica para uma rodada com mais folga de teste.
- `CategoryBarChart` e `ChannelPieChart` cortam rótulo no celular, mas só a
  `/demo` os usa (fora do escopo desta rodada). O padrão a copiar é o
  `overflow-x-auto -mx-2 px-2` do `EvolutionBarChart`.
- `AdSpends.tsx` (41KB) segue órfão, sem rota — não foi auditado.
- Um `ProxyPoolTab.tsx` untracked (feature de proxy pool, com service e store
  próprios) entrou por engano num `git add` de diretório e foi retirado do
  commit. **Continua untracked** e fora desta rodada.

## 2026-08-25 — Grupos F2: menu compartilhado, Anúncios×Campanhas, lista+detalhe

O débito da F0 foi quitado: `shared/config/dashboard-menu.ts` é a fonte única
dos itens de menu (sidebar consome a lista inteira; bottom nav deriva as 4 tabs
por `menuKey` e joga o resto no "Mais"). O gate de produção virou `hmlOnly` na
config + `menuVisivel()` — item novo hml-only não toca mais em 4 lugares. A
config ganhou `shortLabel` fora do combinado ("Início"/"Links"): o bottom nav
tinha rótulos próprios e encurtá-los na config quebraria a sidebar.

O rename é só de rótulo: "Campanhas" (tráfego pago) virou **"Anúncios"** (mesmo
path/menuKey `campanhas`, textos internos ficam pra F7); o novo item
**"Campanhas"** é o módulo de grupos (`/dashboard/grupos`, menuKey
`campanhas_grupos`, MAX-only, hml-only). Lista + detalhe (Visão geral/Grupos)
no molde de Automacoes/NumerosSection. A aba Grupos acumula ordem/aberto/remoção
localmente e um "Salvar ordem" único faz o PUT com a lista completa — o "sujo"
é a assinatura `grupo_id:aberto` na ordem, espelho exato do que o PUT persiste.
Posição enviada é o índice 0-based (backend só ordena, não interpreta o valor).

Validação visual: hml sem grupos sincronizados no relacionamento@ — os fluxos
de linha (reordenar/fechar/remover) foram validados com `page.route` mockando
`/whatsapp/grupos` (sem sujar o banco); campanha real "Campanha de validação
F2" criada via UI em hml para o resto. Gotcha do Playwright: `storage_state`
do Supabase morre na 2ª sessão (rotação de refresh token) — logar de novo.

---

## 2026-08-25 — Grupos F1: seção Números (WAHA) em Configurações

Seção nova no grupo WHATSAPP (hml-only) com o fluxo conectar→QR→sincronizar.
Decisões locais: polling do QR em 5s (pareamento é interativo; os 20s do admin
são para tela parada), "Sincronizar grupos" só aparece com instância
conectada (evita o 409 previsível), e o limite do plano vem de
`context.limites_whatsapp_numeros` com fallback no catálogo espelhado —
`PlanContext` tipado não foi alterado (cast local), pendência aceitável até a
F2 mexer no plan.service. Validação E2E contra WAHA real local.

---

## 2026-08-25 — Grupos WhatsApp F0: menu compacto, Configurações em sub-nav, gating no mobile

Fase 0 do módulo de grupos (plano em `~/.claude/plans/claudinho-sobre-a-implementa-o-robust-reef.md`).
Três raciocínios que o diff não conta:

**Seção de Configurações deriva da URL, não de useState.** A primeira versão
usava estado local seedado do `?tab=` só no mount — funcionava até alguém
navegar para `?tab=...` com o componente já montado (nada remonta, nada muda),
e o Back físico do Android saía da página em vez de voltar à lista no mobile.
Derivar de `useSearchParams` resolveu os dois de graça: push no mobile (Back
volta à lista), replace no desktop (Back sai da página, como as Tabs antigas).

**Cadeado só com `context != null`.** O planStore cai para "essencial" antes
do fetch E depois de falha — mostrar cadeado nesses estados trava assinante
pagante no modal de upgrade. Como TODA rota paga tem `RequirePlan`, o cadeado
do menu é cosmético; liberar o clique na janela de load é seguro. Vale para os
dois navs.

**`useIsMobile` agora é síncrono no primeiro render.** `useState(undefined)`
fazia todo primeiro render ser "desktop"; com a Configurações renderizando
árvores diferentes por viewport, isso virou flash + efeitos de rede duplicados
(retorno OAuth do Facebook montava 2×). Corrigido no hook compartilhado —
beneficia ResponsiveModal e afins também.

**Pendente/anotado para F2**: sidebar e MobileBottomNav duplicam a lista de
itens + gate de produção (4 lugares com `isProductionHost()` para automacoes);
quando a F2 mexer no menu, extrair config compartilhada
(`shared/config/dashboard-menu.ts`) e considerar `feature-flags.json`.

---

## 2026-08-21 — Instagram Rodada 2: Card 4 em três campos, botão e emoji

O direct passou a sair como **template `button`** da Meta. Na tela isso virou
três campos no Card 4: Mensagem (só texto), Link (o "Inserir link" saiu de baixo
da mensagem e agora preenche ESTE campo, em vez de emendar a URL no fim do
texto) e Texto do botão (limite 20, com contador).

O preview do Direct renderiza o botão **sob a mesma condição do backend** — só
com link E título. Se a tela mostrasse o botão só por ter link, prometeria algo
que o envio não manda.

**Emoji sem biblioteca.** Seletor no Card 3 (entra na última variação, que é a
que a aluna acabou de escrever) e no Card 4. Uma lib de emoji custa centenas de
KB no bundle de uma tela que a aluna abre pelo celular, e o conjunto que aparece
numa mensagem de afiliado é pequeno e previsível — lista curta escolhida a dedo
em `components/shared/EmojiPicker.tsx`.

Alinhamento pedido pelo Luiz: seletor de emoji e contador de caracteres na mesma
linha de base (medido no browser: 0px entre os centros).

**Achado de infra:** o disparo de deploy do frontend era
`curl ... || echo "Deployment triggered"`, com o passo seguinte imprimindo
sucesso incondicional — o MESMO defeito que deixou o worker Celery com código de
semanas atrás, corrigido no backend em 03/08 e nunca aqui, nos dois workflows.
Agora usa o `trigger-deploy.sh` do backend, que confere o HTTP e falha alto.

## 2026-08-20 — Instagram Rodada 1 + menu numa linha

Ajustes depois da validação do Luiz em hml. Nenhum era bug de backend.

- **Card 1**: "Próxima publicação" removida (escopo `proximo` saiu também do
  backend). A grade renderizava a conta inteira — 224 posts na conta de teste —
  e empurrava os cards 2, 3 e 4 para fora da tela: a aluna nem descobria que
  existiam. Virou uma fileira de 4 + modal com **busca por legenda**, que carrega
  as páginas restantes ao abrir (filtrar só o que já paginou não acharia o post
  procurado, que costuma estar no fim).
- **Card 3**: um campo por variação. Uma variação por linha num textarea era
  frágil — enter duplo criava variação vazia, colar texto multilinha bagunçava.
- **Configurações**: a palavra "Integração" repetida em três abas estourava a
  régua e virava scroll horizontal; saiu. O caminho do passo 2 apontava para um
  menu que **não existe** nas versões atuais do app — corrigido para o verificado
  no iOS. É o passo que mais gera chamado.
- **Achado nosso**: automação **já ativa** não ganhava o selo "Aguardando
  conexão" quando o webhook caía — continuava dizendo "Ativa" sem disparar nada.

Antes disso, no mesmo dia: "Automação Instagram" quebrava em duas linhas no menu
(o rótulo pedia 168px e o item tinha 144px; sidebar foi para `w-72`), e o modal
de upgrade dizia "plano Pro" para um item que é **exclusivo do Max** — quem
seguisse o modal fazia o upgrade errado.

---

## 2026-08-19 — Memória do time criada neste repo

Criada a estrutura `.claude/` (agents, commands, memoria, rules, skills,
settings) espelhando o padrão já em uso no monorepo vizinho.

**Por quê.** O contexto do frontend vinha vivendo em três lugares que não se
falam: `CLAUDE.md` (convenção), `CHANGELOG.md` da raiz (o que mudou) e a
memória pessoal do assistente (o porquê). O terceiro não é compartilhável e
não sobrevive à troca de máquina ou de pessoa — decisão cara como "o corte de
período é em BRT, não UTC" ficava fora do repo.

`CONTEXTO.md`, `DECISOES.md` e este diário foram semeados por inspeção do
código, do `CHANGELOG.md` e do `git log` de `develop` — **não** por relato.
Onde a seção divergir do código, o código vence.

**Divergências encontradas ao semear** (viraram pendência em `DECISOES.md`):

- `CLAUDE.md` diz que o proxy do Vite aponta para **8081**; o
  `vite.config.ts` aponta para **8000**, que é a porta que o
  `docker-compose.yml` do backend expõe. Quem segue o doc não conecta.
- Dois `vite.config.ts.timestamp-*.mjs` versionados na raiz (artefato
  temporário do Vite).
- O botão "Atualizar" do header continua na tela sem fazer nada desde a
  migração dos stores para stale-while-revalidate.

**Pendente:** nenhuma tela foi revalidada por screenshot nesta passagem — o
`CONTEXTO.md` descreve o código, não o que está renderizando em produção.

---
