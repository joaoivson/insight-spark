# Painel Admin Rodada 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir total pago via união de `charges_completed`, status "Atrasado", MRR/logins/capitalização, fundir Uso+Sync, polir sidebar/DRE, e caçar o unpack Shopee — sem tocar OAuth/Meta pause/budget/ROAS.

**Architecture:** Fonte de verdade de cobranças passa a ser a **união deduplicada** dos arrays `SubscriptionEvent.charges_completed` (já gravados desde migration 038), não a soma de webhooks `PAID_EVENTS`. Status de cliente deriva do **último evento de estado** (com prioridade para `subscription_late` / `canceled`). UI admin funde Uso+Sync numa rota com Tabs; métricas FE corrigem média e sparkline.

**Tech Stack:** FastAPI + SQLAlchemy + PostgreSQL/JSONB; React + Recharts + shadcn Tabs; pytest unit tests.

**Spec:** `docs/superpowers/specs/2026-07-28-painel-admin-rodada-2.md`

## Global Constraints

- Isolamento `user_id` / `require_admin` → 404 inalterado.
- Kiwify grant/revoke inalterado (só append recorder + métricas).
- Sync Meta OAuth / pause / budget / ROAS / imposto: **não mexer**.
- Shopee sync: só corrigir bug de unpack; não mudar janela/cron.
- Aceite financeiro: Letícia total **18150** cents net · Bruna **13570** cents net.
- Commits: `fix(admin): …` / `feat(admin): …` em `develop` primeiro.
- Branch de trabalho: `develop` (BE + FE repos separados).

## File map

| Área | Arquivos |
|------|----------|
| Charges union + métricas | `marketdash-backend/app/services/admin_metrics_service.py`, `admin_dre_service.py` |
| Recorder + schema | `subscription_event_recorder.py`, `models/subscription_event.py`, `migrations/039_card_rejection_reason.sql` |
| Tests | `tests/unit/test_admin_metrics_service.py`, `test_admin_dre_service.py`, `test_charges_union.py` (novo) |
| Status UI | `AdminClients.tsx`, `AdminClientDetail.tsx`, `admin-panel.service.ts` |
| MRR chart | `AdminDashboard.tsx` (consome `series.mrr` já filtrado no BE) |
| Logins / merge telas | `AdminUsage.tsx`, `AdminSyncStatus.tsx` → fundir em `AdminSyncStatus.tsx` (ou `AdminSincronizacoes.tsx`); `AdminLayout.tsx`; `app-routes.tsx` |
| DRE | `AdminDre.tsx`, `admin_dre_service.py` |
| Shopee unpack | `shopee_integration_service.py` + grep callers / sync_error_logs |

---

### Task 1: União de `charges_completed` (total pago + faturamento)

**Files:**
- Create: `marketdash-backend/tests/unit/test_charges_union.py`
- Modify: `marketdash-backend/app/services/admin_metrics_service.py`
- Modify: `marketdash-backend/app/services/admin_dre_service.py`

**Interfaces:**
- Produces: `extract_paid_charges_union(events) -> list[dict]` com chaves `order_id`, `net_cents`, `gross_cents`, `paid_at` (date/datetime)
- Produces: `total_paid_net_from_charges(events) -> int`
- Consumes: `SubscriptionEvent.charges_completed` (JSONB list já gravado)

Formato típico de item em `charges.completed` (Kiwify):

```json
{
  "order_id": "abc",
  "status": "paid",
  "created_at": "2026-04-28T...",
  "approved_date": "2026-04-28T...",
  "Commissions": { "my_commission": 13570, "charge_amount": 14700 }
}
```

(Valores podem vir em centavos int ou em reais float — helper `_as_cents` do recorder deve ser reutilizado / espelhado.)

- [ ] **Step 1: Write failing tests**

