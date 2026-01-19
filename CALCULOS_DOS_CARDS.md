# Explicação dos Cálculos dos Cards do Dashboard

## 📊 Visão Geral

Os 5 cards do dashboard calculam valores a partir das linhas filtradas (`filteredRows`) e dos gastos de anúncios (`adSpends`). Cada linha representa uma transação do CSV e contém dados no campo `raw_data` (dados brutos do CSV) e campos processados (como `revenue`, `commission`, etc.).

---

## 🔢 Card 1: Faturamento (Pend. + Concl.)

**Fórmula:** `SOMA de todas as linhas filtradas do valor de faturamento`

### Como é calculado:

```typescript
const faturamento = rowsOk.reduce((acc, r) => acc + getFaturamento(r), 0);
```

### Função `getFaturamento(row)`:
1. **Primeiro tenta:** `raw_data["Valor de Compra(R$)"]`
2. **Se não encontrar:** usa `row.revenue` (campo processado)

**Ordem de prioridade:**
1. `raw_data["Valor de Compra(R$)"]` (preferencial, vem direto do CSV)
2. `row.revenue` (fallback, campo processado)

**Exemplo:**
- Linha 1: `raw_data["Valor de Compra(R$)"] = 39.90` → **39.90**
- Linha 2: sem `Valor de Compra(R$)`, `row.revenue = 50.00` → **50.00**
- **Total:** 39.90 + 50.00 = **89.90**

---

## 💰 Card 2: Comissão (Pend. + Concl.)

**Fórmula:** `SOMA de todas as linhas filtradas da comissão`

### Como é calculado:

```typescript
const comissao = rowsOk.reduce((acc, r) => {
  const raw = r.raw_data || {};
  const val = cleanNumber(raw["Comissão líquida do afiliado(R$)"]);
  return acc + (val || 0);
}, 0);
```

### Ordem de prioridade:
1. `raw_data["Comissão líquida do afiliado(R$)"]` ⭐ **PRIORIDADE MÁXIMA**

**Exemplo:**
- Linha 1: `raw_data["Comissão líquida do afiliado(R$)"] = 1.197` → **1.197**
- Linha 2: `raw_data["Comissão líquida do afiliado(R$)"] = 2.50` → **2.50**
- Linha 3: `raw_data["Comissão líquida do afiliado(R$)"] = 1.00` → **1.00**
- **Total:** 1.197 + 2.50 + 1.00 = **4.697**

---

## 📢 Card 3: Valor Gasto Anúncios

**Fórmula:** `SOMA de todas as linhas filtradas do gasto com anúncios`

### Como é calculado:

```typescript
const gastoAnuncios = adSpendsFiltrados.reduce((acc, spend) => acc + (spend.amount || 0), 0);
```

### Fonte dos gastos:
1. **Tabela `ad_spends`** (registros de investimento em anúncios)
2. Filtra por **período** e **sub_id** (quando aplicável)

**Exemplo:**
- Linha 1: `raw_data["Valor gasto anuncios"] = 500.00` → **500.00**
- Linha 2: não tem campo de anúncio → **0.00**
- Linha 3: `raw_data["Valor gasto anuncios"] = 300.00` → **300.00**
- **Total:** 500.00 + 0.00 + 300.00 = **800.00**

**Nota:** Este valor é preenchido manualmente pelo usuário na tela de investimentos em anúncios.

---

## 🎯 Card 4: Lucro

**Fórmula:** `Comissão - Gasto Anúncios`

### Como é calculado:

```typescript
const lucro = comissao - gastoAnuncios;
```

**Exemplo:**
- Comissão: **4.697**
- Gasto Anúncios: **800.00**
- **Lucro:** 4.697 - 800.00 = **-795.303** (prejuízo)

---

## 📈 Card 5: ROAS (Retorno)

**Fórmula:** `Faturamento / Gasto Anúncios`

### Como é calculado:

```typescript
const roas = gastoAnuncios > 0 ? faturamento / gastoAnuncios : 0;
```

---

## 🔍 Função Auxiliar: `cleanNumber(value)`

Esta função normaliza valores monetários do CSV (que podem vir como strings no formato brasileiro):

### Como funciona:
1. Remove `R$`, `%`, espaços
2. Detecta formato brasileiro (`1.234,56` → `1234.56`)
3. Converte para número

### Regras:
- Se tem vírgula **E** ponto: assume ponto = milhar, vírgula = decimal
  - Ex: `"1.234,56"` → `1234.56`
- Se só tem vírgula: assume vírgula = decimal, remove pontos
  - Ex: `"123,45"` → `123.45`
- Se só tem ponto: assume ponto = decimal
  - Ex: `"39.9"` → `39.9`

---

## 📋 Filtros Aplicados

Os valores são calculados apenas sobre as linhas que passam pelos filtros:

1. **Período (Data):** linhas dentro do intervalo `start_date` a `end_date`
2. **Mes/Ano:** linhas com `mes_ano` correspondente (ou todos se "all")
3. **Status:** linhas com status correspondente (ou todos se vazio)
4. **Categoria:** linhas com categoria correspondente (ou todos se vazio)
5. **Sub_id1:** linhas com `sub_id1` correspondente (ou todos se vazio)

**Importante:** O código agora considera **TODOS os status**, não apenas "Pendente" e "Concluído". O nome do card "Pend. + Concl." é histórico e pode ser atualizado.

---

## 📝 Exemplo Completo

Dado um CSV com 3 linhas filtradas:

| Linha | Valor de Compra(R$) | Comissão líquida do afiliado(R$) | Valor gasto anuncios |
|-------|---------------------|--------------------------------|----------------------|
| 1     | 39.90               | 1.197                          | 500.00               |
| 2     | 50.00               | 2.50                           | 0.00                 |
| 3     | 25.00               | 1.00                           | 300.00               |

**Resultado dos Cards:**
- **Faturamento:** 39.90 + 50.00 + 25.00 = **R$ 114.90**
- **Comissão:** 1.197 + 2.50 + 1.00 = **R$ 4.697**
- **Gasto Anúncios:** 500.00 + 0.00 + 300.00 = **R$ 800.00**
- **Lucro:** 4.697 - 800.00 = **R$ -795.303** (prejuízo)
- **ROAS:** 114.90 / 800.00 = **0.14x**

---

## ⚠️ Observações Importantes

1. **Faturamento** usa `Valor de Compra(R$)` do CSV como fonte primária
2. **Comissão** usa `Comissão líquida do afiliado(R$)` como fonte principal
3. **Gasto Anúncios** vem da tabela de investimentos em anúncios
4. **Lucro** é calculado automaticamente: Comissão - Gasto Anúncios
5. **ROAS** é calculado automaticamente: Faturamento / Gasto Anúncios
6. Todos os valores são somados sobre as **linhas filtradas**, respeitando filtros de data, status, categoria, etc.
