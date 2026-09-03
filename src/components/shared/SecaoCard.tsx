import { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

type SecaoCardProps = {
  icon?: ReactNode;
  /** Classe do quadrado do ícone (cor de fundo), ex.: "bg-blue-500/10". */
  iconBoxClassName?: string;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/**
 * Card padrão das seções de Configurações. A densidade (título text-base,
 * descrição text-xs, p-4) é a régua de TODAS as abas — mudar aqui muda em
 * todas de uma vez, nunca tela a tela.
 */
export const SecaoCard = ({
  icon,
  iconBoxClassName,
  title,
  description,
  children,
  className,
}: SecaoCardProps) => (
  <div className={cn("bg-card border border-border rounded-2xl p-4 md:p-5", className)}>
    <div className="flex items-start gap-3 mb-4">
      {icon && (
        <div
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
            iconBoxClassName ?? "bg-accent"
          )}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <h3 className="text-base font-bold text-foreground leading-tight">{title}</h3>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
    </div>
    {children}
  </div>
);

export default SecaoCard;
