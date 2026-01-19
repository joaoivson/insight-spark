export const parseDateOnly = (value?: string | Date | null) => {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]) - 1;
    const d = Number(iso[3]);
    const local = new Date(y, m, d);
    return isNaN(local.getTime()) ? null : local;
  }
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
