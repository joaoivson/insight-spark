# Memória do time — Frontend

Três arquivos, três funções distintas. **Se você não souber em qual escrever,
a resposta está aqui** — a maior causa de morte desse tipo de documentação é
os arquivos virarem cópias uns dos outros.

| Arquivo | O que é | Como se escreve | Quando ler |
|---|---|---|---|
| `CONTEXTO.md` | **Estado atual.** Onde o repo está agora: o que está pronto, o que está em voo, o que está quebrado, o que depende de terceiro. | **Sobrescreve.** A seção antiga sai, a nova entra. Não tem histórico — histórico é o DIARIO. | **Sempre, no começo da sessão.** Tem precedência sobre docs mais antigos. |
| `DIARIO.md` | **Histórico.** O que mudou, quando e por quê. Mais rico que `git log`: registra o motivo e o que ficou pendente. | **Append-only.** Entrada nova no topo. **Nunca** reescreva entrada antiga — se estava errada, corrija numa entrada nova dizendo que estava errada. | Ao investigar "por que essa tela está assim?" ou "quando isso quebrou?". |
| `DECISOES.md` | **Decisões de UI/arquitetura, pendências e débitos técnicos** deste repo, com o motivo. | Adiciona linha; atualiza status de pendência. Decisão revogada não some — vira linha nova dizendo que revogou a anterior. | Antes de propor mudança estrutural ou de layout — pode já ter sido decidido e descartado. |

Mudança **cross-stack** (a maioria aqui é) tem changelog único na raiz do
monorepo: `../../CHANGELOG.md`. A memória daqui registra o **porquê** que não
cabe no changelog.

## A regra que mantém isso vivo

A skill `orquestrador-marketdash` (§4) trata a atualização destes arquivos
como **parte da tarefa**, não como algo opcional no fim. Tarefa entregue sem
isso está pela metade: o próximo dev — ou o próximo chat — reconstrói
contexto do zero e repete erro já resolvido.

## O que NÃO vai aqui

- O que o código já diz (estrutura de pastas, props de componente).
- O que o `git log` já diz sozinho ("renomeei X pra Y").
- Convenção permanente de UI → `CLAUDE.md` / `.claude/rules/`.
- Regra de negócio de cálculo → skill `dashboard-kpis-marketdash`.
- Segredo, chave de API, token. **Nunca** — e lembre que tudo em `VITE_*`
  vai para o bundle e é **público**.
