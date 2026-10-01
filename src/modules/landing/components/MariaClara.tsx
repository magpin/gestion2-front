import type { ComponentProps } from "react";

import { Maria } from "@/modules/asistente/components/Maria";

/**
 * María sobre una superficie oscura (`rail`), clara en los dos temas.
 *
 * `invertida` no alcanza: invierte según el tema, y en oscuro —donde `--primary`
 * ya es claro— la dejaba negra sobre el panel negro. Acá se fijan sus dos
 * tintas solo para este envoltorio: disco claro, ojos oscuros. El punto naranja
 * no se toca.
 */
export function MariaClara({ className, ...props }: ComponentProps<typeof Maria>) {
  return (
    <span
      className={`inline-flex [--primary-foreground:var(--neutral-900)] [--primary:var(--neutral-0)] ${className ?? ""}`}
    >
      <Maria {...props} />
    </span>
  );
}
