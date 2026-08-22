# Spec — Painel Admin Correções Rodada 3

**Para:** João Ivson  
**De:** Luiz Fernando  
**Data:** 29/07/2026

Rodada 2 conferida. Esta rodada fecha o que sobrou.

## 1. Gráfico MRR vazio

Série deve mostrar **todos os meses com histórico real**, do primeiro mês com evento até o **atual** (inclui mês corrente). Hoje = 1 ponto (julho, R$60,50).

## 2. Faturamento sem backfill

Gráfico "Faturamento líquido — 12 meses" deve ler a mesma fonte do DRE (`charges_completed` por data da cobrança). Esperado: abr R$135,70 · mai R$60,50 · jun R$60,50 · jul R$60,50.

## 3. Bruto definitivo

- Webhook com `charge_amount` + `kiwify_fee` → bruto/taxa reais **quando charge_amount = preço base**  
- Histórico só com líquido → **bruto = preço de tabela** · **taxa = bruto − líquido**  
- Acréscimo de parcelamento **não** entra no bruto

| Plano | Mensal | Trimestral | Anual |
|---|---|---|---|
| Essencial | R$ 47 | R$ 117 | R$ 327 |
| Pro | R$ 67 | R$ 147 | R$ 447 |

Aceite: DRE abril → bruta R$147,00 · taxa R$11,30 · líquida R$135,70. Card julho → líquido R$60,50 · bruto R$67,00.

## 4. Remover faixa de alerta do Dashboard

Tirar a faixa amarela inteira. Filtros em Clientes permanecem.

## 5. Label Assinantes ativos

Terceiro plano é **Max**, não Pro.

## 6. Telas mais acessadas (30d)

Título: **"Telas mais acessadas (30d)"** (backend já usa 30d).

## 7. DRE Failed to fetch

Investigar causa + mensagem amigável + botão "Tentar novamente". Nunca erro cru.

## 8. Último acesso (não autenticação)

1 registro/usuário/dia em `user_logins` no carregamento autenticado. Renomear coluna para **"Último acesso"**.

## Aceite (checklist)

1. MRR gráfico: julho R$60,50  
2. Faturamento: abr/mai/jun/jul corretos  
3. DRE abril: 147 / 11,30 / 135,70  
4. Card faturamento julho: líquido 60,50 · bruto 67,00  
5. Sem faixa de alerta  
6. Essencial · Pro · Max  
7. Título (30d)  
8. DRE erro amigável + retry  
9. Último acesso atualiza sem relogar  
10. Sync/OAuth/pause/budget intactos  
