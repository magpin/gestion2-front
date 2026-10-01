"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCarga, SILENCIOSO } from "@/components/shared/ErrorCarga";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import { Button } from "@/components/ui/button";
import { useTieneRol } from "@/core/store/authStore";
import { cn, formatCOP } from "@/lib/utils";
import { CLASES_TONO, detalleDeFila, estadoEnPalabras, fechaCorta } from "../lib/impuestos";
import { impuestosApi } from "../services/impuestos.service";
import type { Calendario, FilaCalendario } from "../types/impuestos.types";

/**
 * Impuestos → Calendario (lienzo «Impuestos · calendario»): lo que se le debe
 * a la DIAN y al municipio, cuándo vence y en qué va cada declaración.
 */
export function CalendarioTab({
  onPresentar,
  onPagar,
  onVerRetencion,
}: {
  onPresentar: (f: FilaCalendario) => void;
  onPagar: (f: FilaCalendario) => void;
  onVerRetencion: (mes: string) => void;
}) {
  const { data, isError, error, refetch } = useQuery({
    queryKey: ["impuestos", "calendario"],
    queryFn: () => impuestosApi.calendario(),
    meta: SILENCIOSO,
  });

  if (data === undefined) {
    return isError ? (
      <ErrorCarga error={error} titulo="No se pudo armar el calendario" onReintentar={refetch} />
    ) : (
      <SkeletonTable />
    );
  }

  const pendientes = data.filas.filter((f) => f.situacion.estado !== "PAGADA");
  const pagadas = data.filas.filter((f) => f.situacion.estado === "PAGADA");

  return (
    <div className="flex flex-col gap-6">
      <PorPagar datos={data} />
      {data.filas.length === 0 ? (
        <EmptyState
          titulo="Falta el RUT"
          descripcion="Con el RUT, María arma el calendario con las fechas y las responsabilidades de la empresa."
          icon={CalendarDays}
          accion={{ label: "Subir RUT", href: "/configuracion/ia" }}
          accionSecundaria={{ label: "Marcarlas a mano", href: "/configuracion/impuestos" }}
        />
      ) : (
        <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold">Calendario {data.anio}</h2>
            <p className="text-xs text-muted-foreground">
              Fechas según el último dígito del NIT ({data.configuracion.digito}, sin el de verificación)
              {data.configuracion.periodicidadIva ? ` y el IVA ${data.configuracion.periodicidadIva.toLowerCase()}` : ""}.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="px-5 py-3">Obligación</th>
                  <th className="px-3 py-3">Vence</th>
                  <th className="px-3 py-3">Estado</th>
                  <th className="px-3 py-3 text-right">Valor</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {pendientes.map((f) => (
                  <Fila key={`${f.obligacion}-${f.periodo}-${f.municipio?.codigo ?? ""}`} fila={f} onPresentar={onPresentar} onPagar={onPagar} onVerRetencion={onVerRetencion} />
                ))}
                {pagadas.length > 0 && (
                  <tr className="border-t border-border bg-muted/40">
                    <td colSpan={5} className="px-5 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Pagado este año
                    </td>
                  </tr>
                )}
                {pagadas.map((f) => (
                  <Fila key={`${f.obligacion}-${f.periodo}-${f.municipio?.codigo ?? ""}`} fila={f} onPresentar={onPresentar} onPagar={onPagar} onVerRetencion={onVerRetencion} />
                ))}
              </tbody>
            </table>
          </div>
          {data.filas.some((f) => f.vence === null && f.situacion.estado !== "PAGADA") && (
            <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
              «Fecha por confirmar»: el calendario tributario de ley todavía no tiene esa fecha cargada. Al registrar la
              presentación puede escribirla.
            </p>
          )}
        </section>
      )}
      <p className="text-xs text-muted-foreground">
        El sistema no presenta ni paga ante la DIAN: eso se hace en MUISCA con su firma. Aquí se registra lo que ya hizo, y el
        pago se asienta.
      </p>
    </div>
  );
}

