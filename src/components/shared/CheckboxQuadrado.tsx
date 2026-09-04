import { forwardRef } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/shared/lib/utils";

/**
 * Checkbox com canto quadrado.
 *
 * O `<Checkbox>` do shadcn aplica `rounded-sm`, que resolve para
 * `calc(var(--radius) - 4px)`. Com `--radius: 0.75rem` (index.css) isso dá 8px
 * numa caixa de **16px** — raio igual a metade do lado, ou seja, um círculo.
 * O controle é checkbox de verdade e a multi-seleção funciona; o que engana é
 * só a borda, e ela engana o suficiente para a afiliada assumir que só pode
 * escolher uma opção.
 *
 * É um wrapper, e não uma edição de `components/ui/checkbox.tsx`, porque
 * `npx shadcn add checkbox` sobrescreve aquele arquivo sem aviso.
 *
 * O defeito é GLOBAL — vale para todos os usos de `<Checkbox>` no app. Este
 * wrapper foi aplicado ao módulo de campanhas de grupos; as demais telas
 * continuam com o raio do tema até serem revisadas.
 */
export const CheckboxQuadrado = forwardRef<
  React.ElementRef<typeof Checkbox>,
  React.ComponentPropsWithoutRef<typeof Checkbox>
>(({ className, ...props }, ref) => (
  <Checkbox ref={ref} className={cn("rounded-[4px]", className)} {...props} />
));
CheckboxQuadrado.displayName = "CheckboxQuadrado";
