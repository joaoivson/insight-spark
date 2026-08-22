# Painel Admin Rodada 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar as 8 correções da Rodada 3 do painel admin (MRR/faturamento/bruto, UI labels/alerta, DRE erro, último acesso diário) sem tocar OAuth/Meta pause/budget/ROAS/Shopee sync.

**Architecture:** Ajustes em `AdminMetricsService` / `AdminDreService` para série MRR incluir mês corrente, série de faturamento começar na primeira cobrança paga, e bruto/taxa derivados de preço de tabela (não parcelamento). FE: remover alerta, Max label, título 30d, retry DRE, beacon de acesso diário. BE: endpoint idempotente `POST /admin/access` (1 row/`user_logins`/dia).

**Tech Stack:** FastAPI + SQLAlchemy + PostgreSQL; React + Recharts + shadcn; pytest.

**Spec:** `docs/superpowers/specs/2026-07-29-painel-admin-rodada-3.md`

## Global Constraints

- Isolamento `user_id` / `require_admin` → 404 inalterado.
- Sync Meta OAuth / pause / budget / ROAS / imposto / Shopee: **não mexer**.
- Aceite financeiro (centavos): DRE abril **14700 / 1130 / 13570**; card julho **net 6050 · gross 6700**; MRR chart julho **6050**.
- Bruto **nunca** inclui acréscimo de parcelamento (`charge_amount` 15738 ≠ tabela 14700).
- Commits: `fix(admin): …` / `feat(admin): …` em `develop` (BE e FE repos separados).
- Branch: `develop`.

## File map

| Área | Arquivos |
|------|----------|
| Preço tabela + bruto | `marketdash-backend/app/core/plans.py`, `admin_metrics_service.py`, `admin_dre_service.py` |
| Séries MRR/rev | `admin_metrics_service.py` (`series_12m`) |
| Tests | `tests/unit/test_admin_metrics_service.py`, `test_admin_dre_service.py`, `test_charges_union.py`, novo `test_plan_list_price.py` |
| Acesso diário | `admin_panel.py`, `user_login.py` (reuso), FE `AccessBeacon` / `App.tsx` |
| UI dashboard | `AdminDashboard.tsx`, `admin-panel.service.ts` |
| DRE UX | `AdminDre.tsx` |
| Clientes | `AdminClients.tsx` |
| Telas | `AdminSyncStatus.tsx` |

---

### Task 1: Preço de tabela + bruto/taxa por cobrança

**Files:**
- Modify: `marketdash-backend/app/core/plans.py`
- Modify: `marketdash-backend/app/services/admin_metrics_service.py` (`extract_paid_charges_union`, `_fees_from_charges_for_month`)
- Create/Modify: `marketdash-backend/tests/unit/test_plan_list_price.py`
- Modify: `marketdash-backend/tests/unit/test_charges_union.py`
- Modify: `marketdash-backend/tests/unit/test_admin_dre_service.py`

**Interfaces:**
- Produces: `PLAN_LIST_PRICE_CENTS: Dict[tuple[str, str], int]` — chaves `(essencial|pro, mensal|trimestral|anual)`
- Produces: `list_price_cents(plan: str, frequency: str) -> Optional[int]`
- Produces: cada item de `extract_paid_charges_union` com `gross_cents`, `net_cents`, `fee_cents`, `paid_at`, `order_id`, `plan`, `frequency`
- Regra bruto:
  1. Resolver `(plan, frequency)` do `SubscriptionEvent` pai (`_normalize_plan_label` + freq normalizada).
  2. `table = list_price_cents(plan, freq)`.
  3. Se `table` → `gross = table` (ignora parcelamento em `charge_amount`).
  4. Senão, se webhook trouxe `charge_amount` e `kiwify_fee` → `gross = charge_amount`, `fee = kiwify_fee`.
  5. Senão `gross = net`.
  6. `fee = kiwify_fee` se presente, senão `max(gross - net, 0)`.

- [ ] **Step 1: Write failing tests**