```python
# tests/unit/test_charges_union.py
from datetime import datetime, timezone
from types import SimpleNamespace
from app.services.admin_metrics_service import (
    extract_paid_charges_union,
    total_paid_net_from_charges,
    revenue_from_charges_for_month,
)

def _ev(charges):
    return SimpleNamespace(charges_completed=charges, subscription_id="sub1")

def test_union_dedupes_same_order_across_webhooks():
    c1 = {"order_id": "o1", "status": "paid", "approved_date": "2026-05-26",
          "Commissions": {"my_commission": 6050, "charge_amount": 6700}}
    c2 = {"order_id": "o2", "status": "paid", "approved_date": "2026-06-25",
          "Commissions": {"my_commission": 6050, "charge_amount": 6700}}
    c3 = {"order_id": "o3", "status": "paid", "approved_date": "2026-07-25",
          "Commissions": {"my_commission": 6050, "charge_amount": 6700}}
    # webhook A traz 2; webhook B traz as 3 (histórico completo)
    events = [_ev([c1, c2]), _ev([c1, c2, c3])]
    union = extract_paid_charges_union(events)
    assert len(union) == 3
    assert total_paid_net_from_charges(events) == 18150

def test_skips_non_paid():
    events = [_ev([{"order_id": "x", "status": "waiting_payment",
                    "Commissions": {"my_commission": 999}}])]
    assert total_paid_net_from_charges(events) == 0

def test_revenue_month_uses_charge_date_not_webhook_received():
    # cobrança de abril vista só num webhook de julho → entra em 2026-04
    ch = {"order_id": "bruna1", "status": "paid", "approved_date": "2026-04-28T12:00:00Z",
          "Commissions": {"my_commission": 13570, "charge_amount": 14700}}
    events = [_ev([ch])]
    rev = revenue_from_charges_for_month(events, 2026, 4)
    assert rev["net"] == 13570
    assert revenue_from_charges_for_month(events, 2026, 7)["net"] == 0
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd marketdash-backend && .venv312/bin/python -m pytest tests/unit/test_charges_union.py -q
```

- [ ] **Step 3: Implement helpers in `admin_metrics_service.py`**

```python
def _charge_as_cents(value) -> int:
    if value is None:
        return 0
    if isinstance(value, int):
        return value
    # float reais → cents
    try:
        return int(round(float(value) * 100)) if abs(float(value)) < 10000 else int(round(float(value)))
    except (TypeError, ValueError):
        return 0

def _parse_charge_dt(ch: dict):
    raw = ch.get("approved_date") or ch.get("created_at") or ch.get("date")
    # reuse recorder-style parse or datetime.fromisoformat
    ...

def extract_paid_charges_union(events) -> list[dict]:
    by_id: dict[str, dict] = {}
    for ev in events:
        for ch in (getattr(ev, "charges_completed", None) or []):
            if not isinstance(ch, dict):
                continue
            if (ch.get("status") or "").lower() != "paid":
                continue
            oid = ch.get("order_id")
            if not oid:
                continue
            commissions = ch.get("Commissions") or ch.get("commissions") or {}
            net = _charge_as_cents(commissions.get("my_commission"))
            gross = _charge_as_cents(commissions.get("charge_amount"))
            by_id[str(oid)] = {
                "order_id": str(oid),
                "net_cents": net,
                "gross_cents": gross,
                "paid_at": _parse_charge_dt(ch),
            }
    return list(by_id.values())

def total_paid_net_from_charges(events) -> int:
    return sum(c["net_cents"] for c in extract_paid_charges_union(events))

def revenue_from_charges_for_month(events, year: int, month: int) -> dict:
    net = gross = 0
    for c in extract_paid_charges_union(events):
        dt = c.get("paid_at")
        if not dt:
            continue
        d = dt.date() if hasattr(dt, "date") else dt
        if d.year == year and d.month == month:
            net += c["net_cents"]
            gross += c["gross_cents"]
    return {"net": net, "gross": gross}
```

- [ ] **Step 4: Wire `list_clients` total pago**

Em `list_clients`, substituir soma de `PAID_EVENTS` por:

```python
sub_events = self.db.query(SubscriptionEvent).filter(
    (SubscriptionEvent.subscription_id == ev.subscription_id)
    if ev.subscription_id
    else (SubscriptionEvent.customer_email == ev.customer_email)
).all()
paid_total_net = total_paid_net_from_charges(sub_events)
```

Mesma lógica em `client_detail` se expor total pago.

- [ ] **Step 5: Wire `revenue_for_month` + DRE**

`revenue_for_month` e `AdminDreService.month_statement` devem:

1. Buscar **todos** os eventos (ou ao menos os que têm `charges_completed`), montar união global por `subscription_id` (chaves de charge são globais por `order_id` — união global de todos os arrays também funciona com dedupe por `order_id`).
2. Somar charges cuja `paid_at` cai no mês.
3. Manter abatimento de reembolsos por `refunded_at` via `REFUND_EVENTS` + `_dedupe_by_charge` (inalterado).
4. **Não** somar `PAID_EVENTS.amount_*` pelo `received_at` (isso era o backfill incompleto).

Fallback: se um subscriber **não tem** nenhum `charges_completed` preenchido, cair no dedupe atual de `PAID_EVENTS` (legado) para não zerar clientes antigos sem array.

- [ ] **Step 6: Run all related tests**

