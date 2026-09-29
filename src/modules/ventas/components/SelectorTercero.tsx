"use client";

import { useState } from "react";
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
import { tercerosApi } from "@/modules/terceros/services/terceros.service";
import {
  DialogoTercero,
  type TerceroEnEdicion,
} from "@/modules/terceros/components/DialogoTercero";
import type { TerceroResumen } from "@/modules/terceros/types/terceros.types";

const TEXTOS = {
  cliente: {
    vacio: "Seleccione un cliente",
    buscar: "Buscar cliente",
    ninguno: "Ningún cliente coincide.",
    nuevo: "Registrar un cliente nuevo",
  },
  empleado: {
    vacio: "Seleccione un empleado",
    buscar: "Buscar empleado",
    ninguno: "Ningún empleado coincide.",
    nuevo: "Registrar un empleado nuevo",
  },
} as const;

/**
 * Buscador de tercero por nombre o documento, solo entre los que tienen el
 * rol pedido: clientes al vender, empleados al elegir quién responde por una
 * caja. Mismo patrón que `SelectorCuenta`/`SelectorProducto`.
 */
export function SelectorTercero({
  valor,
  onElegir,
  invalido,
  rol = "cliente",
}: {
  valor: TerceroResumen | null;
  onElegir: (tercero: TerceroResumen) => void;
  invalido?: boolean;
  rol?: "cliente" | "empleado";
}) {
  const textos = TEXTOS[rol];
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  // El diálogo se abre CERRANDO el popover: si viviera dentro del
  // `PopoverContent`, se desmontaría con él en el mismo clic.
  const [editando, setEditando] = useState<TerceroEnEdicion>(null);

  const abrirFicha = (que: TerceroEnEdicion) => {
    setAbierto(false);
    setEditando(que);
  };

  const { data: pagina, isFetching } = useQuery({
    queryKey: ["terceros", `selector-${rol}`, busqueda],
    queryFn: () =>
      tercerosApi.listar({
        q: busqueda.trim() || undefined,
        esCliente: rol === "cliente",
        esEmpleado: rol === "empleado",
      }),
    enabled: abierto,
    staleTime: 60_000,
  });
  const terceros = pagina?.datos ?? [];

  return (
    <>
      <Popover open={abierto} onOpenChange={setAbierto}>
        <PopoverTrigger
          render={<Button type="button" variant="outline" />}
          aria-invalid={invalido || undefined}
          className="h-[52px] w-full justify-between rounded-xl px-4 font-normal aria-invalid:border-danger"
        >
          {valor ? (
            // Como en el diseño: el nombre, y debajo el documento.
            <span className="flex min-w-0 flex-col items-start text-left">
              <span className="w-full truncate text-sm font-semibold">{valor.nombre}</span>
              <span className="w-full truncate font-mono text-[11px] text-muted-foreground">
                {valor.tipoDocumento} {valor.numeroDocumento}
                {valor.dv ? `-${valor.dv}` : ""}
              </span>
            </span>
          ) : (
            <span className={cn("truncate", "text-muted-foreground")}>{textos.vacio}</span>
          )}
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </PopoverTrigger>

        <PopoverContent
          className="flex max-h-(--available-height) w-(--anchor-width) min-w-96 flex-col p-0"
          align="start"
        >
          <div className="border-b border-border p-3">
            <Input
              autoFocus
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre o documento"
              className="h-11 rounded-xl px-4"
              aria-label={textos.buscar}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
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
                {textos.ninguno}
              </p>
            )}
          </div>

          {/* Con 4.282 terceros, el que falta se descubre justo acá. Salir a
            registrarlo al directorio obliga a abandonar el documento a medio
            digitar, así que se registra sin moverse. */}
          <div className="flex items-center gap-1 border-t border-border p-2">
            <Button
              type="button"
              variant="ghost"
              className="h-10 flex-1 justify-start gap-2 rounded-xl px-3 text-sm"
              onClick={() => abrirFicha("nuevo")}
            >
              <Plus className="size-4" />
              {textos.nuevo}
            </Button>
            {valor && (
              <Button
                type="button"
                variant="ghost"
                className="h-10 gap-2 rounded-xl px-3 text-sm text-muted-foreground"
                onClick={() => abrirFicha(valor.id)}
              >
                <Pencil className="size-4" />
                Editar
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <DialogoTercero
        editando={editando}
        onCerrar={() => setEditando(null)}
        rol={rol}
        nombreSugerido={busqueda.trim() || undefined}
        alGuardar={(tercero) => {
          onElegir(tercero);
          setBusqueda("");
        }}
      />
    </>
  );
}
