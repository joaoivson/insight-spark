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
