import { cn } from "@/shared/lib/utils";

/** Faixa âmbar discreta para conta demo. */
export function DemoDataBanner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200/90",
        className,
      )}
    >
      <strong className="font-medium">Dados demonstrativos</strong>
      {" — "}
      esta conta usa dados fictícios para treinamento.
    </div>
  );
}
