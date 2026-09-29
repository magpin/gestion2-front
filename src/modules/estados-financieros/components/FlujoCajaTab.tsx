"use client";

import { Fragment } from "react";
import { useQuery } from "@tanstack/react-query";

import { Aviso } from "@/components/shared/Aviso";
import { ErrorCarga, SILENCIOSO } from "@/components/shared/ErrorCarga";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import { cn, formatCOP } from "@/lib/utils";
import { fechaCorta, mesCorto } from "../lib/estados";
import { estadosApi } from "../services/estados.service";
import type { FlujoDirecto } from "../types/estados.types";
import { Dato, Fila, TablaEstado, Tarjeta, rangoDelPeriodo } from "./Comun";

export type VistaFlujo = "real" | "proyectado";

/** Por dónde entró y salió la plata de caja y bancos en el mes, o lo que viene en las próximas semanas. */
export function FlujoCajaTab({ mes, vista }: { mes: string; vista: VistaFlujo }) {
  return vista === "real" ? <Real mes={mes} /> : <ProximasSemanas />;
}

function Real({ mes }: { mes: string }) {
  const { data, isError, error, refetch } = useQuery({
    queryKey: ["estados-financieros", "flujo", mes],
    queryFn: () => estadosApi.flujo(mes),
    meta: SILENCIOSO,
  });

  if (data === undefined) {
    return isError ? <ErrorCarga error={error} titulo="No se pudo armar el estado" onReintentar={refetch} /> : <SkeletonTable />;
  }
  const f = data.directo;

  return (
    <div className="flex flex-col gap-6">
      {f.diferencia !== 0 && (
        <Aviso tono="alarma" titulo="Hay plata que el flujo no explica" cifra={formatCOP(f.diferencia)}>
          El saldo final de caja y bancos no sale del inicial más lo que se movió. Suele ser un asiento de caja sin
          contrapartida; revísalo en el Libro.
        </Aviso>
      )}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <TablaEstado titulo="Flujo de caja" subtitulo={`Método directo · ${rangoDelPeriodo(data.periodo)}`} columnas={[mesCorto(mes)]}>
          <Fila tipo="subtotal" etiqueta="Saldo inicial en caja y bancos" valor={f.saldoInicial} comparando={false} />
          {f.actividades.length === 0 && (
            <Fila tipo="detalle" etiqueta="Este mes no entró ni salió plata de caja ni de bancos." comparando={false} />
          )}
          {f.actividades.map((a) => (
            <Fragment key={a.actividad}>
              <Fila tipo="seccion" etiqueta={a.etiqueta} comparando={false} />
              {a.rubros.map((r) => (
                <Fila key={r.rubro} tipo="grupo" etiqueta={r.rubro} valor={r.valor} comparando={false} />
              ))}
              <Fila tipo="subtotal" etiqueta={`Neto de ${a.etiqueta.replace("Actividades de ", "")}`} valor={a.neto} comparando={false} />
            </Fragment>
          ))}
          <Fila tipo="subtotal" etiqueta="Aumento o disminución del mes" valor={f.neto} comparando={false} />
          <Fila tipo="total" etiqueta="Saldo final en caja y bancos" valor={f.saldoFinal} comparando={false} />
        </TablaEstado>
        <aside className="flex w-full flex-col gap-4 lg:w-72 lg:shrink-0">
          <EntraSale flujo={f} />
        </aside>
      </div>
    </div>
  );
}

function EntraSale({ flujo }: { flujo: FlujoDirecto }) {
  const entradas = flujo.actividades.reduce((t, a) => t + a.entradas, 0);
  const salidas = flujo.actividades.reduce((t, a) => t + a.salidas, 0);
  const mayor = Math.max(1, entradas, salidas);
  return (
    <Tarjeta titulo="Entra y sale" subtitulo="Sin contar los traslados entre caja y bancos">
      {[
        { etiqueta: "Entró", valor: entradas, barra: "bg-brand" },
        { etiqueta: "Salió", valor: salidas, barra: "bg-foreground/60" },
      ].map((x) => (
        <div key={x.etiqueta} className="py-1">
          <Dato etiqueta={x.etiqueta} valor={formatCOP(x.valor)} />
          <div className="h-1.5 rounded-full bg-muted">
            <div className={cn("h-1.5 rounded-full", x.barra)} style={{ width: `${(x.valor / mayor) * 100}%` }} />
          </div>
        </div>
      ))}
      <div className="mt-2 border-t border-border pt-2">
        <Dato etiqueta="Neto" valor={formatCOP(flujo.neto)} />
      </div>
    </Tarjeta>
  );
}

function ProximasSemanas() {
  const { data, isError, error, refetch } = useQuery({
    queryKey: ["estados-financieros", "flujo-proyectado"],
    queryFn: () => estadosApi.proyectado(8),
    meta: SILENCIOSO,
  });

  if (data === undefined) {
    return isError ? <ErrorCarga error={error} titulo="No se pudo armar el estado" onReintentar={refetch} /> : <SkeletonTable />;
  }
  // Lo vencido solo se muestra si hay algo vencido.
  const semanas = data.semanas.filter((s) => s.desde !== null || s.entradas !== 0 || s.salidas !== 0);
  const faltante = data.semanas.find((s) => s.saldo < 0);

  return (
    <div className="flex flex-col gap-6">
      {faltante && (
        <Aviso tono="alarma" titulo={`Falta plata: ${faltante.desde === null ? "con lo ya vencido" : faltante.etiqueta.toLowerCase()}`} cifra={formatCOP(faltante.saldo)}>
          Con lo que falta cobrar y pagar, caja y bancos quedarían en negativo. Conviene adelantar cobros o mover
          algún pago.
        </Aviso>
      )}
      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">Próximas semanas</h2>
            <p className="text-xs text-muted-foreground">
              Lo que falta cobrar, lo que falta pagar y los pagos programados, en la semana en que vencen.
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Disponible hoy · {fechaCorta(data.hoy)}
            </p>
            <p className="font-mono text-xl font-semibold whitespace-nowrap tabular-nums">{formatCOP(data.disponible)}</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <th scope="col" className="px-5 py-3 text-left">Semana</th>
                <th scope="col" className="px-3 py-3 text-right">Entra</th>
                <th scope="col" className="px-3 py-3 text-right">Sale</th>
                <th scope="col" className="px-5 py-3 text-right">Queda</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {semanas.map((s) => (
                <tr key={s.desde ?? "vencido"} className={cn("border-t border-border", s.desde === null && "bg-muted/40")}>
                  <th scope="row" className="px-5 py-3 text-left font-sans font-medium">
                    {s.etiqueta}
                    {s.desde === null && <span className="ml-2 text-xs font-normal text-muted-foreground">ya debió moverse</span>}
                  </th>
                  <td className="px-3 py-3 text-right whitespace-nowrap">{s.entradas === 0 ? "—" : formatCOP(s.entradas)}</td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">{s.salidas === 0 ? "—" : formatCOP(s.salidas)}</td>
                  <td className="px-5 py-3 text-right font-semibold whitespace-nowrap">
                    {s.saldo < 0 && (
                      <span className="mr-2 rounded-full border border-danger/20 bg-danger/15 px-2 py-0.5 font-sans text-[11px] font-medium text-foreground">
                        Falta
                      </span>
                    )}
                    {formatCOP(s.saldo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
