/**
 * Persistência do `ref` do programa de afiliados.
 *
 * Quando alguém clica em https://marketdash.com.br/?ref=42, o `42` é guardado
 * em localStorage com TTL de 30 dias. O valor é enviado no payload do primeiro
 * login para o backend gravar `users.referrer_user_id`.
 */

const STORAGE_KEY = "affiliate_ref";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

interface StoredRef {
  value: string;
  expiresAt: number;
}

export function setAffiliateRef(ref: string): void {
  if (!/^\d+$/.test(ref)) return;
  const payload: StoredRef = { value: ref, expiresAt: Date.now() + TTL_MS };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage indisponível (modo privado/quotas) — ignorar silenciosamente.
  }
}

export function getAffiliateRef(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredRef;
    if (!parsed?.value || !parsed?.expiresAt) return null;
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const num = Number(parsed.value);
    return Number.isInteger(num) && num > 0 ? num : null;
  } catch {
    return null;
  }
}

export function clearAffiliateRef(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
