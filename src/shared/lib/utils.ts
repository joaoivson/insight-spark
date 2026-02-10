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
  
  return cleaned;
}

