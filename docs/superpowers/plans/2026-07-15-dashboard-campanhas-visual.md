# Dashboard + Campanhas Visual Adjustments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply three visual-only adjustments from the product spec: Pedidos column in campaign day-by-day table, swap official vs tax-adjusted display on Comissão/Gasto KPI cards, and compact mobile filters.

**Architecture:** Frontend-only changes in existing React components. No calculation, chart, Meta OAuth, or desktop filter layout changes. Daily `orders` already exists on `CampaignDailyPoint`.

**Tech Stack:** React, TypeScript, Tailwind, shadcn/ui (Sheet/Popover/Select), Lucide icons, Zustand (unchanged).

## Global Constraints

- Do NOT change markup/tax/ROAS Real/Lucro Líquido calculations — only which value is displayed large vs subtitle.
- Do NOT change the "Comissão, Gasto e Lucro por dia" chart.
- Desktop filters stay as today; filter collapse is mobile-only.
- Do NOT touch Meta integration/OAuth/token/sync.
- Branch: `develop` only. Do not commit `.env`.

---

### Task 1: Campanhas — coluna Pedidos no dia a dia

**Files:**
- Modify: `src/features/dashboard/pages/Campanhas.tsx` (daily table ~L732–764)

**Interfaces:**
- Consumes: `CampaignDailyPoint.orders: number` (already typed)
- Produces: Column order Data · Pedidos · Gasto · Comissão · Lucro · ROAS · CPC

- [ ] **Step 1: Update grid template and header**

Change both header and row grids from `grid-cols-[minmax(56px,0.8fr)_repeat(5,1fr)]` to `grid-cols-[minmax(56px,0.8fr)_repeat(6,1fr)]`.

Insert `<span className="font-normal">Pedidos</span>` immediately after Data.

- [ ] **Step 2: Render `d.orders`**

After the date cell, add:
```tsx
<span>{campaign.linked ? d.orders : "—"}</span>
```
(Or always show `d.orders` if unlinked campaigns still return 0 — match Resumo: show number when linked.)

- [ ] **Step 3: Smoke-check TypeScript**

Run: `npx tsc --noEmit` (or project lint on touched file)
Expected: no errors in Campanhas.tsx

- [ ] **Step 4: Commit**

```bash
git add src/features/dashboard/pages/Campanhas.tsx
git commit -m "feat(campanhas): add Pedidos column to day-by-day table"
```

---

### Task 2: Dashboard — Comissão e Gasto com valor oficial grande

**Files:**
- Modify: `src/components/dashboard/DashboardKpiCards.tsx` (L80–94)

**Interfaces:**
- Consumes: `DashTotals.comissao`, `comissaoBruta`, `gasto`, `gastoPago`, `hasTax`
- Produces: Big = official (bruto / sem imposto); sub = adjusted labels

- [ ] **Step 1: Swap Comissão display**

```tsx
<Card
  label="Comissão"
  value={formatCurrency(hasTax ? totals.comissaoBruta : totals.comissao)}
  sub={hasTax ? `líquido − imposto: ${formatCurrency(totals.comissao)}` : undefined}
  icon={BarChart2}
  accent={BLUE}
  spark={comissaoSpark}
/>
```

Note: sparkline can stay on `s.comissao` (adjusted series) — chart elsewhere unchanged; spark is decorative. Spec only covers card big/sub values.

- [ ] **Step 2: Swap Gasto Anúncios display**

```tsx
<Card
  label="Gasto Anúncios"
  value={formatCurrency(hasTax ? totals.gastoPago : totals.gasto)}
  sub={hasTax ? `com imposto: ${formatCurrency(totals.gasto)}` : undefined}
  icon={ShoppingCart}
  accent={CORAL}
/>
```

- [ ] **Step 3: Leave Lucro Líquido and ROAS Real untouched**

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/DashboardKpiCards.tsx
git commit -m "feat(dashboard): show official Comissão and Gasto as primary KPI values"
```

---

### Task 3: Filtros mobile compactos

**Files:**
- Modify: `src/components/dashboard/CommissionFilters.tsx`

**Interfaces:**
- Consumes: existing props; `useIsMobile()`
- Produces: Mobile: date row with "Mês" + calendar icon; collapsible "Filtros" for Status/Categoria/Sub ID + clear; optional active dot. Desktop: unchanged layout.

- [ ] **Step 1: Add mobile advanced-filters state**

```tsx
const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
const hasAdvancedFilters = !!(statusFilter || categoryFilter || subIdFilter);
```

- [ ] **Step 2: Mobile date chips**

On mobile only:
- Label "Mês atual" → "Mês"
- Custom trigger = icon-only calendar button (no "Personalizado" text); keep Sheet for range picker
- Chips in one row: `flex nowrap` / `flex-1` style so Ontem · 7 dias · 14 dias · Mês · [cal] fit

Desktop keeps "Mês atual" and text "Personalizado" chip.

- [ ] **Step 3: Collapse Status/Categoria/Sub ID + clear behind "Filtros" on mobile**

When `isMobile`:
- Render toggle button "Filtros" with Filter icon + chevron; show dot when `hasAdvancedFilters`
- When open, show the three Selects + clear button (text "Limpar filtros")
- Closed by default

When `!isMobile`: keep current always-visible selects + icon clear button.

- [ ] **Step 4: Verify desktop unchanged / mobile compact**

Manual: resize <768 — dates one row, advanced closed; >768 — previous layout.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/CommissionFilters.tsx
git commit -m "feat(dashboard): compact mobile filters with collapsible advanced filters"
```

---

### Task 4: Push to develop

- [ ] **Step 1:** `git status` — ensure `.env` not staged
- [ ] **Step 2:** `git push origin develop`
- [ ] **Step 3:** Confirm remote ahead synced

---

## Spec coverage self-check

| Spec item | Task |
|-----------|------|
| Pedidos column after Data | Task 1 |
| Column order Data·Pedidos·Gasto·… | Task 1 |
| Sum aligns with Resumo Pedidos (same `orders` field) | Task 1 (data already correct) |
| Comissão big = bruto; sub = líquido − imposto | Task 2 |
| Gasto big = sem imposto; sub = com imposto | Task 2 |
| Lucro/ROAS/cálculo/gráfico untouched | Task 2 constraints |
| Mobile: Mês + calendar icon; Filtros collapse; optional dot | Task 3 |
| Desktop filters unchanged | Task 3 |
| No Meta OAuth | Global |
