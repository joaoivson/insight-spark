import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

type UpgradeProModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const BENEFITS = [
  "Páginas de captura pra grupo de WhatsApp",
  "Até 30 links rastreáveis que não quebram",
  "Gere seu link de afiliado com Sub ID dentro da plataforma",
  "Suporte prioritário",
];

export function UpgradeProModal({ open, onOpenChange }: UpgradeProModalProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Disponível no plano Pro</DialogTitle>
          <DialogDescription>
            Página de Captura e Meus Links fazem parte do Pro.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 py-2">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <DialogFooter className="gap-2 sm:gap-0">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