```python
# tests/unit/test_plan_list_price.py
from app.core.plans import list_price_cents, PLAN_LIST_PRICE_CENTS

def test_pro_trimestral_table_price():
    assert list_price_cents("pro", "trimestral") == 14700
    assert list_price_cents("pro", "mensal") == 6700
    assert list_price_cents("essencial", "mensal") == 4700
    assert PLAN_LIST_PRICE_CENTS[("pro", "anual")] == 44700

# tests/unit/test_charges_union.py (adicionar)
def test_historical_charge_uses_table_gross_not_net_as_gross():
    """charges_completed só com amount líquido → bruto = tabela Pro Trimestral."""
    ev = SimpleNamespace(
        plan_name="Pro",
        plan_id="pro",
        plan_frequency="trimestral",
        charges_completed=[{
            "order_id": "apr1",
            "status": "paid",
            "approved_date": "2026-04-28T12:00:00Z",
            "amount": 135.70,  # só líquido
        }],
        raw_payload=None,
    )
    charges = extract_paid_charges_union([ev])
    assert len(charges) == 1
    assert charges[0]["net_cents"] == 13570
    assert charges[0]["gross_cents"] == 14700
    assert charges[0]["fee_cents"] == 1130

def test_installment_surcharge_does_not_inflate_gross():
    ev = SimpleNamespace(
        plan_name="Pro",
        plan_id="pro",
        plan_frequency="trimestral",
        charges_completed=[{
            "order_id": "x",
            "status": "paid",
            "approved_date": "2026-07-01T00:00:00Z",
            "Commissions": {
                "my_commission": 13570,
                "charge_amount": 15738,  # parcelamento
                "kiwify_fee": 1130,
            },
        }],
        raw_payload=None,
    )
    c = extract_paid_charges_union([ev])[0]
    assert c["gross_cents"] == 14700
    assert c["fee_cents"] == 1130
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd marketdash-backend && .venv/bin/python -m pytest tests/unit/test_plan_list_price.py tests/unit/test_charges_union.py -v
```

- [ ] **Step 3: Implement `list_price_cents` in `plans.py`**

```python
PLAN_LIST_PRICE_CENTS: Dict[tuple[str, str], int] = {
    ("essencial", "mensal"): 4700,
    ("essencial", "trimestral"): 11700,
    ("essencial", "anual"): 32700,
    ("pro", "mensal"): 6700,
    ("pro", "trimestral"): 14700,
    ("pro", "anual"): 44700,
}

def _norm_freq(frequency: Optional[str]) -> str:
    f = (frequency or "monthly").lower()
    if f in ("quarterly", "trimestral"):
        return "trimestral"
    if f in ("yearly", "annual", "anual", "year"):
        return "anual"
    return "mensal"

def list_price_cents(plan: str, frequency: str) -> Optional[int]:
    p = (plan or "").strip().lower()
    if p not in ("essencial", "pro"):
        # max usa preços pro por enquanto se aparecer
        if p == "max":
            p = "pro"
        else:
            p = "essencial" if "essenc" in p else ("pro" if "pro" in p else p)
    return PLAN_LIST_PRICE_CENTS.get((p, _norm_freq(frequency)))
```

- [ ] **Step 4: Update `extract_paid_charges_union` to attach plan/freq from parent event and compute gross/fee**

Em `admin_metrics_service.py`, dentro do loop de `extract_paid_charges_union`, após calcular `net`:

```python
plan = _normalize_plan_label(getattr(ev, "plan_name", None), getattr(ev, "plan_id", None))
freq = getattr(ev, "plan_frequency", None) or "monthly"
table = list_price_cents(plan, freq)  # import from app.core.plans

raw_gross = _charge_as_cents(
    commissions.get("charge_amount") or ch.get("charge_amount")
)
raw_fee = _charge_as_cents(
    commissions.get("kiwify_fee") or ch.get("kiwify_fee") or ch.get("fee")
)

if table is not None:
    gross = table
elif raw_gross and raw_fee:
    gross = raw_gross
else:
    gross = net or raw_gross

fee = raw_fee if raw_fee else max(gross - net, 0)

by_id[str(oid)] = {
    "order_id": str(oid),
    "net_cents": net,
    "gross_cents": gross,
    "fee_cents": fee,
    "paid_at": _parse_charge_dt(ch),
    "plan": plan,
    "frequency": freq,
}
```

Atualizar `_fees_from_charges_for_month` para somar `c["fee_cents"]` (não recalcular `gross-net` se já veio).

- [ ] **Step 5: DRE abril acceptance test**

```python
def test_dre_april_bruna_table_gross():
    # montar events com charges_completed abril amount=135.70, plan Pro trimestral
    # AdminDreService(...).month_statement(2026, 4)
    # assert gross 14700, fee 1130, net 13570
```

- [ ] **Step 6: Run all related tests — PASS**

