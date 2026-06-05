import { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

export interface DataCardField {
  label: string;
  value: ReactNode;
  /** Destaca o valor (ex: valor monetário principal). */
  emphasis?: boolean;
}

interface DataCardProps {
  title: ReactNode;
  badge?: ReactNode;
  fields: DataCardField[];
  actions?: ReactNode;
  className?: string;
}

/**
 * Card de registro para uso no mobile, substituindo linhas de tabela densa.
 * Use em conjunto com `hidden md:block` na <Table> e `md:hidden` na lista de cards.
 */
export function DataCard({ title, badge, fields, actions, className }: DataCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 transition-colors",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground truncate">{title}</span>
            {badge}
          </div>
        </div>
        {actions && <div className="flex items-center gap-1 flex-shrink-0">{actions}</div>}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
        {fields.map((f, i) => (
          <div key={i} className="min-w-0">
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {f.label}
            </dt>
            <dd
              className={cn(
                "mt-0.5 truncate text-foreground",
                f.emphasis ? "text-base font-semibold" : "text-sm"
              )}
            >
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
