"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Loader2, PenLine } from "lucide-react";

import { pucApi } from "../services/catalogos.service";
import type { CuentaPuc } from "../types/catalogos.types";

const NIVEL: Record<number, string> = { 1: "Clase", 2: "Grupo", 4: "Cuenta", 6: "Subcuenta" };

/**
 * El PUC del Decreto 2650, nivel por nivel.
 *
 * Se carga por demanda: son 2 492 cuentas y traerlas todas para mostrar nueve
 * clases sería tirar la conexión del usuario.
 *
 * Lo que distingue este árbol de cualquier otro: cuando el backend responde
 * `rangoLibre: true` con la lista vacía, NO se muestra una rama vacía. El
 * decreto deja tramos enteros sin numerar —toda la clase 7 de costos de
 * producción, las cuentas de orden por contra— para que cada empresa los numere.
 * Sin ese aviso, esas ramas parecerían un error de carga de datos.
 */
export function ArbolPuc() {
  const { data: clases = [], isLoading } = useQuery({
    queryKey: ["puc", "clases"],
    queryFn: () => pucApi.buscar({ nivel: 1 }),
    staleTime: 60 * 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card">
      {clases.map((c) => (
        <Nodo key={c.codigo} cuenta={c} profundidad={0} />
      ))}
    </ul>
  );
}

function Nodo({ cuenta, profundidad }: { cuenta: CuentaPuc; profundidad: number }) {
  const [abierto, setAbierto] = useState(false);

  const { data, isFetching } = useQuery({
    queryKey: ["puc", "hijas", cuenta.codigo],
    queryFn: () => pucApi.hijas(cuenta.codigo),
    enabled: abierto,
    staleTime: 60 * 60_000,
  });

  const hoja = cuenta.es_imputable;

  return (
    <li>
      <button
        type="button"
        onClick={() => !hoja && setAbierto((a) => !a)}
        aria-expanded={hoja ? undefined : abierto}
        disabled={hoja}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent disabled:cursor-default disabled:hover:bg-transparent"
        style={{ paddingLeft: `${profundidad * 18 + 12}px` }}
      >
        <ChevronRight
          className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${
            hoja ? "opacity-0" : abierto ? "rotate-90" : ""
          }`}
        />
        <span className="w-20 shrink-0 font-mono text-xs">{cuenta.codigo}</span>
        <span className="min-w-0 flex-1 truncate">{cuenta.nombre}</span>

        {/* La naturaleza no es decorativa: dice hacia qué lado crece la cuenta, y
            hay contra-cuentas que van al revés de su clase (1592 depreciación
            acumulada es crédito dentro del activo). */}
        <span className="shrink-0 text-[11px] text-muted-foreground">{cuenta.naturaleza}</span>
        <span className="hidden w-20 shrink-0 text-right text-[11px] text-muted-foreground sm:block">
          {NIVEL[cuenta.nivel]}
        </span>
      </button>

      {abierto && (
        <>
          {isFetching && (
            <p className="py-2 pl-12 text-xs text-muted-foreground">
              <Loader2 className="inline size-3 animate-spin" /> Cargando…
            </p>
          )}

          {data?.rangoLibre && data.hijas.length === 0 && (
            <p
              className="flex items-start gap-2 bg-muted/40 py-2 pr-3 text-xs text-muted-foreground"
              style={{ paddingLeft: `${(profundidad + 1) * 18 + 12}px` }}
            >
              <PenLine className="mt-0.5 size-3 shrink-0" />
              <span>
                El decreto no numera este nivel: las cuentas de acá para abajo las define cada
                empresa, en su plan de cuentas.
              </span>
            </p>
          )}

          {data && data.hijas.length > 0 && (
            <ul className="divide-y divide-border border-t border-border">
              {data.hijas.map((h) => (
                <Nodo key={h.codigo} cuenta={h} profundidad={profundidad + 1} />
              ))}
            </ul>
          )}
        </>
      )}
    </li>
  );
}