```bash
.venv312/bin/python -m pytest tests/unit/test_charges_union.py tests/unit/test_admin_metrics_service.py tests/unit/test_admin_dre_service.py -q
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add app/services/admin_metrics_service.py app/services/admin_dre_service.py tests/unit/test_charges_union.py tests/unit/test_admin_*.py
git commit -m "$(cat <<'EOF'
fix(admin): total pago e faturamento via união de charges_completed

EOF
)"
```

---

### Task 2: Status "Atrasado" + `card_rejection_reason`

**Files:**
- Create: `marketdash-backend/migrations/039_card_rejection_reason.sql`
- Modify: `app/models/subscription_event.py`
- Modify: `app/services/subscription_event_recorder.py`
- Modify: `app/services/admin_metrics_service.py` (`list_clients`, `active_subscribers` / churn, `_SUBSCRIBER_STATE_PRIORITY`)
- Modify: FE `AdminClients.tsx`, `AdminClientDetail.tsx`, `admin-panel.service.ts`

**Interfaces:**
- Produces: `status` ∈ `ativo | atrasado | inativo | cancelado_com_acesso`
- Produces: campo `card_rejection_reason` no evento e na ficha do cliente
- `active_count` usa `_is_active_now` (acesso vigente); late com acesso vencido **fora** do count mas **na lista** como atrasado

- [ ] **Step 1: Migration**

```sql
-- migrations/039_card_rejection_reason.sql
ALTER TABLE subscription_events
  ADD COLUMN IF NOT EXISTS card_rejection_reason TEXT;
```

Aplicar em HML + main via Supabase MCP/`execute_sql` no deploy.

- [ ] **Step 2: Model + recorder**

```python
# extract_fields
"card_rejection_reason": order.get("card_rejection_reason"),

# SubscriptionEvent(...)
card_rejection_reason=fields.get("card_rejection_reason"),
```

- [ ] **Step 3: Prioridade de estado**

```python
_SUBSCRIBER_STATE_PRIORITY = {
    "subscription_canceled": 3,
    "subscription_late": 3,
    "subscription_renewed": 2,
    ...
    "order_approved": 1,
}
```

Em `list_clients`:

```python
etype = (ev.event_type or "").lower()
sub_st = (ev.subscription_status or "").lower()
is_late = etype == "subscription_late" or sub_st == "waiting_payment"
is_canceled = etype == "subscription_canceled" or sub_st in ("canceled", "cancelled")

if is_canceled and is_active:
    status = "cancelado_com_acesso"
elif is_canceled:
    status = "inativo"  # churn
elif is_late:
    status = "atrasado"
elif is_active:
    status = "ativo"
else:
    status = "inativo"
```

`churn_for_month` continua contando só `CANCEL_EVENTS` (não `subscription_late`).

`active_subscribers` **não** muda a regra de acesso: late com `access_until` passado já fica de fora via `_is_active_now`. Late com acesso vigente permanece em actives.

Incluir `card_rejection_reason` no item da lista (opcional) e no `client_detail`.

- [ ] **Step 4: FE badge amarela**

```tsx
function StatusBadge({ status }: { status: string }) {
  if (status === "atrasado")
    return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">Atrasado</Badge>;
  if (status === "ativo")
    return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Ativo</Badge>;
  // ...
}
```

Ficha: mapear `refused_bank` → "Recusa: banco emissor" (helper `translateRejectionReason`).

- [ ] **Step 5: Testes**

```python
def test_late_with_expired_access_is_atrasado_not_active():
    ...
def test_late_does_not_count_as_churn():
    ...
def test_subscription_late_not_in_revenue():
    # late event without paid charge → revenue unchanged
    ...
```

- [ ] **Step 6: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(admin): status Atrasado e card_rejection_reason

EOF
)"
```

---

### Task 3: Série MRR só com histórico real

**Files:**
- Modify: `admin_metrics_service.py` → `series_12m`
- Test: `tests/unit/test_admin_metrics_service.py`

- [ ] **Step 1: Failing test** — série não inclui mês anterior ao primeiro `received_at`; mês corrente parcial **omitido** do MRR (ou marcado e FE não plota — preferência da spec: sem ponto do mês parcial).

```python
def test_mrr_series_starts_at_first_event_month(monkeypatch):
    # mock _all_events first received_at = 2026-07-20
    # series mrr months all >= 2026-07 and exclude current incomplete month if today mid-month
    ...