```bash
.venv/bin/python -m pytest tests/unit/test_plan_list_price.py tests/unit/test_charges_union.py tests/unit/test_admin_dre_service.py tests/unit/test_admin_metrics_service.py -v
```

- [ ] **Step 7: Commit BE**

```bash
git add app/core/plans.py app/services/admin_metrics_service.py tests/unit/
git commit -m "fix(admin): bruto = preço de tabela; taxa derivada no histórico"
```

---

### Task 2: Série MRR inclui mês atual + faturamento desde 1ª cobrança

**Files:**
- Modify: `marketdash-backend/app/services/admin_metrics_service.py` (`series_12m`)
- Modify: `marketdash-backend/tests/unit/test_admin_metrics_service.py`

**Interfaces:**
- Consome: `extract_paid_charges_union`, `revenue_for_month`, `mrr_cents`, `active_subscribers`
- Produz: `series["mrr"]` do primeiro mês com evento até **hoje** (mês corrente incluso)
- Produz: `series["revenue"]` do **min(primeiro evento, primeira charge.paid_at)** até hoje

- [ ] **Step 1: Rewrite/adjust failing tests**

Substituir `test_mrr_series_empty_when_only_incomplete_current_month` por:

```python
def test_mrr_series_includes_current_month_when_first_event_is_now():
    # first event em julho/2026, today julho → mrr_series tem 1 ponto 2026-07
    ...
    assert series["mrr"][0]["month"] == "2026-07"
    assert series["mrr"][0]["net"] > 0

def test_revenue_series_starts_at_earliest_charge_month():
    # evento received_at julho, mas charges_completed com paid_at abril →
    # revenue inclui 2026-04
    ...
    months = [p["month"] for p in series["revenue"]]
    assert "2026-04" in months
    assert "2026-07" in months
```

- [ ] **Step 2: Run — expect FAIL** (MRR ainda exclui corrente; rev começa em received_at)

- [ ] **Step 3: Fix `series_12m`**

```python
def series_12m(self) -> Dict[str, List[Dict[str, Any]]]:
    today = datetime.now(timezone.utc).date()
    first = self.db.query(func.min(SubscriptionEvent.received_at)).scalar()
    if not first:
        return {"mrr": [], "revenue": []}

    start_y, start_m = first.year, first.month

    # Revenue/MRR start: também considerar a cobrança paga mais antiga
    all_events = self.db.query(SubscriptionEvent).all()
    for c in extract_paid_charges_union(all_events):
        dt = c.get("paid_at")
        if not dt:
            continue
        d = dt.date() if hasattr(dt, "date") else dt
        if (d.year, d.month) < (start_y, start_m):
            start_y, start_m = d.year, d.month

    # MRR: do start até o mês atual (incluso) — spec Rodada 3
    mrr_series: List[Dict[str, Any]] = []
    y, m = start_y, start_m
    while (y, m) <= (today.year, today.month):
        end_day = monthrange(y, m)[1]
        as_of = date(y, m, end_day)
        if (y, m) == (today.year, today.month):
            as_of = today
        actives = self.active_subscribers(as_of=as_of)
        mrr = self.mrr_cents(actives)
        mrr_series.append({
            "month": f"{y:04d}-{m:02d}",
            "net": mrr["net"],
            "gross": mrr["gross"],
        })
        m += 1
        if m > 12:
            m, y = 1, y + 1

    rev_series: List[Dict[str, Any]] = []
    y, m = start_y, start_m
    while (y, m) <= (today.year, today.month):
        rev = self.revenue_for_month(y, m)
        rev_series.append({
            "month": f"{y:04d}-{m:02d}",
            "net": rev["net"],
            "gross": rev["gross"],
        })
        m += 1
        if m > 12:
            m, y = 1, y + 1

    return {"mrr": mrr_series, "revenue": rev_series}
```

- [ ] **Step 4: Run tests — PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "fix(admin): MRR inclui mês atual; faturamento desde 1ª cobrança"
```

---

### Task 3: Max no breakdown (BE + FE)

**Files:**
- Modify: `marketdash-backend/app/services/admin_metrics_service.py` (`_normalize_plan_label`)
- Modify: `marketdash-frontend/src/services/admin-panel.service.ts` (`formatPlanLabel`)
- Modify: `marketdash-frontend/src/features/admin/pages/AdminClients.tsx` (filtro Max, se só Essencial/Pro)
- Test: adicionar em `test_admin_metrics_service.py`

- [ ] **Step 1: Failing test**

```python
def test_normalize_plan_keeps_max_distinct():
    from app.services.admin_metrics_service import _normalize_plan_label
    assert _normalize_plan_label("Max", None) == "max"
    assert _normalize_plan_label("Pro", None) == "pro"
    assert _normalize_plan_label("MarketDash Max", "max") == "max"
