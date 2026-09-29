"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2, Pencil, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DialogoProducto, type ProductoEnEdicion } from "./DialogoProducto";
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
  const campoBusqueda = useRef<HTMLInputElement>(null);
  // El diálogo se abre CERRANDO el popover: dentro del `PopoverContent` se
  // desmontaría con él en el mismo clic.
  const [editando, setEditando] = useState<ProductoEnEdicion>(null);

  const abrirFicha = (que: ProductoEnEdicion) => {
    setAbierto(false);
    setEditando(que);
  };

  const { data: pagina, isFetching } = useQuery({
    queryKey: ["productos", "selector", busqueda],
    queryFn: () => productosApi.listar({ q: busqueda.trim() || undefined }),
    enabled: abierto,
    staleTime: 60_000,
  });
  const productos = pagina?.datos ?? [];

  /**
   * El lector de código de barras teclea el código y manda Enter. Si lo
   * digitado coincide **exacto** con el código de barras de un producto, se
   * elige sin pedir confirmación: ese es todo el punto de tener un lector.
   *
   * Exacto y no "el primero de la lista": con una coincidencia parcial se
   * elegiría un producto que nadie miró.
   */
  const elegirPorCodigoBarras = () => {
    const leido = busqueda.trim();
    if (leido === "") return;
    const exacto = productos.find((p) => p.codigo_barras === leido);
    if (exacto === undefined) return;
    onElegir(exacto);
    setAbierto(false);
    setBusqueda("");
  };

  return (
    <>
      <Popover open={abierto} onOpenChange={setAbierto}>
        <PopoverTrigger
          render={<Button type="button" variant="outline" />}
          aria-invalid={invalido || undefined}
          className="h-auto min-h-11 w-full justify-between rounded-xl px-4 py-2 text-left font-normal whitespace-normal aria-invalid:border-danger"
        >
          {/* El nombre entero, en hasta dos líneas, y el código debajo: en la
              tabla de líneas la celda es angosta y el nombre cortado no se lee. */}
          {valor ? (
            <span className="flex min-w-0 flex-col">
              <span className="line-clamp-2 text-sm">{valor.nombre}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {valor.codigo}
              </span>
            </span>
          ) : (
            <span className="truncate text-muted-foreground">
              Seleccione un producto
            </span>
          )}
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </PopoverTrigger>

        {/* La lista tiene alto propio y el buscador se voltea hacia arriba si
            abajo no cabe: en la última línea de la factura, con el alto de lo
            que quedaba bajo el campo, la lista se encogía a cero y no se veía
            ningún producto. */}
        <PopoverContent
          className="flex w-(--anchor-width) min-w-96 flex-col p-0"
          align="start"
          collisionAvoidance={{
            side: "flip",
            align: "shift",
            fallbackAxisSide: "none",
          }}
          // El foco va al buscador sin mover la página: con `autoFocus` el
          // navegador subía la pantalla antes de que el buscador quedara en
          // su sitio.
          initialFocus={() => {
            campoBusqueda.current?.focus({ preventScroll: true });
            return false;
          }}
        >
          <div className="border-b border-border p-3">
            <Input
              ref={campoBusqueda}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  elegirPorCodigoBarras();
                }
              }}
              placeholder="Código, nombre o código de barras"
              className="h-11 rounded-xl px-4"
              aria-label="Buscar producto"
            />
          </div>

          <div className="max-h-[min(18rem,45vh)] overflow-y-auto p-2">
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
                      <span className="truncate text-sm font-medium">
                        {p.nombre}
                      </span>
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

          {/* Que el producto no esté en el catálogo no debería frenar una venta:
            se da de alta acá mismo y la línea sigue armándose. */}
          <div className="flex items-center gap-1 border-t border-border p-2">
            <Button
              type="button"
              variant="ghost"
              className="h-10 flex-1 justify-start gap-2 rounded-xl px-3 text-sm"
              onClick={() => abrirFicha("nuevo")}
            >
              <Plus className="size-4" />
              Registrar un producto nuevo
            </Button>
            {valor && (
              <Button
                type="button"
                variant="ghost"
                className="h-10 gap-2 rounded-xl px-3 text-sm text-muted-foreground"
                onClick={() => abrirFicha(valor)}
              >
                <Pencil className="size-4" />
                Editar
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <DialogoProducto
        editando={editando}
        onCerrar={() => setEditando(null)}
        codigoSugerido={busqueda.trim() || undefined}
        alGuardar={(producto) => {
          onElegir(producto);
          setBusqueda("");
        }}
      />
    </>
  );
}
