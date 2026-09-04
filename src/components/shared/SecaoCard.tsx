import { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

type SecaoCardProps = {
  icon?: ReactNode;
  /** Classe do quadrado do ícone (cor de fundo), ex.: "bg-blue-500/10". */
  iconBoxClassName?: string;
  title: string;
  description?: ReactNode;
  /** Ação principal da seção (ex.: "Adicionar conta") ao lado do título. */
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/**
 * Card padrão das seções de Configurações. A densidade é a régua de TODAS as
 * seções — mudar aqui muda em todas de uma vez, que é o ponto: apertar tela a
 * tela desalinha o cabeçalho de uma contra o da vizinha.
 *
 * Critério de aceite da rodada: em Operação › Parâmetros os 7 dias cabem sem
 * scroll em 1366×768 e 1280×720, com o rodapé fixo na tela.
 */
export const SecaoCard = ({
  icon,
  iconBoxClassName,
  title,
  description,
  action,
  children,
  className,
}: SecaoCardProps) => (
  <div className={cn("bg-card border border-border rounded-2xl p-3.5", className)}>
    <div className="flex flex-col gap-2.5 mb-2.5 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-2.5 min-w-0">
        {icon && (
          <div
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 [&>svg]:w-4 [&>svg]:h-4",
              iconBoxClassName ?? "bg-accent"
            )}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-foreground leading-tight">{title}</h3>
          {description && (
            <p className="text-xs leading-snug text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
    {children}
  </div>
);

export default SecaoCard;
