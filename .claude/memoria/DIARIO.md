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
