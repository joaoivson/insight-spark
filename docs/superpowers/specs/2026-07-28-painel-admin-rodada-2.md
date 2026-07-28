# Painel Admin — Correções Rodada 2

**Para:** João Ivson  
**De:** Luiz Fernando  
**Data:** 28/07/2026

Sobre a versão atual no ar. A rodada 1 corrigiu faturamento dobrado, próxima cobrança, semáforo, periodicidade PT, menu lateral, Despesas e DRE — tudo conferido e ok. Esta rodada fecha o que sobrou + melhorias.

Legenda: 🔴 bug (dado errado) · 🟡 melhoria.

---

## Cálculo / dados

### 🔴 1. Total pago AINDA está errado — usar `charges_completed`

O bug nº 1 da rodada 1 não foi corrigido de verdade. Evidências na tela atual:

- **Letícia:** mostra R$60,50, mas o `charges.completed` dela tem **3 cobranças** de R$60,50 (26/05, 25/06, 25/07) = **R$181,50**
- **Bruna:** mostra **R$0,00**, mas o webhook dela traz 1 cobrança paga de R$135,70 (28/04)

Causa provável: está somando só cobranças que chegaram via webhook **desde o deploy**. Mas o array `charges.completed` vem **completo em todo webhook** — traz o histórico inteiro da assinatura, incluindo cobranças anteriores ao deploy.

**Correção:** cobranças de uma assinatura = **união de todas as cobranças vistas em qualquer evento** daquela `subscription_id`, dedupe por `charge.order_id`, contando só `status: paid`. Total pago = soma dessa união.

Por que união e não "o último webhook": a ordem de chegada fica irrelevante, webhook repetido é inofensivo (dedupe), e se algum webhook vier com o array incompleto, as cobranças já vistas não somem — a união só acrescenta. Uma regra, sem caso especial por tipo de evento.

Isso vale também pro faturamento histórico: o array é nosso backfill de graça — cobranças de antes do deploy entram nos meses delas no faturamento mês a mês e no DRE. (Reembolso é tratado pela via própria que já existe: `refunded_at` abate na data do reembolso.)

**Aceite:** Letícia = R$181,50 · Bruna = R$135,70.

### 🔴 2. Status "Atrasado" — webhook `subscription_late` (caso real da Bruna)

Chegou o primeiro `subscription_late`: `order_status: refused`, `card_rejection_reason: refused_bank`, `status: waiting_payment`, `access_until` já vencido. E na lista ela aparece **"ativo"**, igual à Letícia — sendo situações opostas.

**Correções:**

- **Novo estado de exibição "Atrasado"** (badge amarela): quando o último evento da assinatura for `subscription_late` / status `waiting_payment`. Nem "Ativo" nem churn.
- **Churn só quando a Kiwify desistir:** enquanto está em retry de cobrança, é "Atrasado". Vira churn quando chegar `canceled` ou o acesso for cortado definitivo.
- **Gravar `card_rejection_reason`** (campo novo na tabela, vem em `order.card_rejection_reason`) e **mostrar na ficha da cliente**: "Recusa do banco" muda a conversa no WhatsApp.
- **Contagem "Assinantes ativos":** atrasada com acesso ainda vigente conta como ativa; com acesso vencido (caso da Bruna agora), sai da contagem mas fica como "Atrasado" na lista — não é cancelamento ainda.
- `subscription_late` **não movimenta faturamento** (`approved_date: null`, `refused`) — a regra da cobrança única já cobre, mas fica como teste de aceite.

Obs: nesse payload o `charge_amount` (15738) ≠ `product_base_price` (14700) por acréscimo de parcelamento em 3x. Mais um motivo pra todo cálculo usar os valores do `charges_completed`, não o `charge_amount` do webhook.

### 🔴 3. Gráfico MRR inventando passado

A linha mostra ~R$105 desde 2025-09, mas o histórico começou semana passada — está projetando o MRR atual pra trás. E a queda no fim é o mês corrente parcial.

**Correção:** a série do MRR só mostra **meses com histórico real** (primeiro mês = mês do primeiro evento gravado). Igual já está no gráfico de faturamento, que ficou certo. Sem projeção retroativa, sem ponto do mês parcial destoando.

