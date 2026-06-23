import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normaliza o Sub ID removendo espaços extras e hifens no final (noise)
 */
export function normalizeSubId(subId: string | null | undefined): string {
  if (!subId) return "Sem Sub ID";
  let cleaned = String(subId).trim();
  if (cleaned === "NaN" || cleaned === "null" || cleaned === "") return "Sem Sub ID";
  
  // Remove hifens no final da string (noise comum na Shopee)
  cleaned = cleaned.replace(/-+$/, "").trim();
  
  // Se após a limpeza a string ficar vazia, retorna padrão
  if (cleaned === "") return "Sem Sub ID";

  return cleaned.toLowerCase();
}

/**
 * Rótulo PT do status do pedido para exibição/filtro. A Shopee já devolve quase tudo
 * normalizado em PT (Concluído/Pendente/Cancelado), mas "UNPAID" escapa do normalize do
 * backend — traduz aqui (label only; o valor do filtro continua sendo o status cru do banco).
 */
const STATUS_LABELS: Record<string, string> = {
  unpaid: "Não pago",
};
export function statusLabel(status: string | null | undefined): string {
  const s = (status || "").trim();
  return STATUS_LABELS[s.toLowerCase()] ?? s;
}