```

- [ ] **Step 2: Implement**

```python
def _normalize_plan_label(name: Optional[str], plan_id: Optional[str] = None) -> str:
    blob = f"{name or ''} {plan_id or ''}".lower()
    if "max" in blob:
        return "max"
    if "pro" in blob:
        return "pro"
    if "essencial" in blob or "essential" in blob:
        return "essencial"
    return "essencial"
```

FE `formatPlanLabel`:

```typescript
export function formatPlanLabel(k: string): string {
  const map: Record<string, string> = {
    essencial: "Essencial",
    pro: "Pro",
    max: "Max",
  };
  return map[k.toLowerCase()] ?? k;
}
```

Ordem do card: Essencial · Pro · Max (já iterar keys nessa ordem se o backend devolver as três).

- [ ] **Step 3: Tests PASS + commit BE e FE**

```bash
# BE
git commit -m "fix(admin): distinguir plano Max de Pro no breakdown"
# FE
git commit -m "fix(admin): label Max no card de assinantes ativos"
```

---

### Task 4: Remover faixa de alerta + título Telas (30d)

**Files:**
- Modify: `marketdash-frontend/src/features/admin/pages/AdminDashboard.tsx`
- Modify: `marketdash-frontend/src/features/admin/pages/AdminSyncStatus.tsx`

- [ ] **Step 1: Dashboard — remover bloco L167–182 (faixa amarela) e construção de `alertBits` só usada por ela.** Manter `data.alerts` no payload (filtros Clientes usam query params). Não remover backend `alerts()`.

- [ ] **Step 2: AdminSyncStatus — título**

```tsx
<h3 ...>Telas mais acessadas (30d)</h3>
```

- [ ] **Step 3: Commit FE**

```bash
git commit -m "fix(admin): remover alerta do dashboard e rotular telas (30d)"
```

---

### Task 5: DRE — erro amigável + retry (+ investigar)

**Files:**
- Modify: `marketdash-frontend/src/features/admin/pages/AdminDre.tsx`
- Optional note: checar Railway/Sentry logs do horário do Failed to fetch (cold start / timeout) — documentar achado no commit message se houver.

- [ ] **Step 1: Trocar catch**

```tsx
} catch (e) {
  const raw = e instanceof Error ? e.message : "";
  const friendly =
    /failed to fetch|networkerror|load failed/i.test(raw) || !raw
      ? "Não foi possível carregar o DRE. Verifique a conexão e tente de novo."
      : raw;
  setError(friendly);
}
```

- [ ] **Step 2: UI de erro com botão**

```tsx
{error ? (
  <div className="space-y-3 py-8 text-center">
    <p className="text-sm text-muted-foreground">{error}</p>
    <Button variant="outline" onClick={() => void load()}>
      Tentar novamente
    </Button>
  </div>
) : ...}
```

Garantir que `load` é a mesma função do `useEffect` (extrair `const load = useCallback(...)`).

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(admin): DRE com mensagem amigável e botão tentar novamente"
```

---

### Task 6: Último acesso — 1 registro/usuário/dia

**Files:**
- Modify: `marketdash-backend/app/api/v1/routes/admin_panel.py` (ou `auth.py` — preferir admin_panel ao lado de page-views)
- Create helper se útil: repositório mínimo inline na route
- Modify: `marketdash-frontend/src/services/admin-panel.service.ts` — `postDailyAccess()`
- Create: `marketdash-frontend/src/features/admin/components/AccessBeacon.tsx` (ou expandir PageViewBeacon)
- Modify: `marketdash-frontend/src/App.tsx`
- Modify: `marketdash-frontend/src/features/admin/pages/AdminClients.tsx` — coluna **"Último acesso"**
- Test: `tests/unit/test_daily_access.py` (novo) ou teste de integração leve com Session mock

**Interfaces:**
- `POST /api/v1/admin/access` (auth: `get_current_user`) → 204  
  Idempotente: se já existe `UserLogin` para `user_id` com `logged_at::date = today (America/Sao_Paulo)`, no-op.
