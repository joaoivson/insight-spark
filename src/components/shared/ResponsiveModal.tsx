import { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/shared/lib/utils";

interface ResponsiveModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  /** Classe extra aplicada ao container de conteúdo (DialogContent no desktop). */
  contentClassName?: string;
}

/**
 * Modal responsivo: Dialog centralizado no desktop, Drawer de baixo no mobile.
 * Padrão obrigatório da skill ui-shadcn-premium para criação/edição.
 */
export function ResponsiveModal({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  contentClassName,
}: ResponsiveModalProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
        <DrawerContent className="max-h-[90vh] bg-background" style={{ backgroundColor: "hsl(var(--background))" }}>
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
            {description && <DrawerDescription>{description}</DrawerDescription>}
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {/*
        `max-h` + `overflow-y-auto`: o `DialogContent` do shadcn é
        `position: fixed` com `top-50% translate-y-[-50%]` e SEM teto de altura.
        Conteúdo mais alto que a janela transbordava pelas duas pontas (o Radix
        ainda trava `overflow: hidden` no body, então não havia nem a rolagem da
        página como escape) e o último filho — quase sempre o botão de concluir
        — ficava inalcançável. Só no desktop: o caminho mobile é Drawer, que já
        tem `max-h-[90vh]` e área rolável.
      */}
      <DialogContent className={cn("sm:max-w-lg max-h-[85vh] overflow-y-auto",
                                   contentClassName)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
