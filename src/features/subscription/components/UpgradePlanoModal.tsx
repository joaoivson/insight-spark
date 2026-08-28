import { ResponsiveModal } from "@/components/shared/ResponsiveModal";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MAX_ONLY_MENUS } from "@/shared/lib/plans";

type UpgradePlanoModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Menu que a pessoa tentou abrir — decide qual plano o modal oferece. */
  menuKey?: string;
};

const CONTEUDO = {
  pro: {
    titulo: "Disponível no plano Pro",
    descricao: "Página de Captura e Meus Links fazem parte do Pro.",
    beneficios: [
      "Páginas de captura pra grupo de WhatsApp",
      "Até 30 links rastreáveis que não quebram",
      "Gere seu link de afiliado com Sub ID dentro da plataforma",
      "Suporte prioritário",
    ],
  },
  max: {
    titulo: "Disponível no plano Max",
    descricao: "A Automação Instagram faz parte do Max.",
    beneficios: [
      "Automação de Instagram: comentou a palavra-chave, recebe o direct",
      "Resposta pública automática no comentário",
      "Páginas de captura e links rastreáveis ilimitados",
      "Todos os recursos do plano Pro inclusos",
    ],
  },
} as const;

export function UpgradePlanoModal({ open, onOpenChange, menuKey }: UpgradePlanoModalProps) {
  const navigate = useNavigate();
  // O menu bloqueado diz qual plano oferecer. Sem isso o modal dizia "plano Pro"
  // até para a Automação Instagram, que é exclusiva do Max — a pessoa fazia o
  // upgrade errado e continuava sem o recurso.
  const plano = menuKey && MAX_ONLY_MENUS.has(menuKey) ? "max" : "pro";
  const { titulo, descricao, beneficios } = CONTEUDO[plano];

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={titulo}
      description={descricao}
      contentClassName="sm:max-w-md"
    >
        <ul className="space-y-2 py-2">
          {beneficios.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Agora não
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              navigate("/dashboard/planos");
            }}
          >
            Fazer upgrade
          </Button>
        </div>
    </ResponsiveModal>
  );
}
