"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, Receipt, TriangleAlert } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCarga, SILENCIOSO } from "@/components/shared/ErrorCarga";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import { Button } from "@/components/ui/button";
import { cn, formatCOP } from "@/lib/utils";
import { nombreMes } from "@/modules/gastos/lib/mes";
import { alMil, fechaCorta, moverPeriodo, periodoEnPalabras } from "../lib/impuestos";
import { impuestosApi } from "../services/impuestos.service";
import { TarjetaDeclaracion } from "./TarjetaDeclaracion";
import type { FilaCalendario, IvaDelPeriodo, IvaPantalla } from "../types/impuestos.types";

/**
 * Impuestos → IVA (lienzo «IVA 300»): el IVA del período, de las facturas de
 * venta y de compra, con el borrador del 300 y su cuadre contra el libro.
 */
export function IvaTab({
  onPresentar,
  onPagar,
}: {
  onPresentar: (f: FilaCalendario) => void;
  onPagar: (f: FilaCalendario) => void;
}) {
  const [periodo, setPeriodo] = useState<string | undefined>(undefined);
  const { data, isError, error, refetch } = useQuery({
    queryKey: ["impuestos", "iva", periodo ?? "actual"],
    queryFn: () => impuestosApi.iva(periodo),
    meta: SILENCIOSO,
  });

  if (data === undefined) {
    return isError ? <ErrorCarga error={error} titulo="No se pudo armar el IVA" onReintentar={refetch} /> : <SkeletonTable />;
  }
  if (!data.configuracion.responsableIva) {
    return (
      <EmptyState
        titulo="La empresa no es responsable de IVA"
        descripcion="Según el RUT no tiene la responsabilidad 48: no declara IVA. Si cambió, actualícelo en Configurar empresa."
        icon={Receipt}
        accion={{ label: "Ir a Configurar empresa", href: "/configuracion/impuestos" }}
      />
    );
  }
  if (data.periodo === null || data.iva === null || data.fila === null) {
    return (
      <EmptyState
        titulo="Falta decir cada cuánto se declara"
        descripcion="Bimestral o cuatrimestral: depende de los ingresos del año pasado. Con eso se arman los períodos y el calendario."
        icon={Receipt}
        accion={{ label: "Elegir la periodicidad", href: "/configuracion/impuestos" }}
      />
    );
  }
  return (
    <Contenido
      datos={data as Completo}
      onPeriodo={setPeriodo}
      onPresentar={onPresentar}
      onPagar={onPagar}
    />
  );
}

type Completo = IvaPantalla & { periodo: string; iva: IvaDelPeriodo; fila: FilaCalendario };

