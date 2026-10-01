"use client";

import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCarga, SILENCIOSO } from "@/components/shared/ErrorCarga";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import { cn, formatCOP } from "@/lib/utils";
import { nombreMes } from "@/modules/gastos/lib/mes";
import { formatoPorcentaje, mesCorto, valoresResultados } from "../lib/estados";
import { estadosApi } from "../services/estados.service";
import type { Resultados } from "../types/estados.types";
import { Dato, Fila, TablaEstado, Tarjeta, rangoDelPeriodo } from "./Comun";

/** El estado de resultados del mes, contra otro si se eligió, con la utilidad de seis meses y los márgenes. */
export function EstadoResultadosTab({ mes, comparar }: { mes: string; comparar?: string }) {
  const { data, isError, error, refetch } = useQuery({
    queryKey: ["estados-financieros", "resultados", mes, comparar ?? ""],
    queryFn: () => estadosApi.resultados(mes, comparar),
    meta: SILENCIOSO,
  });

  if (data === undefined) {
    return isError ? <ErrorCarga error={error} titulo="No se pudo armar el estado" onReintentar={refetch} /> : <SkeletonTable />;
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <Tabla datos={data} />
      <aside className="flex w-full flex-col gap-4 lg:w-72 lg:shrink-0">
        <UtilidadPorMes serie={data.porMes} />
        <Tarjeta titulo={`Márgenes de ${nombreMes(mes).split(" ")[0].toLowerCase()}`}>
          <Dato etiqueta="Margen bruto" valor={formatoPorcentaje(data.margenes.bruto, false)} />
          <Dato etiqueta="Margen operacional" valor={formatoPorcentaje(data.margenes.operacional, false)} />
          <Dato etiqueta="Antes de impuestos" valor={formatoPorcentaje(data.margenes.antesDeImpuestos, false)} />
        </Tarjeta>
      </aside>
    </div>
  );
}

function Tabla({ datos }: { datos: Resultados }) {
  // Los ingresos se ven abiertos: de qué vive la empresa es lo primero que se pregunta.
  const [abiertos, setAbiertos] = useState<Set<string>>(() => new Set(["ingresos_op"]));
  const comparando = datos.comparado !== null;
  const antes = valoresResultados(datos.comparado?.estado);
  const alternar = (clave: string) =>
    setAbiertos((a) => {
      const b = new Set(a);
      if (b.has(clave)) b.delete(clave);
      else b.add(clave);
      return b;
    });

  if (datos.actual.renglones.every((r) => r.valor === 0) && !comparando) {
    return (
      <div className="min-w-0 flex-1">
        <EmptyState
          titulo="Sin movimientos en el período"
          descripcion="Cuando se registren ventas, compras o gastos de este mes, el estado de resultados sale solo del libro."
        />
      </div>
    );
  }

  const columnas = comparando
    ? [mesCorto(datos.periodo.mes), mesCorto(datos.comparado!.periodo.mes), "Variación"]
    : [mesCorto(datos.periodo.mes)];

  return (
    <TablaEstado titulo="Estado de resultados" subtitulo={rangoDelPeriodo(datos.periodo)} columnas={columnas}>
      {datos.actual.renglones.map((r, i) => {
        const previo = datos.actual.renglones[i - 1];
        const cuentas = r.cuentas ?? [];
        const abierto = abiertos.has(r.clave);
        // Los grupos seguidos van en un mismo bloque, salvo que el de arriba esté abierto.
        const separada =
          r.tipo === "grupo" && i > 0 && (previo.tipo !== "grupo" || (abiertos.has(previo.clave) && (previo.cuentas ?? []).length > 0));
        return (
          <Fragment key={r.clave}>
            <Fila
              tipo={r.tipo}
              etiqueta={r.etiqueta}
              valor={r.valor}
              anterior={antes.get(r.clave)}
              comparando={comparando}
              separada={separada}
              abierta={cuentas.length > 0 ? abierto : undefined}
              onAlternar={cuentas.length > 0 ? () => alternar(r.clave) : undefined}
            />
            {abierto &&
              cuentas.map((c) => (
                <Fila
                  key={c.codigo}
                  tipo="detalle"
                  etiqueta={c.nombre}
                  valor={c.valor}
                  anterior={antes.get(`${r.clave}:${c.codigo}`)}
                  comparando={comparando}
                />
              ))}
          </Fragment>
        );
      })}
    </TablaEstado>
  );
}

/** Seis barras: la del mes elegido en naranja. Una pérdida se dibuja hueca. */
function UtilidadPorMes({ serie }: { serie: Resultados["porMes"] }) {
  const maximo = Math.max(1, ...serie.map((s) => Math.abs(s.utilidad)));
  const ultimo = serie[serie.length - 1];
  return (
    <Tarjeta titulo="Utilidad por mes" subtitulo="Antes de impuestos, últimos seis meses">
      <p className="mb-2 text-right font-mono text-sm font-semibold whitespace-nowrap tabular-nums">
        {ultimo ? formatCOP(ultimo.utilidad) : ""}
      </p>
      <div
        role="img"
        aria-label={`Utilidad por mes: ${serie.map((s) => `${nombreMes(s.mes)} ${formatCOP(s.utilidad)}`).join("; ")}`}
        className="grid h-36 items-end gap-2.5 border-b border-border"
        style={{ gridTemplateColumns: `repeat(${Math.max(1, serie.length)}, minmax(0, 1fr))` }}
      >
        {serie.map((s, i) => {
          const ultimaBarra = i === serie.length - 1;
          const penultima = i === serie.length - 2;
          return (
            <span
              key={s.mes}
              title={`${nombreMes(s.mes)}: ${formatCOP(s.utilidad)}`}
              className={cn(
                "rounded-t",
                s.utilidad < 0
                  ? "border border-b-0 border-dashed border-muted-foreground bg-transparent"
                  : ultimaBarra
                    ? "bg-brand"
                    : penultima
                      ? "bg-foreground/60"
                      : "bg-muted-foreground/30",
              )}
              style={{ height: `${Math.max(2, (Math.abs(s.utilidad) / maximo) * 100)}%` }}
            />
          );
        })}
      </div>
      <div
        className="grid gap-2.5 pt-1.5 text-center text-[11px] text-muted-foreground"
        style={{ gridTemplateColumns: `repeat(${Math.max(1, serie.length)}, minmax(0, 1fr))` }}
      >
        {serie.map((s, i) => (
          <span key={s.mes} className={cn(i === serie.length - 1 && "font-semibold text-foreground")}>
            {mesCorto(s.mes).split(" ")[0]}
          </span>
        ))}
      </div>
      {serie.some((s) => s.utilidad < 0) && (
        <p className="mt-2 text-[11px] text-muted-foreground">La barra hueca es un mes con pérdida.</p>
      )}
    </Tarjeta>
  );
}
