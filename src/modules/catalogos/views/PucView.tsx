"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { ArbolPuc } from "../components/ArbolPuc";
import { pucApi } from "../services/catalogos.service";

/**
 * El PUC del Decreto 2650, para consultar.
 *
 * Es de solo lectura y no tiene botón de editar: el catálogo lo define el
 * Estado, es el mismo para todas las empresas y se corrige por migración. Lo que
 * cada empresa sí decide es cuáles usa, y eso vive en Plan de cuentas.
 *
 * Buscar y navegar son dos modos distintos y excluyentes: quien escribe algo
 * quiere una lista plana de coincidencias, no un árbol con ramas abiertas.
 */
export function PucView() {
  const [busqueda, setBusqueda] = useState("");
  const consulta = busqueda.trim();

  const { data: resultados = [], isFetching } = useQuery({
    queryKey: ["puc", "buscar", consulta],
    queryFn: () => pucApi.buscar({ q: consulta }),
    enabled: consulta.length >= 2,
    staleTime: 10 * 60_000,
  });

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Plan Único de Cuentas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Decreto 2650 de 1993. Catálogo compartido: ninguna empresa lo edita.
        </p>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Código o nombre: 1105, caja, retención…"
          className="pl-9"
          aria-label="Buscar en el PUC"
        />
      </div>

      {consulta.length >= 2 ? (
        <section className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            {isFetching ? "Buscando…" : `${resultados.length} coincidencia${resultados.length === 1 ? "" : "s"}`}
            {resultados.length === 300 && " (se muestran las primeras 300)"}
          </p>

          {isFetching ? (
            <div className="flex justify-center py-10 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-card">
              {resultados.map((c) => (
                <li key={c.codigo} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="w-20 shrink-0 font-mono text-xs">{c.codigo}</span>
                  <span className="min-w-0 flex-1 truncate">{c.nombre}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {c.naturaleza}
                  </span>
                  {c.es_imputable && (
                    <span className="shrink-0 rounded bg-muted px-1.5 text-[10px] text-muted-foreground">
                      imputable
                    </span>
                  )}
                  {c.rango_libre && (
                    <span className="shrink-0 rounded bg-muted px-1.5 text-[10px] text-muted-foreground">
                      numeración libre
                    </span>
                  )}
                </li>
              ))}
              {resultados.length === 0 && (
                <li className="px-3 py-8 text-center text-sm text-muted-foreground">
                  Sin resultados
                </li>
              )}
            </ul>
          )}
        </section>
      ) : (
        <ArbolPuc />
      )}
    </div>
  );
}