```

- [ ] **Step 2: Implement**

```python
def series_12m(self) -> Dict[str, List[Dict[str, Any]]]:
    today = datetime.now(timezone.utc).date()
    first = (
        self.db.query(func.min(SubscriptionEvent.received_at)).scalar()
    )
    if not first:
        return {"mrr": [], "revenue": []}
    start_y, start_m = first.year, first.month
    # último mês completo = mês anterior a `today` (exclui parcial)
    end_y, end_m = today.year, today.month - 1
    if end_m <= 0:
        end_m, end_y = 12, end_y - 1
    # iterar de start..end; revenue pode incluir mês corrente se desejado —
    # spec: MRR sem parcial; faturamento já estava ok — manter revenue com meses desde first (incluindo corrente se houver charges)
    ...
```

- [ ] **Step 3: Commit** `fix(admin): série MRR só com meses de histórico real`

---

### Task 4: Logins média + sparkline linha

**Files:**
- Modify: `marketdash-frontend/src/features/admin/pages/AdminUsage.tsx` (e depois a aba Uso na Task 5)

- [ ] **Step 1: Fix média**

```tsx
const DAYS = 30;
const loginsAvg = loginsTotal / DAYS; // sempre ÷ 30, não ÷ daysWithData
```

Exibir `loginsAvg.toFixed(1).replace(".", ",")}` → `0,3/dia` (pt-BR).

- [ ] **Step 2: Garantir 30 pontos**

Se API não devolver dias zerados, preencher no FE:

```tsx
function fill30Days(rows: { date: string; count: number }[]) {
  const map = new Map(rows.map((r) => [r.date.slice(0, 10), r.count]));
  const out = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, count: map.get(key) ?? 0 });
  }
  return out;
}
```

- [ ] **Step 3: LineChart**

```tsx
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from "recharts";

<div style={{ height: 60 }} className="flex-1 min-w-[200px]">
  <ResponsiveContainer width="100%" height={60}>
    <LineChart data={filled}>
      <YAxis hide domain={[0, "auto"]} />
      <Tooltip content={<AdminChartTooltip />} />
      <Line type="monotone" dataKey="count" stroke="#318CE9" strokeWidth={1.5} dot={false} fill="none" />
    </LineChart>
  </ResponsiveContainer>
</div>
```

Nunca `BarChart` para logins.

- [ ] **Step 4: Commit** `fix(admin): média de logins ÷30 e sparkline em linha`

---

### Task 5: Capitalização do plano

**Files:**
- Modify: `admin-panel.service.ts` (+ `AdminDashboard.tsx` se montar label local)

```ts
export const formatPlanLabel = (plan: string | null | undefined): string => {
  const p = (plan || "").toLowerCase();
  if (p === "pro" || p === "max") return "Pro";
  if (p === "essencial" || p === "essential") return "Essencial";
  if (!plan) return "—";
  return plan.charAt(0).toUpperCase() + plan.slice(1);
};
```

Uso: `` `${formatPlanLabel(r.plan)} · ${translateFrequency(r.frequency)}` ``

Remover `className="capitalize"` onde mascara "pro"→"Pro" de forma inconsistente com multi-word.

- [ ] **Commit** `fix(admin): capitalizar rótulo de plano (Pro · Mensal)`

---

### Task 6: Fundir Uso + Sincronizações

**Files:**
- Modify: `AdminLayout.tsx` — menu 5 itens, remove "Uso"
- Modify: `app-routes.tsx` — `/admin/sincronizacoes` única; redirect `/admin/uso` → `/admin/sincronizacoes?tab=uso`
- Modify: `AdminSyncStatus.tsx` — Tabs "Syncs" | "Uso da plataforma"
- Move conteúdo de saúde/chamadas de `AdminUsage.tsx` para aba Syncs; logins+pages para aba Uso
- Delete ou thin-wrapper `AdminUsage.tsx`

Estrutura:

```tsx
<Tabs defaultValue={searchParams.get("tab") === "uso" ? "uso" : "syncs"}>
  <TabsList>
    <TabsTrigger value="syncs">Syncs</TabsTrigger>
    <TabsTrigger value="uso">Uso da plataforma</TabsTrigger>
  </TabsList>
  <TabsContent value="syncs">
    {/* health cards Shopee/Meta + overnight + table + chart 30d */}
  </TabsContent>
  <TabsContent value="uso">
    {/* logins card+line + top pages — sem scroll infinito misturando sync */}
  </TabsContent>
</Tabs>
```

- [ ] **Commit** `feat(admin): fundir Uso e Sincronizações em abas`

---

### Task 7: Header do sidebar

**Files:**
- Modify: `AdminLayout.tsx`

```tsx
import { BrandSymbol } from "@/components/brand/BrandLogo";

