"use client";

import { cn } from "@/lib/utils";

export interface PestanaModulo<T extends string> {
  id: T;
  label: string;
  /** La cifra a la derecha del nombre: cuántos hay en esa lista. */
  conteo?: number;
}

/**
 * Las pestañas de un módulo que agrupa varios listados.
 *
 * Subrayado y no pastilla, a propósito: la pastilla ya es la forma de un chip
 * de filtro, y con las dos cosas iguales en la misma pantalla había que probar
 * para saber cuál cambiaba la tabla entera y cuál solo la acotaba. Cambiar de
 * pestaña cambia las columnas y el total; filtrar, no.
 *
 * Van bajo el título, vía `PageHeader`, porque el título dice dónde estás
 * parado y la pestaña es la decisión que se toma justo después.
 */
export function PestanasModulo<T extends string>({
  opciones,
  valor,
  onChange,
  etiqueta,
  linea = true,
}: {
  opciones: PestanaModulo<T>[];
  valor: T;
  onChange: (valor: T) => void;
  /** Qué se está eligiendo. Lo lee un lector de pantalla antes de la lista. */
  etiqueta: string;
  /**
   * La regla gris sobre la que se apoya el subrayado.
   *
   * Se apaga cuando el contenedor ya trae la suya —el encabezado del panel de
   * proceso, por ejemplo—: dos líneas a distinta altura se leen como un error
   * de alineación, no como una separación.
   */
  linea?: boolean;
}) {
  return (
    <div
      role="tablist"
      aria-label={etiqueta}
      className={cn("flex items-center", linea && "border-b border-border")}
    >
      {opciones.map((opcion) => {
        const activa = opcion.id === valor;
        return (
          <button
            key={opcion.id}
            type="button"
            role="tab"
            aria-selected={activa}
            onClick={() => onChange(opcion.id)}
            className={cn(
              "relative mr-6 px-1 pb-3 pt-2.5 text-sm font-semibold transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-t-sm",
              activa
                ? "text-foreground after:bg-ring"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opcion.label}
            {opcion.conteo !== undefined && (
              <span className="ml-1.5 font-mono text-[11px] font-medium tabular-nums text-muted-foreground">
                {opcion.conteo}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
