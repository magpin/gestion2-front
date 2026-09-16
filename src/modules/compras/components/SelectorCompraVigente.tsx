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
import { cn, formatCOP } from "@/lib/utils";
import { comprasApi } from "../services/compras.service";
import type { CompraDocumentoResumen } from "../types/compras.types";

/**
 * Elegir la compra que una nota del proveedor corrige. Solo entre las
 * `EMITIDA`: una anulada ya no se corrige, y el backend la rechazaría igual.
 *
 * Gemelo de `SelectorFacturaVigente` de `ventas`, con la misma limitación
 * escrita allá: `/compras` no busca por texto todavía, así que la búsqueda es
 * sobre la página ya traída.
 */
export function SelectorCompraVigente({
  valor,
  onElegir,
}: {
  valor: CompraDocumentoResumen | null;
  onElegir: (compra: CompraDocumentoResumen) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const { data: pagina, isFetching } = useQuery({
    queryKey: ["compras", "selector-vigente"],
    queryFn: () => comprasApi.listar({}),
    enabled: abierto,
    staleTime: 30_000,
  });

  const q = busqueda.trim().toLowerCase();
  const compras = (pagina?.datos ?? [])
    .filter((c) => c.estado === "EMITIDA")
    .filter((c) => {
      if (q === "") return true;
      const numero = c.numero_factura_proveedor.toLowerCase();
      return numero.includes(q) || c.tercero_nombre.toLowerCase().includes(q);
    });

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger
        render={<Button type="button" variant="outline" />}
        className="h-11 w-full justify-between rounded-xl px-4 font-normal"
      >
        <span className={cn("truncate", valor ? "" : "text-muted-foreground")}>
          {valor
            ? `${valor.numero_factura_proveedor} · ${valor.tercero_nombre}`
            : "Seleccione una compra"}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>

      <PopoverContent className="w-(--anchor-width) min-w-96 p-0" align="start">
        <div className="border-b border-border p-3">
          <Input
            autoFocus
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Número o proveedor"
            className="h-11 rounded-xl px-4"
            aria-label="Buscar compra"
          />
        </div>

        <div className="max-h-72 overflow-y-auto p-2">
          {isFetching && (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )}

          {!isFetching &&
            compras.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onElegir(c);
                  setAbierto(false);
                  setBusqueda("");
                }}
                className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent"
              >
                <Check
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    c.id === valor?.id ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {c.numero_factura_proveedor}
                    </span>
                    <span className="font-mono text-xs font-semibold">
                      {formatCOP(Number(c.neto_a_pagar))}
                    </span>
                  </span>
                  <span className="block truncate text-sm font-medium">
                    {c.tercero_nombre}
                  </span>
                </span>
              </button>
            ))}

          {!isFetching && compras.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Ninguna compra vigente coincide.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