- FE chama 1x no mount autenticado (quando há token), não a cada rota.

- [ ] **Step 1: Failing test (lógica de idempotência)**

```python
def test_record_daily_access_once_per_day():
    # mock db: sem login hoje → insert; segunda chamada → sem segundo insert
    ...
```

- [ ] **Step 2: Implement route**

```python
@router.post("/access", status_code=status.HTTP_204_NO_CONTENT)
def record_daily_access(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from zoneinfo import ZoneInfo
    from datetime import datetime, timezone
    from sqlalchemy import cast, Date
    from app.models.user_login import UserLogin

    today = datetime.now(ZoneInfo("America/Sao_Paulo")).date()
    exists = (
        db.query(UserLogin.id)
        .filter(
            UserLogin.user_id == user.id,
            cast(UserLogin.logged_at, Date) == today,
        )
        .first()
    )
    if exists:
        return None
    db.add(UserLogin(user_id=user.id, logged_at=datetime.now(timezone.utc)))
    db.commit()
    return None
```

Nota: `cast(..., Date)` usa timezone da sessão DB (UTC). Para alinhar ao dia BRT, filtrar:

```python
start = datetime(today.year, today.month, today.day, tzinfo=ZoneInfo("America/Sao_Paulo")).astimezone(timezone.utc)
end = start + timedelta(days=1)
.exists filter logged_at >= start, logged_at < end
```

- [ ] **Step 3: FE AccessBeacon**

```tsx
// AccessBeacon.tsx
useEffect(() => {
  if (!getToken()) return;
  void postDailyAccess(); // fire-and-forget
}, []);
```

Montar ao lado de `PageViewBeacon` em `App.tsx`.

- [ ] **Step 4: Renomear coluna Clientes → "Último acesso"**

- [ ] **Step 5: Tests PASS + commits BE/FE**

```bash
# BE
git commit -m "feat(admin): gravar último acesso 1x por usuário/dia"
# FE
git commit -m "feat(admin): beacon de acesso diário e label Último acesso"
```

---

### Task 7: Verificação de aceite + smoke

**Files:** nenhum novo — checklist manual/SQL + pytest.

- [ ] **Step 1: pytest suite admin**

```bash
cd marketdash-backend && .venv/bin/python -m pytest tests/unit/test_admin_metrics_service.py tests/unit/test_admin_dre_service.py tests/unit/test_charges_union.py tests/unit/test_plan_list_price.py -v
```

- [ ] **Step 2: SQL smoke (prod/HML via Supabase) — opcional se houver acesso**

```sql
-- Conferir charges Bruna abril
-- Conferir user_logins após abrir app
```

- [ ] **Step 3: Checklist aceite da spec (itens 1–10)**

| # | Critério | Como verificar |
|---|----------|----------------|
| 1 | MRR jul 6050 | Dashboard gráfico / `series.mrr` |
| 2 | Fat abr–jul | Dashboard gráfico revenue |
| 3 | DRE abr 14700/1130/13570 | `/admin/dre?year=2026&month=4` |
| 4 | Card jul net/gross | Dashboard cards |
| 5 | Sem faixa amarela | Dashboard visual |
| 6 | Max label | Card ativos |
| 7 | Telas (30d) | Aba Uso |
| 8 | DRE retry | DevTools offline → mensagem |
| 9 | Último acesso | Abrir app → Clientes |
| 10 | Sync intacto | Smoke manual rápido |

- [ ] **Step 4: Push develop (+ main se o fluxo do time pedir)**

---

## Self-review (spec coverage)

| Spec # | Task |
|--------|------|
| 1 MRR mês atual | Task 2 |
| 2 Faturamento backfill | Task 2 (+ Task 1 gross) |
| 3 Bruto tabela | Task 1 |
| 4 Remover alerta | Task 4 |
| 5 Max label | Task 3 |
| 6 Telas 30d | Task 4 |
| 7 DRE fetch | Task 5 |
| 8 Último acesso | Task 6 |
| Aceite 1–10 | Task 7 |

Placeholders: nenhum TBD. Types: `fee_cents` adicionado em union; `_fees_from_charges_for_month` e DRE devem consumir o mesmo campo.

---

## Execution Handoff

Plan complete and saved to `marketdash-frontend/docs/superpowers/plans/2026-07-29-painel-admin-rodada-3.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  

**2. Inline Execution** — execute in this session with executing-plans checkpoints  

**Which approach?**