### 🔴 4. Média de logins errada

"9.0/dia" com 9 logins em 30 dias. Correto: **0,3/dia** (total ÷ 30).

### 🔴 5. Capitalização

"pro · Mensal" na tabela plano × periodicidade → **"Pro · Mensal"**. Conferir em todo lugar que extrai o plano do `plan_name`.

---

## Estrutura de telas

### 🟡 6. Fundir "Uso" e "Sincronizações" em UMA tela

Sync hoje mora em dois lugares e a tela Uso virou rolagem infinita (logins lá embaixo, quase invisíveis). Fundir:

**Tela única "Sincronizações"** (substitui as duas no menu), com **2 abas**:

**Aba 1 — Syncs** (padrão):
1. Cards de saúde Shopee / Meta (última sync, status, chamadas 24h, erros 24h) — como está na Uso hoje
2. Visão da madrugada por conta (22 sucesso / 3 falha / 2 sem execução) — como está na Sincronizações hoje
3. Execuções recentes + erros (a tabela com filtros que já existe)
4. Gráfico de chamadas por dia (30d)

**Aba 2 — Uso da plataforma**:
1. Logins (card + gráfico, ver item 7)
2. Telas mais acessadas

Menu final: **Dashboard · Clientes · Sincronizações · Despesas · DRE**. Some a rolagem, cada aba responde uma pergunta.

### 🟡 7. Logins: sparkline de verdade

A "sparkline" virou de novo uma barra azul gigante (1 dia com login = barra ocupando tudo).

**Especificação fechada:** gráfico de **linha fina**, 30 pontos (um por dia, dias sem login = 0), altura máxima **60px**, sem preenchimento, cor azul `#318CE9`. Nunca barras. Card ao lado: total 30d + média/dia (corrigida, item 4) + último acesso.

---

## Visual

### 🟡 8. Header do sidebar (está feio)

"MarketDash / Admin MarketDash" duplicado e espremido. Trocar por:

```
[símbolo]  MarketDash        ← wordmark, Space Grotesk 700, uma linha
PAINEL INTERNO               ← label pequeno, JetBrains Mono, cor secundária
```

Sem repetir o nome. Respiro (padding) maior. "Voltar ao app" continua no rodapé do sidebar.

### 🟡 9. DRE — só meses com movimento

A lista lateral mostra 2025-08 até hoje, quase tudo vazio. Listar **só meses com receita ou despesa**. E o "MoM resultado: R$60,50" solto no topo confunde — virar linha **"vs mês anterior"** no fim da demonstração, ou remover.

---

## Aproveitando: os erros que o painel revelou

Não é correção do painel — é o painel funcionando. Nos 215 erros Shopee/24h tem dois tipos:

- `error [10000] System Error` → instabilidade da API Shopee, ok, é retry
- **`cannot unpack non-iterable int object`** → isso é bug **no nosso código Python**, não da Shopee. Olhar esse.

---

## Testes de aceite

1. Total pago: Letícia **R$181,50** · Bruna **R$135,70**.
2. Faturamento mês a mês inclui cobranças do `charges_completed` anteriores ao deploy, nos meses delas (abril mostra a cobrança da Bruna).
3. Bruna aparece **"Atrasado"** (badge amarela), não "ativo"; ficha mostra "Recusa: banco emissor" (`refused_bank`).
4. Bruna (acesso vencido + late) sai da contagem de ativos mas **não** conta churn; churn só se vier `canceled`.
5. `subscription_late` não altera faturamento.
6. Gráfico MRR começa no primeiro mês com evento gravado; nada antes.
7. Logins: "0,3/dia"; linha fina ≤60px, 30 pontos.
8. Menu tem 5 itens; Sincronizações com 2 abas; logins visíveis sem rolagem na aba Uso.
9. "Pro · Mensal" capitalizado.
10. DRE lista só meses com movimento.
11. Nada quebrado: sync Shopee/Meta, OAuth, pausar/ativar, orçamento — conferir após deploy.
