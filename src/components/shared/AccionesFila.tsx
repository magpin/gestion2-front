"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface AccionFila {
  /** Lo que hace, en infinitivo. Va al `title` y al `aria-label`. */
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  /** Rojo para lo que destruye: anular, borrar. */
  variant?: "default" | "destructive";
  /** Separa visualmente lo destructivo del resto. */
  separadorAntes?: boolean;
}

/**
 * La columna de acciones de una tabla: los botones a la vista, solo iconos.
 *
 * Lo que no aplica **no se dibuja**, en vez de aparecer apagado: un botón
 * deshabilitado no recibe foco, así que un lector de pantalla lo anuncia sin
 * poder llegar a él. Quien arma la lista decide qué entra.
 *
 * Ver también `MenuFila`, que toma la misma lista y la pinta detrás de «⋯» con
 * el icono y su texto al lado.
 */
export function AccionesFila({ acciones }: { acciones: AccionFila[] }) {
  if (acciones.length === 0) return null;

  return (
    // `stopPropagation` en el contenedor: sin esto, el clic en un botón dispara
    // además el `onRowClick` de la fila y se abren dos cosas a la vez.
    <div
      className="flex items-center justify-end gap-1"
      onClick={(evento) => evento.stopPropagation()}
    >
      {acciones.map((accion) => {
        const Icono = accion.icon;
        return (
          <Button
            key={accion.label}
            variant="ghost"
            size="icon-sm"
            title={accion.label}
            aria-label={accion.label}
            onClick={accion.onSelect}
            className={cn(
              accion.separadorAntes && "ml-1 border-l border-border pl-2",
              accion.variant === "destructive" && "text-destructive hover:text-destructive",
            )}
          >
            <Icono size={15} strokeWidth={1.75} />
          </Button>
        );
      })}
    </div>
  );
}

/**
 * La misma lista de acciones, detrás de un «⋯».
 *
 * Cada opción lleva icono Y texto: el icono solo obliga a adivinar —o a parar
 * encima a esperar el `title`— qué hace «⇗» o «⊘» en esta tabla en concreto, y
 * el resto de la aplicación ya nombra sus botones al lado del icono.
 *
 * El menú también deja crecer la lista: en la fila, cada acción nueva es un
 * icono más que angosta las columnas que sí tienen datos.
 */
export function MenuFila({ acciones }: { acciones: AccionFila[] }) {
  const [abierto, setAbierto] = useState(false);

  if (acciones.length === 0) return null;

  return (
    // `stopPropagation` en el contenedor: sin esto, abrir el menú dispara además
    // el `onRowClick` de la fila y se abren dos cosas a la vez.
    <div
      className="flex items-center justify-end"
      onClick={(evento) => evento.stopPropagation()}
    >
      <Popover open={abierto} onOpenChange={setAbierto}>
        <PopoverTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="Acciones de la fila">
              <MoreHorizontal size={16} strokeWidth={1.75} aria-hidden="true" />
            </Button>
          }
        />

        <PopoverContent align="end" className="w-[212px] gap-0 p-1.5">
          {acciones.map((accion) => {
            const Icono = accion.icon;
            return (
              <button
                key={accion.label}
                type="button"
                onClick={() => {
                  setAbierto(false);
                  accion.onSelect();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted",
                  // Lo destructivo va abajo y separado, para que no quede pegado
                  // a la opción que se usa todos los días.
                  accion.separadorAntes && "mt-1.5 border-t border-border pt-2.5",
                  accion.variant === "destructive" && "text-destructive",
                )}
              >
                <Icono
                  size={16}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  className={cn(
                    "shrink-0",
                    accion.variant !== "destructive" && "text-muted-foreground",
                  )}
                />
                {accion.label}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** La cabecera de esa columna: alineada a la derecha, como sus botones. */
export function cabeceraAcciones() {
  return <div className="text-right">Acciones</div>;
}
