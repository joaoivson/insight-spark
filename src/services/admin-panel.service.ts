import { fetchWithAuth, getApiUrl } from "@/core/config/api.config";

const base = () => getApiUrl("/api/v1/admin");

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export type AdminDashboard = {
  year: number;
  month: number;
  mrr_net_cents: number;
  mrr_gross_cents: number;
  revenue_net_cents: number;
  revenue_gross_cents: number;
  refund_net_cents: number;
  active_count: number;
  active_by_plan: Record<string, number>;
  new_subscriptions: number;
  churn_count: number;
  churn_rate: number;
  renewal_rate: number | null;
  arpu_cents: number;
  ltv_cents: number | null;
  alerts: {
    expiring_7d: number;
    payment_failed: number;
    never_connected: number;
    no_login_10d: number;
  };
  series: {
    mrr: { month: string; net: number; gross: number }[];
    revenue: { month: string; net: number; gross: number }[];
  };
  plan_frequency: {
    plan: string;
    frequency: string;
    count: number;
    revenue_net_cents: number;
    revenue_share: number;
  }[];
};

export type AdminClient = {
  user_id: number | null;
  name: string;
  email: string;
  cpf: string;
  phone?: string | null;
  plan: string;
  frequency?: string | null;
  status: string;
  started_at?: string | null;
  next_payment?: string | null;
  access_until?: string | null;
  total_paid_net_cents: number;
  last_login_at?: string | null;
  integrations: { shopee: boolean; facebook: boolean };
  semaphore: string;
};

export type ExpenseItem = {
  id: number;
  date: string;
  category: string;
  supplier?: string | null;
  description?: string | null;
  amount_cents: number;
  recurring: boolean;
  notes?: string | null;
};

export type DreResponse = {
  year: number;
  month: number;
  gross_cents: number;
  refund_gross_cents: number;
  gross_after_refund_cents: number;
  fees_cents: number;
  revenue_net_cents: number;
  expenses_by_category: { category: string; amount_cents: number }[];
  expenses_total_cents: number;
  result_cents: number;
  margin: number | null;
  has_expenses: boolean;
  series: { month: string; revenue_net_cents: number; expenses_total_cents: number; result_cents: number }[];
  burn_avg_3m_cents: number | null;
  mom: { delta_cents: number; delta_pct: number | null } | null;
};

export const centsToBRL = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100);

export async function fetchAdminDashboard(year: number, month: number) {
  return json<AdminDashboard>(await fetchWithAuth(`${base()}/dashboard?year=${year}&month=${month}`));
}

export async function fetchAdminClients(params: Record<string, string | boolean | undefined> = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === "" || v === false) return;
    qs.set(k, String(v));
  });
  return json<AdminClient[]>(await fetchWithAuth(`${base()}/clients?${qs}`));
}

export async function fetchAdminClient(userId: number) {
  return json<any>(await fetchWithAuth(`${base()}/clients/${userId}`));
}

export async function addAdminNote(userId: number, body: string) {
  return json(await fetchWithAuth(`${base()}/clients/${userId}/notes`, {
    method: "POST",
    body: JSON.stringify({ body }),
  }));
}

export async function fetchExpenses(year: number, month: number) {
  return json<{ items: ExpenseItem[]; total_cents: number; by_category: { category: string; amount_cents: number }[] }>(
    await fetchWithAuth(`${base()}/expenses?year=${year}&month=${month}`),
  );
}

export async function createExpense(payload: Omit<ExpenseItem, "id">) {
  return json(await fetchWithAuth(`${base()}/expenses`, { method: "POST", body: JSON.stringify(payload) }));
}

export async function updateExpense(id: number, payload: Omit<ExpenseItem, "id">) {
  return json(await fetchWithAuth(`${base()}/expenses/${id}`, { method: "PUT", body: JSON.stringify(payload) }));
}

export async function deleteExpense(id: number) {
  return json(await fetchWithAuth(`${base()}/expenses/${id}`, { method: "DELETE" }));
}

export async function repeatExpenses(year: number, month: number) {
  return json<{ created: number }>(
    await fetchWithAuth(`${base()}/expenses/repeat-previous-month?year=${year}&month=${month}`, { method: "POST" }),
  );
}

export async function fetchDre(year: number, month: number) {
  return json<DreResponse>(await fetchWithAuth(`${base()}/dre?year=${year}&month=${month}`));
}

export async function fetchUsage() {
  return json<any>(await fetchWithAuth(`${base()}/usage`));
}

export type SyncRun = {
  id: number;
  source: string;
  trigger: string;
  user_id: number | null;
  days_back: number | null;
  empty_attempt: number;
  status: "running" | "success" | "failed" | "skipped_lock";
  started_at: string | null;
  finished_at: string | null;
  duration_seconds: number | null;
  records_fetched: number | null;
  records_upserted: number | null;
  is_suspected_partial: boolean;
  is_stale_running: boolean;
  error_message: string | null;
  details: Record<string, unknown> | null;
};

export type SyncHealth = {
  source: string;
  trigger: string;
  since: string;
  total_ativos: number;
  sucesso: number;
  falha: number;
  sem_execucao: number[];
};

export async function fetchSyncRuns(
  params: { source?: string; trigger?: string; status?: string; user_id?: number; limit?: number } = {},
) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === "") return;
    qs.set(k, String(v));
  });
  return json<SyncRun[]>(await fetchWithAuth(`${base()}/sync-runs?${qs}`));
}

export async function fetchSyncHealth(source: string, trigger: string) {
  return json<SyncHealth>(
    await fetchWithAuth(`${base()}/sync-runs/health?source=${source}&trigger=${trigger}`),
  );
}

export async function postPageView(path: string) {
  try {
    await fetchWithAuth(`${base()}/page-views`, { method: "POST", body: JSON.stringify({ path }) });
  } catch {
    /* ignore */
  }
}
