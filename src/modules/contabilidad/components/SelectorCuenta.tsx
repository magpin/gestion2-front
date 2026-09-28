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
import { planCuentasApi } from "@/modules/plan-cuentas/services/plan-cuentas.service";
import type { CuentaEmpresa } from "@/modules/plan-cuentas/types/plan-cuentas.types";

/**
 * Buscador de cuenta para digitar un asiento.
 *
 * Solo ofrece las **auxiliares activas**: las que agrupan no reciben movimiento
 * y ofrecerlas es ofrecer un error que el servidor va a rechazar. Un plan de
 * cuentas tiene sesenta cuentas y crece; buscar es la única forma usable de
 * elegir.
 *
 * Muestra las exigencias de cada cuenta al lado del nombre —tercero, centro de
 * costo, base gravable— porque es lo que decide qué columnas hay que llenar
 * después, y descubrirlo al guardar obliga a volver a la línea.
 */
export function SelectorCuenta({
  valor,
  onElegir,
  invalido,
  clases,
}: {
  valor: CuentaEmpresa | null;
  onElegir: (cuenta: CuentaEmpresa) => void;
  invalido?: boolean;
  /**
   * Solo cuentas de estas clases del PUC (el primer dígito). Un concepto de
   * gasto, por ejemplo, solo puede ir a la clase 5.
   */
  clases?: string[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const { data: todas = [], isFetching } = useQuery({
    queryKey: ["plan-cuentas", "auxiliares", busqueda],
    queryFn: () =>
      planCuentasApi.listar({
        q: busqueda.trim() || undefined,
        soloAuxiliares: "true",
      }),
    enabled: abierto,
    staleTime: 5 * 60_000,
  });
  const cuentas =
    clases === undefined ? todas : todas.filter((c) => clases.includes(c.codigo[0]));

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
            "Seleccione una cuenta auxiliar"
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
            aria-label="Buscar cuenta"
          />
        </div>

        <div className="max-h-72 overflow-y-auto p-2">
          {isFetching && (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )}

          {!isFetching &&
            cuentas.map((c) => (
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
                  <span className="flex items-baseline gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {c.codigo}
                    </span>
                    <span className="truncate text-sm font-medium">
                      {c.nombre}
                    </span>
                  </span>
                  {/* Lo que la cuenta va a exigir al guardar. Verlo acá evita
                      volver a la línea después de que el servidor la rechace. */}
                  {(c.exige_tercero ||
                    c.exige_centro_costo ||
                    c.exige_base_gravable) && (
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      exige{" "}
                      {[
                        c.exige_tercero ? "tercero" : null,
                        c.exige_centro_costo ? "centro de costo" : null,
                        c.exige_base_gravable ? "base gravable" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  )}
                </span>
              </button>
            ))}

          {!isFetching && cuentas.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Ninguna cuenta auxiliar coincide.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