<div className="border-b border-border px-5 py-5">
  <div className="flex items-center gap-3">
    <BrandSymbol className="h-8 w-8 shrink-0" />
    <div className="min-w-0">
      <p className="font-[family-name:var(--font-display)] text-base font-bold leading-tight tracking-tight"
         style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700 }}>
        MarketDash
      </p>
      <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
         style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}>
        Painel interno
      </p>
    </div>
  </div>
</div>
```

Sem "Admin MarketDash". Rodapé "Voltar ao app" permanece.

- [ ] **Commit** `fix(admin): header do sidebar sem nome duplicado`

---

### Task 8: DRE — meses com movimento + MoM

**Files:**
- Modify: `admin_dre_service.py` e/ou filtro no `AdminDre.tsx`

Preferência: filtrar no FE a lista lateral:

```tsx
const availableMonths = [...(data.series || [])]
  .filter((m) => (m.revenue_net_cents || 0) !== 0 || (m.expenses_total_cents || 0) !== 0)
  .reverse();
```

Mover MoM do topo para o **fim** da demonstração:

```tsx
<LineRow label="vs mês anterior" value={centsToBRL(data.mom.delta_cents)} muted />
```

Remover parágrafo "MoM resultado:" do header.

- [ ] **Commit** `fix(admin): DRE só meses com movimento e MoM no rodapé`

---

### Task 9: Bug Shopee `cannot unpack non-iterable int object`

**Files:**
- Investigate: `shopee_integration_service.py` (`sync_commissions` já documenta o bug do `return 0`)
- Grep: quem ainda desempacota retorno errado; `sync_error_logs` amostras

- [ ] **Step 1: Confirmar stack nos logs**

```sql
SELECT message, created_at FROM sync_error_logs
WHERE source = 'shopee' AND message ILIKE '%unpack%'
ORDER BY created_at DESC LIMIT 20;
```

- [ ] **Step 2: Garantir todos os early-returns de `sync_commissions` retornam `tuple[int, bool, dict]`**

Já corrigido em inactive (`return 0, False, {}`). Auditar outros `return` no método.

- [ ] **Step 3: Se o erro vier de outro unpack** (ex. GraphQL / pagination), corrigir o ponto exato com teste de regressão em `tests/unit/test_shopee_upsert_additive.py` ou novo teste.

- [ ] **Step 4: Commit** `fix(shopee): evitar cannot unpack non-iterable int no sync` (só se houver mudança)

---

### Task 10: Verificação de aceite + smoke

- [ ] **Step 1: Unit tests full admin + shopee unpack**

```bash
cd marketdash-backend && .venv312/bin/python -m pytest tests/unit/test_charges_union.py tests/unit/test_admin_metrics_service.py tests/unit/test_admin_dre_service.py tests/unit/test_shopee_upsert_additive.py -q
```

- [ ] **Step 2: FE**

```bash
cd marketdash-frontend && npx tsc --noEmit && npm run lint
```

- [ ] **Step 3: Manual / Playwright checklist**

| # | Aceite | Como |
|---|--------|------|
| 1 | Letícia R$181,50 · Bruna R$135,70 | `/admin/clientes` |
| 2 | Abril com Bruna no faturamento | Dashboard série revenue / DRE |
| 3 | Bruna "Atrasado" + recusa banco | lista + ficha |
| 4 | Bruna fora de ativos, não churn | card Assinantes ativos + churn mês |
| 5 | late ≠ faturamento | comparar mês sem charge paid |
| 6 | MRR sem passado inventado | gráfico Dashboard |
| 7 | 0,3/dia + linha 60px | aba Uso |
| 8 | 5 itens menu + 2 abas | sidebar |
| 9 | Pro · Mensal | dashboard plano×freq |
| 10 | DRE só meses c/ movimento | `/admin/dre` |
| 11 | Smoke Meta/Shopee sync, OAuth, pause | não regressão |

- [ ] **Step 4: Push `develop` → merge `main`** (só quando usuário pedir)

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| 1 Total pago charges_completed | T1 |
| 1 Faturamento histórico por data da cobrança | T1 |
| 2 Atrasado / churn / ativos / rejection | T2 |
| 2 late ≠ faturamento | T1+T2 |
| 3 MRR histórico real | T3 |
| 4 Média logins | T4 |
| 5 Capitalização | T5 |
| 6 Fundir telas | T6 |
| 7 Sparkline linha | T4 |
| 8 Sidebar header | T7 |
| 9 DRE meses + MoM | T8 |
| Shopee unpack | T9 |
| Aceite 1–11 | T10 |

## Placeholder scan

Nenhum TBD/TODO solto — helpers e wiring explícitos. Ajuste fino do parse de `Commissions` (centavos vs reais) validar com 1 payload real de Letícia/Bruna no Step 1 de T1 antes de fechar centavos.
