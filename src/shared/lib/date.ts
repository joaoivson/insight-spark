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
