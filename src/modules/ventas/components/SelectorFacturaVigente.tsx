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
import { facturasApi } from "../services/ventas.service";
import type { VentaDocumentoResumen } from "../types/ventas.types";

/**
 * Elegir la factura que una nota crédito va a corregir. Solo entre las
 * `EMITIDA` — una ya anulada no se puede corregir dos veces, y el backend
 * la rechazaría igual.
 *
 * El backend no busca por texto en `/facturas` todavía (`listar` solo
 * filtra por `terceroId`), así que la búsqueda acá es sobre la página ya
 * traída — alcanza para el volumen de una empresa chica; se resuelve del
 * lado del servidor el día que haga falta.
 */
export function SelectorFacturaVigente({
  valor,
  onElegir,
}: {
  valor: VentaDocumentoResumen | null;
  onElegir: (factura: VentaDocumentoResumen) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const { data: pagina, isFetching } = useQuery({
    queryKey: ["facturas", "selector-vigente"],
    queryFn: () => facturasApi.listar({}),
    enabled: abierto,
    staleTime: 30_000,
  });

  const q = busqueda.trim().toLowerCase();
  const facturas = (pagina?.datos ?? [])
    .filter((f) => f.estado === "EMITIDA")
    .filter((f) => {
      if (q === "") return true;
      const numero = `${f.prefijo ?? ""}${f.consecutivo}`.toLowerCase();
      const cliente = f.tercero_nombre.toLowerCase();
      return numero.includes(q) || cliente.includes(q);
    });

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger
        render={<Button type="button" variant="outline" />}
        className="h-11 w-full justify-between rounded-xl px-4 font-normal"
      >
        <span className={cn("truncate", valor ? "" : "text-muted-foreground")}>
          {valor
            ? `${valor.prefijo ?? ""}${valor.consecutivo} · ${valor.tercero_nombre}`
            : "Seleccione una factura"}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>

      <PopoverContent className="flex max-h-(--available-height) w-(--anchor-width) min-w-96 flex-col p-0" align="start">
        <div className="border-b border-border p-3">
          <Input
            autoFocus
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Número o cliente"
            className="h-11 rounded-xl px-4"
            aria-label="Buscar factura"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {isFetching && (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )}

          {!isFetching &&
            facturas.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  onElegir(f);
                  setAbierto(false);
                  setBusqueda("");
                }}
                className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent"
              >
                <Check
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    f.id === valor?.id ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {f.prefijo ?? ""}
                      {f.consecutivo}
                    </span>
                    <span className="font-mono text-xs font-semibold">
                      {formatCOP(Number(f.total))}
                    </span>
                  </span>
                  <span className="block truncate text-sm font-medium">
                    {f.tercero_nombre}
                  </span>
                </span>
              </button>
            ))}

          {!isFetching && facturas.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Ninguna factura vigente coincide.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
