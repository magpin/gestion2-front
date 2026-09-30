"use client";

import { useRef, useState, type ReactElement } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Al pasar el mouse por encima de una opción cuyo nombre se cortó con «…», un
 * tooltip lo muestra completo (pedido del dueño, 30-09). Con un nombre que
 * cabe, no aparece: sería ruido.
 *
 * `children` es el elemento que recibe el mouse (la opción entera); adentro, el
 * texto que se puede cortar lleva `data-recortable`.
 */
export function ConNombreCompleto({
  texto,
  children,
}: {
  texto: string;
  children: ReactElement;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [abierto, setAbierto] = useState(false);

  const recortado = () => {
    const el = ref.current?.querySelector<HTMLElement>("[data-recortable]") ?? ref.current;
    return el !== null && el !== undefined && el.scrollWidth > el.clientWidth;
  };

  return (
    <Tooltip open={abierto} onOpenChange={(o) => setAbierto(o && recortado())}>
      <TooltipTrigger ref={ref} delay={300} render={children} />
      <TooltipContent side="right" align="center" className="max-w-sm text-left leading-snug">
        {texto}
      </TooltipContent>
    </Tooltip>
  );
}
