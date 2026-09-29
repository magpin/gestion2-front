"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, ChevronLeft, ChevronRight, Loader2, Lock } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCarga, SILENCIOSO } from "@/components/shared/ErrorCarga";
import { Button } from "@/components/ui/button";
import { cn, formatCOP } from "@/lib/utils";
import { periodosApi } from "../services/contabilidad.service";
import type { Agrupacion, ResumenPeriodo } from "../types/contabilidad.types";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const AGRUPACIONES: Array<[Agrupacion, string]> = [
  ["MENSUAL", "Mensual"],
  ["TRIMESTRAL", "Trimestral"],
  ["SEMESTRAL", "Semestral"],
  ["ANUAL", "Anual"],
];

const ORDINAL = ["1er", "2º", "3er", "4º"];

/** «Septiembre 2026», «3er trimestre 2026», «2º semestre 2026», «2026». */
function nombreDelGrupo(g: ResumenPeriodo, agrupacion: Agrupacion): string {
  const { anio, mes } = g.desde;
  switch (agrupacion) {
    case "MENSUAL":
      return `${MESES[mes - 1]} ${anio}`;
    case "TRIMESTRAL":
      return `${ORDINAL[Math.ceil(mes / 3) - 1]} trimestre ${anio}`;
    case "SEMESTRAL":
      return `${mes <= 6 ? "1er" : "2º"} semestre ${anio}`;
    case "ANUAL":
      return String(anio);
  }
}

/** Cuántos días le quedan al mes en curso, en hora de Colombia. */
function diasParaCierre(): { dias: number; ultimo: string } {
  const hoy = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [a, m, d] = hoy.split("-").map(Number);
  const ultimoDia = new Date(a, m, 0).getDate();
  return { dias: ultimoDia - d, ultimo: `${ultimoDia} de ${MESES[m - 1].toLowerCase()}` };
}

/**
 * El calendario contable. Ya no se opera: se mira.
 *
 * El mes en curso está siempre abierto y el último día se cierra solo; lo que
 * llegue con fecha de un mes cerrado se registra en el mes abierto. Por eso
 * esta pantalla no tiene botones de abrir ni cerrar: muestra en qué va cada
 * período, agrupado por mes, trimestre, semestre o año, con sus cifras.
 */
export function PeriodosSeccion() {
  const [agrupacion, setAgrupacion] = useState<Agrupacion>("MENSUAL");
  const [anio, setAnio] = useState<number | undefined>(new Date().getFullYear());

  const { data: grupos, isError, error, refetch } = useQuery({
    queryKey: ["periodos", "resumen", agrupacion, anio],
    queryFn: () => periodosApi.resumen(agrupacion, anio),
    meta: SILENCIOSO,
  });

  const { dias, ultimo } = diasParaCierre();

  return (
    <>
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
        <CalendarClock className="mt-0.5 size-5 shrink-0 text-brand" />
        <p className="leading-6">
          <span className="font-semibold">El mes en curso se cierra solo el {ultimo}</span>
          {dias === 0 ? " (hoy)" : ` (en ${dias} día${dias === 1 ? "" : "s"})`}. Lo que llegue después con fecha
          de un mes cerrado se registra en el mes abierto, con la fecha del documento anotada en el asiento.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex gap-1 rounded-2xl border border-border bg-muted p-1" role="radiogroup">
          {AGRUPACIONES.map(([valor, etiqueta]) => (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={agrupacion === valor}
              onClick={() => {
                setAgrupacion(valor);
                // La vista anual compara años: no tiene sentido filtrarla por uno.
                setAnio(valor === "ANUAL" ? undefined : (anio ?? new Date().getFullYear()));
              }}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                agrupacion === valor ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
              )}
            >
              {etiqueta}
            </button>
          ))}
        </div>

        {anio !== undefined && (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              aria-label="Año anterior"
              className="size-10 rounded-xl"
              onClick={() => setAnio((a) => (a ?? 0) - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-16 text-center text-xl font-semibold tabular-nums">{anio}</span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Año siguiente"
              className="size-10 rounded-xl"
              onClick={() => setAnio((a) => (a ?? 0) + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>

      {grupos === undefined ? (
        isError ? (
          <ErrorCarga error={error} titulo="No se pudieron leer los períodos" onReintentar={refetch} />
        ) : (
          <div className="flex justify-center py-24 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        )
      ) : grupos.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          titulo={anio === undefined ? "Todavía no hay períodos" : `Sin períodos en ${anio}`}
          descripcion={
            anio === undefined
              ? "Cada mes aparece acá con sus cifras a medida que la empresa registra movimientos."
              : "La empresa no llevó contabilidad en ese año. Pasá a otro año con las flechas."
          }
        />
      ) : (
        <section className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-muted/40 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  {["Período", "Estado", "Asientos", "Ingresos", "Costos y gastos", "Resultado"].map((x, i) => (
                    <th key={x} scope="col" className={cn("px-5 py-4", i >= 2 && "text-right")}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {grupos.map((g) => (
                  <tr key={g.grupo} className={g.estado === "ABIERTO" ? "bg-success/5" : ""}>
                    <td className="px-5 py-4">
                      <p className="font-semibold">{nombreDelGrupo(g, agrupacion)}</p>
                      {agrupacion !== "MENSUAL" && (
                        <p className="text-xs text-muted-foreground">
                          {MESES[g.desde.mes - 1]} a {MESES[g.hasta.mes - 1].toLowerCase()} ·{" "}
                          {g.meses.length} mes{g.meses.length === 1 ? "" : "es"}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                          g.estado === "ABIERTO" ? "bg-success/15 text-success" : "bg-muted text-foreground",
                        )}
                      >
                        {g.estado === "CERRADO" && <Lock className="size-3" />}
                        {g.estado === "ABIERTO" ? "En curso" : "Cerrado"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-mono tabular-nums">{g.asientos}</td>
                    <td className="px-5 py-4 text-right font-mono tabular-nums">{formatCOP(g.ingresos)}</td>
                    <td className="px-5 py-4 text-right font-mono tabular-nums">{formatCOP(g.costosGastos)}</td>
                    <td
                      className={cn(
                        "px-5 py-4 text-right font-mono font-semibold tabular-nums",
                        g.resultado > 0 ? "text-success" : g.resultado < 0 ? "text-danger" : "text-muted-foreground",
                      )}
                    >
                      {formatCOP(g.resultado)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
