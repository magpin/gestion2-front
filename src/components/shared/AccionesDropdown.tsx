"use client";

import { Fragment } from "react";
import type { LucideIcon } from "lucide-react";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export interface DropdownAccion {
  label: string;
  onSelect: () => void;
  icon?: LucideIcon;
  variant?: "default" | "destructive";
  disabled?: boolean;
  // Inserta un separador antes de esta acción (para agrupar destructivas).
  separadorAntes?: boolean;
}

interface AccionesDropdownProps {
  acciones: DropdownAccion[];
  // Disparador a medida; si se omite se usa un botón "⋯".
  trigger?: React.ReactElement;
  align?: "start" | "center" | "end";
}

// Menú de acciones para el "⋯ según estado" de los listados
// (cotizaciones, ventas, OT, etc.).
export function AccionesDropdown({
  acciones,
  trigger,
  align = "end",
}: AccionesDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          trigger ?? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Más acciones"
              className="size-8 p-0"
            >
              <MoreHorizontal size={16} strokeWidth={1.5} />
            </Button>
          )
        }
      />
      <DropdownMenuContent align={align} className="min-w-44">
        {acciones.map((accion) => (
          // `Fragment` y no un `div`: el menú de Base UI recorre sus ítems
          // para moverse con el teclado, y un envoltorio en el medio lo
          // rompe. Se nota recién al usarlo, y hasta hoy no lo usaba nadie.
          <Fragment key={accion.label}>
            {accion.separadorAntes && <DropdownMenuSeparator />}
            <DropdownMenuItem
              variant={accion.variant ?? "default"}
              disabled={accion.disabled}
              onClick={accion.onSelect}
            >
              {accion.icon && <accion.icon size={15} strokeWidth={1.5} />}
              {accion.label}
            </DropdownMenuItem>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
