---
name: "orquestrador-marketdash"
description: "Ponto de entrada do repositório frontend do MarketDash: dada uma demanda, decide o que ler, qual skill/agent acionar e em que ordem, e garante os passos finais obrigatórios de validação visual e atualização da memória do time (CONTEXTO/DIARIO/DECISOES) e do CHANGELOG. Use no INÍCIO de qualquer sessão de trabalho neste repo, quando a demanda for ampla ou ambígua, quando o usuário perguntar 'por onde começo', 'o que uso pra isso', 'me ajuda com X', ou quando a tarefa cruzar mais de uma área (tela + estado + API + backend). Use também ao FECHAR a tarefa."
---

# Orquestrador — MarketDash Frontend

Este repo carrega skills próprias. **Não reinvente contexto: acione a skill
certa e siga o que ela diz.**

## 1. Antes de qualquer coisa

Leia `.claude/memoria/CONTEXTO.md` — é o estado atual do repo. Ele tem
precedência sobre qualquer suposição sua e sobre docs mais antigos (inclusive
sobre o `CLAUDE.md`, que já está desatualizado em pelo menos um ponto: o
proxy do Vite aponta para a **8000**, não 8081).

Depois, se a demanda não estiver clara em **qual tela / qual plano libera /
de onde vem o número**, pergunte. Não assuma.

## 2. Roteamento por demanda

| A demanda é… | Leia antes | Acione |
|---|---|---|
| **Tela nova** | `.claude/rules/mobile-first.md` | `/new-page` → agent `frontend-react` |
| **Componente reutilizável** | `.claude/rules/component-standards.md` | `/new-component` → skill `design-system-mobile-marketdash` |
| **Layout, visual, "deixar premium"** | — | skill `design-system-mobile-marketdash` (+ `ui-shadcn-premium`) |
| **Dado que não chega / não atualiza** | `.claude/rules/data-fetching.md` | agent `state-stores` |
| **Número errado no dashboard** | — | skill `dashboard-kpis-marketdash` — o cálculo é **aqui**, não no backend |
| **Painel admin (MRR, clientes, uso, DRE)** | — | skill `admin-painel-marketdash` |
| **Menu sumiu / plano / limite** | `.claude/rules/planos-e-menus.md` | skill `planos-e-acesso-marketdash` |
| **Login, sessão, 401, logout inesperado** | — | skill `marketdash-frontend` §auth |
| **Integração (Facebook, Shopee, Instagram)** | — | skill `marketdash-frontend` §integrações |
| **Bug / algo quebrado** | `CHANGELOG.md` da raiz | skill `systematic-debugging` → skill do domínio |
| **Feature nova, ideia ainda vaga** | — | skill `brainstorming` → `writing-plans` |
| **Revisar antes de mergear** | — | agent `ui-reviewer` + skill `requesting-code-review` |
| **Validar o que foi feito** | — | `/validar-tela` → agent `playwright-validator` |
| **Fim da tarefa** | — | **§4 desta skill** |

Tarefa que cruza os dois repos: comece pelo **backend** (endpoint e schema) e
só então venha para cá — o contrário produz tela pronta esperando dado que
não existe.

## 3. Regras que valem sempre

1. **Componente nunca chama API direto** — `Component → store → service →
   fetchWithAuth`.
2. **Não edite `components/ui/`** — `shadcn add` sobrescreve.
3. **`fetchWithAuth` injeta `?user_id=user_N`** em toda request — endpoint
   novo do backend não pode usar esse nome de query param.
4. **Store hidrata da cache e revalida em background** (SWR), com chave
   escopada por usuário. Sem isso, celular e PC divergem.
5. **Mobile-first**: `ResponsiveModal`, `DataCard`, chips de filtro, bottom
   nav.
6. **Número à direita com `tabular-nums`** — inclusive rodapé e export.
7. **`-1` = ilimitado**; **`0` = o plano não tem** (mostrar "—", não "0/0").
8. **`isProductionHost()` compara host por igualdade exata** — nunca
   `.includes()`.
9. **Datas pelos helpers `*BR`** — os atalhos cortam no fim do dia anterior
   em Brasília.
10. **KPI é calculado aqui.** `get_kpis` do backend não alimenta o dashboard,
    e `cost`/`profit` de `dataset_rows_v2` estão mortos.
11. **Nunca inventar** nome de rota, store, service ou campo. Não sabe? Leia
    o código ou pergunte.

## 4. Passo final — OBRIGATÓRIO, nunca pular

<HARD-GATE>
Nenhuma tarefa está concluída antes disto. Se você entregou código e não fez
os 4 passos abaixo, a tarefa está pela metade.
</HARD-GATE>

1. **Verificar** — rode e mostre a saída, não afirme sem evidência:
   ```bash
   npx tsc -p tsconfig.app.json --noEmit && npm run lint && npm run build
   ```
   ⚠️ **`npx tsc --noEmit` na raiz não valida NADA** — o `tsconfig.json` tem
   `"files": []` e só referencia os projetos: ele sai 0 com erro de tipo em
   `src/`. Usar o comando errado aqui é pior do que não verificar, porque
   produz evidência falsa exatamente no passo que autoriza dizer "verificado".
   O repo tem **erros pré-existentes** nesse comando (25 em 04/09/2026): o
   critério é **"não aumentou"**, não "zero".
   E, se a mudança é visível, **valide na tela** com Playwright — mobile e
   desktop, em **todos** os pontos afetados (`/validar-tela`). Build verde
   não diz nada sobre layout, e este repo não tem suíte automatizada.

2. **Atualizar a memória do time** (`.claude/memoria/`):
   - `CONTEXTO.md` — mudou o estado do repo? **Sobrescreva** a seção afetada.
   - `DIARIO.md` — **sempre**. Data, o que mudou, **por quê**, o que ficou
     pendente. Append, nunca reescrever entrada antiga.
   - `DECISOES.md` — decisão de layout, trade-off, débito ou pendência?
     Registre com o motivo.

3. **Atualizar `CHANGELOG.md` da raiz** se a mudança é visível ao usuário —
   é o changelog único do monorepo, cobre backend e frontend juntos.

4. **Commit** com mensagem em português explicando **o porquê**, não só o
   quê. Formato `tipo(escopo): descrição`.

Ao final, diga ao usuário em uma linha o que foi atualizado — para ele poder
discordar.