function Contenido({
  datos,
  onPeriodo,
  onPresentar,
  onPagar,
}: {
  datos: Completo;
  onPeriodo: (p: string) => void;
  onPresentar: (f: FilaCalendario) => void;
  onPagar: (f: FilaCalendario) => void;
}) {
  const { iva, fila, avance } = datos;
  const enCurso = fila.situacion.estado === "CAUSANDOSE";
  const aFavor = iva.saldo < 0;
  const maximo = Math.max(1, ...iva.mesAMes.flatMap((m) => [m.generado, m.descontable]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-1 self-start rounded-2xl border border-border bg-card p-1 shadow-sm">
        <Button type="button" variant="ghost" className="size-9 rounded-xl p-0" aria-label="Período anterior" onClick={() => onPeriodo(moverPeriodo(datos.periodo, -1))}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-56 text-center text-sm font-semibold">{periodoEnPalabras(datos.periodo)}</span>
        <Button
          type="button"
          variant="ghost"
          className="size-9 rounded-xl p-0"
          aria-label="Período siguiente"
          disabled={enCurso}
          onClick={() => onPeriodo(moverPeriodo(datos.periodo, 1))}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-5 px-6 py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              IVA de {periodoEnPalabras(datos.periodo)} · {datos.configuracion.periodicidadIva?.toLowerCase()}
            </p>
            <p className="font-mono text-3xl font-semibold tracking-[-0.03em] whitespace-nowrap tabular-nums">
              {formatCOP(Math.abs(iva.saldo))}
            </p>
            <p className="text-sm text-muted-foreground">
              {aFavor ? "Saldo a favor: el IVA descontable pasó al generado." : enCurso ? "Causado hasta hoy." : "Lo del período cerrado."}
              {fila.vence ? ` Vence el ${fechaCorta(fila.vence).toLowerCase()}.` : ""}
            </p>
          </div>
          {avance && enCurso && (
            <div className="w-full max-w-xs">
              <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                <span>
                  Día {avance.dia} de {avance.dias}
                </span>
                <span>cierra el {fechaCorta(avance.cierra).toLowerCase()}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-brand" style={{ width: `${(avance.dia / avance.dias) * 100}%` }} />
              </div>
            </div>
          )}
        </div>
        <ul className={cn("grid border-t border-border", iva.reteIvaSufrida > 0 ? "sm:grid-cols-4" : "sm:grid-cols-3")}>
          <Celda titulo="IVA que cobró" detalle="En sus facturas de venta · generado" valor={formatCOP(iva.generado.total)} />
          <Celda titulo="IVA que pagó" detalle="En compras y gastos · descontable" valor={`− ${formatCOP(iva.descontable.total)}`} />
          {iva.reteIvaSufrida > 0 && (
            <Celda titulo="IVA que le retuvieron" detalle="Sus clientes agentes de retención" valor={`− ${formatCOP(iva.reteIvaSufrida)}`} />
          )}
          <Celda
            titulo={aFavor ? "Saldo a favor" : "Le debe a la DIAN"}
            detalle={enCurso ? "Si el período cerrara hoy" : "Del período"}
            valor={formatCOP(Math.abs(iva.saldo))}
            fuerte
          />
        </ul>
      </section>

      {!iva.cuadre.cuadra && (
        <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
          <p>
            El libro (2408) dice {formatCOP(iva.cuadre.libro)} y las facturas dicen {formatCOP(iva.cuadre.documentos)}: hay{" "}
            {formatCOP(Math.abs(iva.cuadre.diferencia))} de diferencia. Suele ser un asiento manual contra la 2408. Revíselo en el
            Libro antes de declarar.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <section className="rounded-3xl border border-border bg-card px-6 py-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold">Mes a mes</h2>
              <p className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-foreground" /> Cobrado
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-muted-foreground/40" /> Pagado
                </span>
              </p>
            </div>
            <div
              role="img"
              aria-label={`IVA por mes: ${iva.mesAMes.map((m) => `${nombreMes(m.mes)}: cobrado ${formatCOP(m.generado)}, pagado ${formatCOP(m.descontable)}`).join("; ")}`}
            >
              <div className="grid h-36 items-end gap-4 border-b border-border" style={{ gridTemplateColumns: `repeat(${iva.mesAMes.length}, minmax(0, 1fr))` }}>
                {iva.mesAMes.map((m) => (
                  <div key={m.mes} className="flex h-full items-end justify-center gap-1.5">
                    <Barra valor={m.generado} maximo={maximo} clase="bg-foreground" />
                    <Barra valor={m.descontable} maximo={maximo} clase="bg-muted-foreground/40" />
                  </div>
                ))}
              </div>
              <div className="grid gap-4 pt-2 text-center text-xs" style={{ gridTemplateColumns: `repeat(${iva.mesAMes.length}, minmax(0, 1fr))` }}>
                {iva.mesAMes.map((m) => (
                  <span key={m.mes}>
                    <span className="block text-muted-foreground">{nombreMes(m.mes).split(" ")[0]}</span>
                    {(m.generado !== 0 || m.descontable !== 0) && (
                      <span className="block font-mono text-muted-foreground">{formatCOP(m.generado - m.descontable)}</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <Borrador300 iva={iva} />
        </div>

        <aside className="flex w-full flex-col gap-4 lg:w-80 lg:shrink-0">
          <TarjetaDeclaracion fila={fila} onPresentar={onPresentar} onPagar={onPagar} titulo="Este período" />
          {datos.anterior && <TarjetaDeclaracion fila={datos.anterior} onPresentar={onPresentar} onPagar={onPagar} titulo="Período anterior" />}
          {iva.noDescontable > 0 && (
            <section className="rounded-3xl border border-border bg-card px-5 py-4 shadow-sm">
              <h2 className="text-sm font-semibold">IVA que no se descuenta</h2>
              <p className="mt-1 font-mono text-lg font-semibold whitespace-nowrap tabular-nums">{formatCOP(iva.noDescontable)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                IVA de compras marcado como no descontable: va al costo o al gasto. Si alguna compra sí da derecho a descontarlo,
                corríjala en Compras.
              </p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

/** El borrador del 300, simplificado: lo que va en cada renglón, al mil. */
function Borrador300({ iva }: { iva: IvaDelPeriodo }) {
  const aFavor = iva.saldo < 0;
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold">Así va el formulario 300</h2>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
            iva.cuadre.cuadra ? "border-success/30 bg-success/15" : "border-warning/30 bg-warning/15",
          )}
        >
          {iva.cuadre.cuadra ? <Check className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
          {iva.cuadre.cuadra ? "Cuadra con el libro" : "No cuadra con el libro"}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-5 py-3">Concepto</th>
              <th className="px-3 py-3 text-right">Base</th>
              <th className="px-5 py-3 text-right">IVA</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {iva.generado.porTarifa.map((t) => (
              <Renglon key={`v${t.tarifa}`} concepto={`Ventas gravadas al ${t.tarifa} %`} base={t.base} iva={t.iva} />
            ))}
            {iva.generado.porTarifa.length === 0 && <Renglon concepto="Ventas gravadas" base={0} iva={0} tenue />}
            <Renglon
              concepto="Ventas a tarifa 0 · exentas o excluidas"
              detalle="El sistema no las separa todavía: van en renglones distintos del 300."
              base={iva.ventasTarifaCero}
              iva={null}
              tenue
            />
            {iva.descontable.porTarifa.map((t) => (
              <Renglon key={`c${t.tarifa}`} concepto={`Compras y gastos gravados al ${t.tarifa} %`} base={t.base} iva={-t.iva} />
            ))}
            {iva.reteIvaSufrida > 0 && <Renglon concepto="Retención de IVA que le practicaron" base={null} iva={-iva.reteIvaSufrida} />}
            <tr className="border-t-2 border-border bg-muted">
              <th scope="row" className="px-5 py-3.5 text-left font-sans text-base font-bold">
                {aFavor ? "Saldo a favor" : "Saldo a pagar"}
              </th>
              <td />
              <td className="px-5 py-3.5 text-right text-base font-bold whitespace-nowrap">{formatCOP(alMil(Math.abs(iva.saldo)))}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
        Valores al múltiplo de mil, como los pide la DIAN. El formulario lo presenta usted en MUISCA.
      </p>
    </section>
  );
}

function Renglon({
  concepto,
  detalle,
  base,
  iva,
  tenue = false,
}: {
  concepto: string;
  detalle?: string;
  base: number | null;
  iva: number | null;
  tenue?: boolean;
}) {
  return (
    <tr className="border-t border-border">
      <th scope="row" className={cn("px-5 py-3 text-left font-sans font-medium", tenue && "font-normal text-muted-foreground")}>
        {concepto}
        {detalle && <span className="block text-xs font-normal text-muted-foreground">{detalle}</span>}
      </th>
      <td className={cn("px-3 py-3 text-right whitespace-nowrap", tenue && "text-muted-foreground")}>
        {base === null ? "" : formatCOP(alMil(base))}
      </td>
      <td className="px-5 py-3 text-right font-semibold whitespace-nowrap">
        {iva === null ? "—" : `${iva < 0 ? "− " : ""}${formatCOP(alMil(Math.abs(iva)))}`}
      </td>
    </tr>
  );
}

function Celda({ titulo, detalle, valor, fuerte = false }: { titulo: string; detalle: string; valor: string; fuerte?: boolean }) {
  return (
    <li className={cn("border-b border-border px-6 py-4 sm:border-r", fuerte && "bg-muted")}>
      <p className="text-sm font-semibold">{titulo}</p>
      <p className="text-xs text-muted-foreground">{detalle}</p>
      <p className="mt-1 font-mono text-lg font-semibold whitespace-nowrap tabular-nums">{valor}</p>
    </li>
  );
}

function Barra({ valor, maximo, clase }: { valor: number; maximo: number; clase: string }) {
  return valor > 0 ? (
    <span className={cn("w-5 rounded-t", clase)} style={{ height: `${Math.max(2, (valor / maximo) * 100)}%` }} />
  ) : (
    <span className="h-0.5 w-5 bg-muted-foreground/30" />
  );
}
