function parseDDMMYYYY(trimmed: string): Date | null {
  const dm = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dm) {
    const day = Number(dm[1]);
    const month = Number(dm[2]);
    const year = Number(dm[3]);
    if (day < 1 || day > 31 || month < 1 || month > 12) return null;
    const d = new Date(year, month - 1, day);
    return isNaN(d.getTime()) ? null : d;
  }
  const slash = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slash) {
    const day = Number(slash[1]);
    const month = Number(slash[2]);
    const year = Number(slash[3]);
    if (day < 1 || day > 31 || month < 1 || month > 12) return null;
    const d = new Date(year, month - 1, day);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export const parseDateOnly = (value?: string | Date | null) => {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  // ISO YYYY-MM-DD
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]) - 1;
    const d = Number(iso[3]);
    const local = new Date(y, m, d);
    return isNaN(local.getTime()) ? null : local;
  }
  // DD-MM-YYYY ou DD/MM/YYYY
  const dd = parseDDMMYYYY(trimmed);
  if (dd) return dd;
  // Fallback genérico do JS, se vier em outro formato entendível
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? null : parsed;
};

export const toDateKey = (value?: string | Date | null) => {
  const d = parseDateOnly(value);
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const isBeforeDateKey = (a?: string | Date | null, b?: string | Date | null) => {
  const ak = toDateKey(a);
  const bk = toDateKey(b);
  if (!ak || !bk) return false;
  return ak < bk;
};

export const isAfterDateKey = (a?: string | Date | null, b?: string | Date | null) => {
  const ak = toDateKey(a);
  const bk = toDateKey(b);
  if (!ak || !bk) return false;
  return ak > bk;
};

/**
 * Extract time part from value (HH:mm, HH:mm:ss, or ISO datetime).
 * Returns HH:mm string or null.
 */
function extractTimePart(value?: string | null): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  const iso = trimmed.match(/T(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (iso) return `${iso[1].padStart(2, "0")}:${iso[2]}${iso[3] ? `:${iso[3]}` : ""}`;
  if (/^\d{1,2}(:\d{2}){1,2}$/.test(trimmed)) return trimmed;
  return null;
}

/**
 * Parse time string (HH:mm, HH:mm:ss or ISO datetime) and return hour range label.
 * e.g. "10:15" → "Entre 10 e 11:00", "2025-01-10T14:30:00" → "Entre 14 e 15:00"
 */
export const formatHourRange = (time?: string | null): string => {
  const timeStr = extractTimePart(time);
  if (!timeStr) return "—";
  const match = timeStr.match(/^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?/);
  if (!match) return "—";
  const hour = parseInt(match[1], 10);
  if (isNaN(hour) || hour < 0 || hour > 23) return "—";
  const h = String(hour).padStart(2, "0");
  const hNext = String((hour + 1) % 24).padStart(2, "0");
  return `Entre ${h} e ${hNext}:00`;
};

// ── Período em horário de Brasília (America/Sao_Paulo, UTC−3) ──────────────────
// Os atalhos (7/14 dias, mês) cortam no FIM DO DIA ANTERIOR FECHADO em Brasília.
// Calcular em UTC / fuso-do-navegador fazia o dia corrente (parcial) entrar à noite
// (após 21h BRT = 00h UTC): o Gasto entrava sem a Comissão correspondente, derrubando
// ROAS/Lucro. Aqui ancoramos tudo em Brasília, independente do fuso de quem acessa.
const SP_TZ = "America/Sao_Paulo";

/** "Hoje" em Brasília como YYYY-MM-DD — independe do fuso do navegador/servidor. */
export const todayKeyBR = (): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: SP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

/** Soma `n` dias a uma data-chave YYYY-MM-DD (math em UTC puro — a chave é só rótulo de dia). */
export const addDaysKey = (key: string, n: number): string => {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
};

/** Ontem (último dia FECHADO) em Brasília — limite superior dos atalhos de período. */
export const yesterdayKeyBR = (): string => addDaysKey(todayKeyBR(), -1);

export type PresetKind = "yesterday" | "7d" | "14d" | "30d" | "month";

/** Intervalo de um atalho de período (string keys), cortando no fim do dia anterior fechado (BRT). */
export const presetRangeKeys = (kind: PresetKind): { startDate: string; endDate: string } => {
  const end = yesterdayKeyBR();
  if (kind === "yesterday") return { startDate: end, endDate: end }; // só o dia anterior fechado
  if (kind === "month") {
    const start = `${todayKeyBR().slice(0, 8)}01`; // 1º dia do mês atual (BRT)
    return { startDate: start, endDate: end < start ? start : end };
  }
  const days = kind === "7d" ? 7 : kind === "14d" ? 14 : 30;
  return { startDate: addDaysKey(end, -(days - 1)), endDate: end };
};

/** Mesmo intervalo, como objetos Date (para componentes que usam {from, to}). */
export const presetRangeDates = (kind: PresetKind): { from: Date; to: Date } => {
  const { startDate, endDate } = presetRangeKeys(kind);
  return { from: parseDateOnly(startDate) as Date, to: parseDateOnly(endDate) as Date };
};
