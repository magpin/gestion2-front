"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { NOMBRE_PREFERENCIA, useTema, type Preferencia } from "@/lib/tema";

const ICONO = { claro: Sun, oscuro: Moon, sistema: Monitor } as const;

/**
 * Claro, oscuro o el del sistema.
 *
 * Tres opciones y no un interruptor de dos: quien pone el computador entero en
 * oscuro al anochecer espera que el sistema lo siga, y quien quiere uno fijo
 * lo elige. La opción marcada dice cuál está puesta, no cuál se vería.
 *
 * `oscuro` es una variante del riel y de otras superficies oscuras, donde el
 * botón va sobre fondo oscuro en los dos temas.
 */
export function BotonTema({ variante = "normal" }: { variante?: "normal" | "riel" }) {
  const { preferencia, tema, cambiar } = useTema();
  const Icono = ICONO[preferencia === "sistema" ? tema : preferencia];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={`Tema: ${NOMBRE_PREFERENCIA[preferencia].toLowerCase()}`}
            className={cn(
              "grid size-9 place-items-center rounded-lg transition-colors",
              variante === "riel"
                ? "text-rail-muted hover:bg-white/10 hover:text-rail-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icono className="size-[18px]" strokeWidth={1.75} />
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-48">
        {(Object.keys(NOMBRE_PREFERENCIA) as Preferencia[]).map((p) => {
          const IconoOpcion = ICONO[p];
          return (
            <DropdownMenuItem key={p} onClick={() => cambiar(p)}>
              <IconoOpcion className="size-4" />
              <span className="flex-1">{NOMBRE_PREFERENCIA[p]}</span>
              {preferencia === p && <Check className="size-4" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
