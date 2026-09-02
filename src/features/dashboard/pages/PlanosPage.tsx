import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/lib/utils";
import {
  FEATURES,
  checkoutFor,
  type PeriodId,
  type PlanId,
} from "@/shared/lib/plans";
import { usePlanStore } from "@/stores/planStore";
import { Check, Crown } from "lucide-react";

const PERIODS: { id: PeriodId; label: string }[] = [
  { id: "mensal", label: "Mensal" },
  { id: "trimestral", label: "Trimestral" },
  { id: "anual", label: "Anual" },
];

// Max lançado em 02/09/2026 junto com a Automação Instagram em produção.
const PLAN_ORDER: PlanId[] = ["essencial", "pro", "max"];

const PRO_EXTRAS = [
  "Páginas de captura (até 15)",
  "Links rastreáveis (até 30)",
  "Gerar link de afiliado com Sub ID",
  "Suporte prioritário",
];

const MAX_EXTRAS = [
  "Tudo do Pro incluído",
  "Automação de Instagram (comentário → direct)",
  "Páginas de captura e links ilimitados",
  "Suporte prioritário",
];

export default function PlanosPage() {
  const { context, fetch, plan } = usePlanStore();
  const [periodo, setPeriodo] = useState<PeriodId>("mensal");

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const currentPlan = (context?.plano || plan) as PlanId;

  const cards = useMemo(() => {
    return PLAN_ORDER.map((id) => {
      const cfg = FEATURES[id];
      const checkout = checkoutFor(id, periodo);
      const fromApi = context?.checkouts?.find(
        (c) => c.plano === id && c.periodo === periodo,
      );
      return {
        id,
        label: cfg.label,
        price: fromApi?.price ?? checkout?.price ?? "—",
        url: fromApi?.url ?? checkout?.url ?? "#",
        isCurrent: id === currentPlan,
        limites: cfg.limites,
      };
    });
  }, [context, currentPlan, periodo]);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-8 p-4 md:p-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Planos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha o plano que combina com o momento da sua operação.
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriodo(p.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                periodo === p.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.id}
              className={cn(
                "relative flex flex-col rounded-xl border border-border p-6",
                card.isCurrent && "border-primary/50 bg-primary/5",
              )}
            >
              {card.isCurrent && (
                <span className="absolute right-4 top-4 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                  Seu plano
                </span>
              )}
              <div className="flex items-center gap-2">
                {(card.id === "pro" || card.id === "max") && (
                  <Crown className={card.id === "max" ? "h-4 w-4 text-[#F0A94A]" : "h-4 w-4 text-primary"} />
                )}
                <h2 className="text-lg font-semibold">{card.label}</h2>
              </div>
              <p className="mt-3 text-3xl font-bold">
                R$ {card.price}
                <span className="text-sm font-normal text-muted-foreground">
                  /{periodo === "mensal" ? "mês" : periodo}
                </span>
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Dashboard, Campanhas e Upload de cliques
                </li>
                {card.id === "max"
                  ? MAX_EXTRAS.map((b) => (
                      <li key={b} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        {b}
                      </li>
                    ))
                  : card.id === "pro"
                  ? PRO_EXTRAS.map((b) => (
                      <li key={b} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        {b}
                      </li>
                    ))
                  : (
                    <li className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      Ideal para acompanhar ROAS e comissões
                    </li>
                  )}
              </ul>
              <Button
                className="mt-6 w-full"
                variant={card.isCurrent ? "outline" : "default"}
                disabled={card.isCurrent}
                onClick={() => {
                  if (card.url && card.url !== "#") {
                    window.open(card.url, "_blank", "noopener,noreferrer");
                  }
                }}
              >
                {card.isCurrent ? "Plano atual" : `Assinar ${card.label}`}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
