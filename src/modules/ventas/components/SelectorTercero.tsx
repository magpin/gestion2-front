"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { tercerosApi } from "@/modules/terceros/services/terceros.service";
import type { TerceroResumen } from "@/modules/terceros/types/terceros.types";

/**
 * Buscador de cliente: por nombre o documento, solo entre los que están
 * marcados como cliente. Mismo patrón que `SelectorCuenta`/`SelectorProducto`.
 */
export function SelectorTercero({
  valor,
  onElegir,
  invalido,
}: {
  valor: TerceroResumen | null;
  onElegir: (tercero: TerceroResumen) => void;
  invalido?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const { data: pagina, isFetching } = useQuery({
    queryKey: ["terceros", "selector-cliente", busqueda],
    queryFn: () =>
      tercerosApi.listar({ q: busqueda.trim() || undefined, esCliente: true }),
    enabled: abierto,
    staleTime: 60_000,
  });
  const terceros = pagina?.datos ?? [];

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger
        render={<Button type="button" variant="outline" />}
        aria-invalid={invalido || undefined}
        className="h-11 w-full justify-between rounded-xl px-4 font-normal aria-invalid:border-danger"
      >
        <span className={cn("truncate", valor ? "" : "text-muted-foreground")}>
          {valor ? valor.nombre : "Seleccione un cliente"}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>

      <PopoverContent className="w-(--anchor-width) min-w-96 p-0" align="start">
        <div className="border-b border-border p-3">
          <Input
            autoFocus
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Nombre o documento"
            className="h-11 rounded-xl px-4"
            aria-label="Buscar cliente"
          />
        </div>

        <div className="max-h-72 overflow-y-auto p-2">
          {isFetching && (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )}

          {!isFetching &&
            terceros.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onElegir(t);
                  setAbierto(false);
                  setBusqueda("");
                }}
                className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent"
              >
                <Check
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    t.id === valor?.id ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {t.nombre}
                  </span>
                  <span className="block font-mono text-xs text-muted-foreground">
                    {t.tipoDocumento} {t.numeroDocumento}
                  </span>
                </span>
              </button>
            ))}

          {!isFetching && terceros.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Ningún cliente coincide.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
