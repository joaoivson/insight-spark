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

/**
 * Parse time string (HH:mm or HH:mm:ss) and return hour range label.
 * e.g. "10:15" → "Entre 10 e 11:00", "08:30" → "Entre 08 e 09:00"
 */
export const formatHourRange = (time?: string | null): string => {
  if (!time || typeof time !== "string") return "—";
  const trimmed = time.trim();
  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?/);
  if (!match) return "—";
  const hour = parseInt(match[1], 10);
  if (isNaN(hour) || hour < 0 || hour > 23) return "—";
  const h = String(hour).padStart(2, "0");
  const hNext = String((hour + 1) % 24).padStart(2, "0");
  return `Entre ${h} e ${hNext}:00`;
};
