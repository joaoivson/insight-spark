/**
 * Formatação compartilhada do painel admin.
 *
 * Nomes vêm do cadastro da Kiwify em minúsculo e campos como método de pagamento
 * e tipo de evento chegam crus da API — traduzir num único lugar evita cada tela
 * inventar o seu.
 */

const PARTICULAS = new Set(["de", "da", "do", "das", "dos", "e", "di", "du", "van", "von", "la"]);

/** Title Case preservando partículas: "rubiane de melo" → "Rubiane de Melo". */
export function capitalizeName(nome?: string | null): string {
  if (!nome) return "";
  return nome
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((parte, i) => {
      const baixo = parte.toLowerCase();
      if (i > 0 && PARTICULAS.has(baixo)) return baixo;
      if (baixo.includes("'")) {
        return baixo
          .split("'")
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join("'");
      }
      return baixo.charAt(0).toUpperCase() + baixo.slice(1);
    })
    .join(" ");
}

const METODOS_PAGAMENTO: Record<string, string> = {
  credit_card: "Cartão de crédito",
  creditcard: "Cartão de crédito",
  automatic_pix: "PIX automático",
  pix: "PIX",
  boleto: "Boleto",
  bank_slip: "Boleto",
};

/** Método de pagamento em português; desconhecido volta cru (não quebra). */
export function translatePaymentMethod(metodo?: string | null): string {
  if (!metodo) return "—";
  return METODOS_PAGAMENTO[metodo.trim().toLowerCase()] || metodo;
}

const EVENTOS: Record<string, string> = {
  order_approved: "Compra aprovada",
  compra_aprovada: "Compra aprovada",
  subscription_renewed: "Assinatura renovada",
  subscription_canceled: "Assinatura cancelada",
  subscription_late: "Pagamento recusado",
  order_refunded: "Reembolso",
  compra_reembolsada: "Reembolso",
  order_chargedback: "Chargeback",
  chargeback: "Chargeback",
  order_refused: "Pagamento recusado",
  compra_recusada: "Pagamento recusado",
};

/** Evento da timeline em português; desconhecido volta cru (não quebra). */
export function translateEventType(evento?: string | null): string {
  if (!evento) return "—";
  return EVENTOS[evento.trim().toLowerCase()] || evento;
}

/**
 * Rótulo da coluna "Próx. cobrança".
 *
 * Cancelado c/ acesso usa ano de 2 dígitos ("até 10/09/26"): o texto completo
 * "Acesso até 10/09/2026" estourava a célula e invadia a coluna Total pago.
 */
export function nextChargeLabel(
  status: string | undefined,
  data: string | null | undefined,
): string {
  if (!data) return "—";
  const d = new Date(data);
  if (status === "cancelado_com_acesso") {
    const curta = d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
    return `até ${curta}`;
  }
  return d.toLocaleDateString("pt-BR");
}
