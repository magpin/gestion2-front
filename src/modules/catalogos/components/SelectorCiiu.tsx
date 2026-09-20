"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ciiuApi } from "../services/catalogos.service";

interface Props {
  id: string;
  valor: string | null;
  /** Devuelve el código y el nombre oficial, para congelarlo junto a la actividad. */
  onCambio: (codigo: string, nombre: string) => void;
  /**
   * 'DIAN' trae las cinco clasificaciones de personas naturales sin actividad
   * (asalariado, pensionado, rentista). Sin filtro vienen las dos, que es lo que
   * necesita el selector del RUT.
   */
  origen?: "DANE" | "DIAN";
  invalido?: boolean;
  /** La escala la decide la pantalla: el asistente mide 44px, el resto no. */
  className?: string;
}

/**
 * Buscador de actividad económica contra el catálogo CIIU Rev. 4 A.C.
 *
 * Antes acá había dos `Input` de texto: uno para el código de cuatro dígitos y
 * otro para escribir la descripción a mano. Eso significaba que la descripción
 * dependía de lo que alguien recordara, y que un código inexistente solo se
 * descubría cuando la base lo rechazaba con un error de clave foránea.
 *
 * La búsqueda va al servidor y mira nombre y código a la vez: quien tiene el RUT
 * delante escribe "4741", y quien no, escribe "computadores". Ignora tildes.
 */
export function SelectorCiiu({ id, valor, onCambio, origen, invalido, className }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const { data, isFetching } = useQuery({
    queryKey: ["ciiu", busqueda, origen ?? "todos"],
    queryFn: () => ciiuApi.buscar({ q: busqueda || undefined, origen }),
    enabled: abierto,
    staleTime: 10 * 60_000,
  });

  // El catálogo no cambia entre sesiones, así que la clase elegida se cachea
  // aparte y sobrevive a que se cierre el popover.
  const { data: elegida } = useQuery({
    queryKey: ["ciiu", "clase", valor],
    queryFn: () => ciiuApi.clase(valor!),
    enabled: Boolean(valor),
    staleTime: 60 * 60_000,
  });

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger
        render={<Button type="button" variant="outline" />}
        id={id}
        aria-invalid={invalido || undefined}
        className={cn("w-full justify-between font-normal aria-invalid:border-danger", className)}
      >
        <span className={`truncate ${valor ? "" : "text-muted-foreground"}`}>
          {elegida ? (
            <>
              <span className="font-mono">{elegida.codigo}</span> · {elegida.nombre}
            </>
          ) : (
            "Buscar actividad económica"
          )}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="border-b border-border p-2">
          <Input
            autoFocus
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Código o actividad: 4741, computadores…"
            className="h-9"
            aria-label="Buscar actividad económica"
          />
        </div>

        <div className="max-h-72 overflow-y-auto p-1">
          {isFetching && (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
            </div>
          )}

          {!isFetching &&
            (data ?? []).map((c) => (
              <button
                key={c.codigo}
                type="button"
                onClick={() => {
                  onCambio(c.codigo, c.nombre);
                  setAbierto(false);
                }}
                className="flex w-full items-start gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
              >
                <Check
                  className={`mt-0.5 size-3.5 shrink-0 ${c.codigo === valor ? "opacity-100" : "opacity-0"}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="font-mono text-xs">{c.codigo}</span>
                    {c.origen === "DIAN" && (
                      <span className="rounded bg-muted px-1 text-[10px] text-muted-foreground">
                        sin actividad
                      </span>
                    )}
                  </span>
                  <span className="block truncate">{c.nombre}</span>
                  {/* El árbol ubica la actividad: dos clases pueden llamarse
                      parecido y estar en sectores distintos. */}
                  {c.seccion_nombre && (
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {c.seccion_nombre} › {c.division_nombre}
                    </span>
                  )}
                </span>
              </button>
            ))}

          {!isFetching && (data ?? []).length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Sin resultados</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
