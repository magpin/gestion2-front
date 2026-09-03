"use client";

import type { ReactNode } from "react";

interface BotonAccionTablaProps {
  etiqueta: string;
  onClick: () => void;
  icono: ReactNode;
  destructivo?: boolean;
}

// Botón de icono para la columna "Acciones" de las tablas (Ver/Editar/Enviar/Anular…).
// Muestra la acción directamente en la fila en vez de esconderla tras un menú de 3 puntos.
export function BotonAccionTabla({
  etiqueta,
  onClick,
  icono,
  destructivo = false,
}: BotonAccionTablaProps) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      onClick={(evento) => {
        // Reason: evita que el click de la acción dispare el onRowClick de la fila.
        evento.stopPropagation();
        onClick();
      }}
      className={
        destructivo
          ? "rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-destructive/12 hover:text-destructive"
          : "rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
      }
    >
      {icono}
    </button>
  );
}