function PorPagar({ datos }: { datos: Calendario }) {
  const tarjetas = datos.filas.filter((f) => f.situacion.estado !== "PAGADA").slice(0, 4);
  const proxima = datos.proxima;
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3 px-6 py-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Por pagar a la DIAN y al municipio</p>
          <p className="font-mono text-3xl font-semibold tracking-[-0.03em] whitespace-nowrap tabular-nums">{formatCOP(datos.porPagar)}</p>
        </div>
        {proxima && (
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {proxima.situacion.dias !== null && (
              <Chip fila={proxima} texto={proxima.situacion.dias < 0 ? `Vencida hace ${-proxima.situacion.dias} días` : `Vence en ${proxima.situacion.dias} días`} />
            )}
            {proxima.etiqueta}
            {proxima.vence ? ` · ${fechaCorta(proxima.vence).toLowerCase()}` : " · fecha por confirmar"}
          </p>
        )}
      </div>
      {tarjetas.length > 0 && (
        <ul className="grid border-t border-border sm:grid-cols-2 lg:grid-cols-4">
          {tarjetas.map((f) => {
            const e = estadoEnPalabras(f);
            return (
              <li key={`${f.obligacion}-${f.periodo}-${f.municipio?.codigo ?? ""}`} className="border-b border-border px-6 py-4 sm:border-r">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  {e.tono !== "neutro" && <span className={cn("size-2 rounded-full", e.tono === "error" ? "bg-danger" : "bg-warning")} />}
                  {f.etiqueta}
                </p>
                <p className="text-xs text-muted-foreground">{e.texto}</p>
                <p className="mt-1 font-mono text-lg font-semibold whitespace-nowrap tabular-nums">
                  {f.valor === null ? "—" : formatCOP(f.valor)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Fila({
  fila: f,
  onPresentar,
  onPagar,
  onVerRetencion,
}: {
  fila: FilaCalendario;
  onPresentar: (f: FilaCalendario) => void;
  onPagar: (f: FilaCalendario) => void;
  onVerRetencion: (mes: string) => void;
}) {
  const presenta = useTieneRol("DIRECTOR", "CONTADOR");
  const paga = useTieneRol("DIRECTOR", "CONTADOR", "CAJA");
  const e = estadoEnPalabras(f);
  const estado = f.situacion.estado;
  return (
    <tr className="border-t border-border">
      <td className="px-5 py-3">
        {f.obligacion === "RETENCION" ? (
          <button type="button" onClick={() => onVerRetencion(f.periodo)} className="text-left font-semibold hover:underline">
            {f.etiqueta}
          </button>
        ) : (
          <p className="font-semibold">{f.etiqueta}</p>
        )}
        <p className="font-mono text-xs text-muted-foreground">{detalleDeFila(f)}</p>
      </td>
      <td className="px-3 py-3 whitespace-nowrap">{f.vence ? fechaCorta(f.vence) : <span className="text-muted-foreground">Por confirmar</span>}</td>
      <td className="px-3 py-3">
        <Chip fila={f} texto={e.texto} />
      </td>
      <td className="px-3 py-3 text-right font-mono font-semibold whitespace-nowrap tabular-nums">
        {f.valor === null ? "—" : formatCOP(f.valor)}
      </td>
      <td className="px-5 py-3 text-right whitespace-nowrap">
        {estado === "PRESENTADA" && paga && (
          <Button className="h-9 rounded-lg px-4" onClick={() => onPagar(f)}>
            Registrar pago
          </Button>
        )}
        {estado === "POR_PRESENTAR" && presenta && (
          <Button variant="outline" className="h-9 rounded-lg px-4" onClick={() => onPresentar(f)}>
            Ya la presenté
          </Button>
        )}
        {estado === "PAGADA" && (f.declaracion?.egreso || f.declaracion?.recibo490) && (
          <span
            className="font-mono text-[13px] whitespace-nowrap text-muted-foreground"
            title={f.declaracion.recibo490 ? `${f.municipio ? "Recibo" : "Recibo 490"} · ${f.declaracion.recibo490}` : undefined}
          >
            {f.declaracion.egreso ?? f.declaracion.recibo490}
          </span>
        )}
        {estado === "CAUSANDOSE" && f.obligacion === "RETENCION" && (
          <button type="button" onClick={() => onVerRetencion(f.periodo)} className="text-xs font-semibold hover:underline">
            Ver cómo va
          </button>
        )}
      </td>
    </tr>
  );
}

function Chip({ fila, texto }: { fila: FilaCalendario; texto: string }) {
  const { tono } = estadoEnPalabras(fila);
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", CLASES_TONO[tono])}>
      {texto}
    </span>
  );
}
