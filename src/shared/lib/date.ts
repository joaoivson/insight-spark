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
  return parseDDMMYYYY(trimmed);
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
