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
import { productosApi } from "../services/inventario.service";
import type { ProductoResumen } from "../types/inventario.types";

/**
 * Buscador de producto: por código o nombre, solo entre los activos.
 *
 * Mismo patrón que `SelectorCuenta`: un producto puede llegar a ser un
 * catálogo de cientos de filas, y buscar es la única forma usable de elegir
 * uno para cambiarle el precio o registrarle un movimiento.
 */
export function SelectorProducto({
  valor,
  onElegir,
  invalido,
}: {
  valor: ProductoResumen | null;
  onElegir: (producto: ProductoResumen) => void;
  invalido?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const { data: pagina, isFetching } = useQuery({
    queryKey: ["productos", "selector", busqueda],
    queryFn: () => productosApi.listar({ q: busqueda.trim() || undefined }),
    enabled: abierto,
    staleTime: 60_000,
  });
  const productos = pagina?.datos ?? [];

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger
        render={<Button type="button" variant="outline" />}
        aria-invalid={invalido || undefined}
        className="h-11 w-full justify-between rounded-xl px-4 font-normal aria-invalid:border-danger"
      >
        <span className={cn("truncate", valor ? "" : "text-muted-foreground")}>
          {valor ? (
            <>
              <span className="font-mono text-xs">{valor.codigo}</span>
              <span className="mx-2 text-muted-foreground">·</span>
              {valor.nombre}
            </>
          ) : (
            "Seleccione un producto"
          )}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>

      <PopoverContent className="w-(--anchor-width) min-w-96 p-0" align="start">
        <div className="border-b border-border p-3">
          <Input
            autoFocus
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Código o nombre"
            className="h-11 rounded-xl px-4"
            aria-label="Buscar producto"
          />
        </div>

        <div className="max-h-72 overflow-y-auto p-2">
          {isFetching && (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )}

          {!isFetching &&
            productos.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onElegir(p);
                  setAbierto(false);
                  setBusqueda("");
                }}
                className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent"
              >
                <Check
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    p.id === valor?.id ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {p.codigo}
                    </span>
                    <span className="truncate text-sm font-medium">{p.nombre}</span>
                  </span>
                </span>
              </button>
            ))}

          {!isFetching && productos.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Ningún producto coincide.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
