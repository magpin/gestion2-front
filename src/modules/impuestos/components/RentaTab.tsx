"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCarga, SILENCIOSO } from "@/components/shared/ErrorCarga";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import { useTieneRol } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import { cn, formatCOP } from "@/lib/utils";
import { fechaCorta } from "../lib/impuestos";
import { impuestosApi } from "../services/impuestos.service";
import { TarjetaDeclaracion } from "./TarjetaDeclaracion";
import type { FilaCalendario, PagoCuota, RentaEstimada, RentaPantalla, ZomacTamano } from "../types/impuestos.types";

/** Los meses en que suelen vencer las cuotas: sociedades en mayo y julio; grandes contribuyentes en febrero, abril y junio. */
const MESES_CUOTA = { sociedad: [5, 7], granContribuyente: [2, 4, 6] };
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const ZOMAC: Array<{ valor: ZomacTamano | null; nombre: string }> = [
  { valor: null, nombre: "No es ZOMAC" },
  { valor: "MICRO", nombre: "Micro" },
  { valor: "PEQUENA", nombre: "Pequeña" },
  { valor: "MEDIANA", nombre: "Mediana" },
  { valor: "GRANDE", nombre: "Grande" },
];
const pct = (v: number) => `${(v * 100).toLocaleString("es-CO", { maximumFractionDigits: 2 })} %`;

/**
 * Impuestos → Renta (lienzo «Renta 110»): lo que pagaría la sociedad si el año
 * cerrara hoy, sacado del libro, y la declaración del año anterior con sus
 * cuotas. El estimado no es la declaración: los ajustes fiscales los hace el
 * contador (Y8).
 */
export function RentaTab({
  onPresentar,
  onPagar,
}: {
  onPresentar: (f: FilaCalendario) => void;
  onPagar: (f: FilaCalendario) => void;
}) {
  const { data, isError, error, refetch } = useQuery({
    queryKey: ["impuestos", "renta"],
    queryFn: () => impuestosApi.renta(),
    meta: SILENCIOSO,
  });

  if (data === undefined) {
    return isError ? <ErrorCarga error={error} titulo="No se pudo armar la renta" onReintentar={refetch} /> : <SkeletonTable />;
  }
  const c = data.configuracion;
  if (data.estimado === null || data.fila === null) {
    return (
      <EmptyState
        titulo={
          c.regimenSimple
            ? "La empresa está en el régimen simple"
            : c.tipoPersona === "NATURAL"
              ? "El estimado es para sociedades"
              : "La empresa no declara renta en el 110"
        }
        descripcion={
          c.regimenSimple
            ? "En el SIMPLE la renta va en el formulario 260, con sus anticipos bimestrales: este estimado no aplica."
            : c.tipoPersona === "NATURAL"
              ? "La renta de una persona natural se depura por cédulas, con sus propias tablas: la hace el contador."
              : "Según el RUT no tiene la responsabilidad 05 (renta del régimen ordinario). Si cambió, actualícelo en Configurar empresa."
        }
        icon={FileText}
        accion={{ label: "Ir a Configurar empresa", href: "/configuracion/impuestos" }}
      />
    );
  }
  return <Contenido datos={data as Completo} onPresentar={onPresentar} onPagar={onPagar} />;
}

type Completo = RentaPantalla & { estimado: RentaEstimada; fila: FilaCalendario };

function Contenido({
  datos,
  onPresentar,
  onPagar,
}: {
  datos: Completo;
  onPresentar: (f: FilaCalendario) => void;
  onPagar: (f: FilaCalendario) => void;
}) {
  const e = datos.estimado;
  const c = datos.configuracion;
  const aFavor = e.saldo < 0;
  const siguiente = e.anio + 1;
  const meses = c.granContribuyente ? MESES_CUOTA.granContribuyente : MESES_CUOTA.sociedad;

  // Para tener las cuotas sin apretar la caja: lo que habría que apartar cada
  // mes desde el que viene hasta el mes de la última cuota.
  const mesHoy = Number(datos.hoy.slice(5, 7));
  const ultimoMes = meses[meses.length - 1];
  const mesesHasta = (siguiente - e.anio) * 12 + ultimoMes - mesHoy;
  const apartar = !aFavor && mesesHasta > 0 ? Math.ceil(e.saldo / mesesHasta / 1000) * 1000 : 0;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4 px-6 py-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Renta del año {e.anio} · estimado a hoy
              </p>
              <p className="font-mono text-3xl font-semibold tracking-[-0.03em] whitespace-nowrap tabular-nums">
                {formatCOP(Math.abs(e.saldo))}
              </p>
              <p className="text-sm text-muted-foreground">
                {aFavor ? "Saldo a favor si el año cerrara hoy." : "Lo que pagarías si el año cerrara hoy."} Se declara en {siguiente}.
              </p>
            </div>
            <span className="rounded-full border border-warning/30 bg-warning/15 px-3 py-1 text-xs font-medium">
              Estimado · no es la declaración
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <tbody className="font-mono tabular-nums">
                <Renglon concepto={`Utilidad contable de enero a hoy`} valor={e.utilidad} />
                {e.gmfNoDeducible > 0 && <Renglon concepto="Más · 4×1000 que no se puede restar (la mitad)" valor={e.gmfNoDeducible} />}
                {e.multas > 0 && <Renglon concepto="Más · multas, sanciones e intereses de mora" valor={e.multas} />}
                <Renglon concepto="Renta líquida estimada" valor={e.rentaLiquida} fuerte />
                <Renglon
                  concepto={`Impuesto · tarifa del ${pct(e.tarifa)}`}
                  detalle={e.factorZomac < 1 ? `ZOMAC: el ${pct(e.factorZomac)} de la tarifa general del 35 % este año.` : undefined}
                  valor={e.impuesto}
                />
                {e.retenciones > 0 && <Renglon concepto="Menos · retenciones y autorretenciones del año" valor={-e.retenciones} />}
                {e.anticipoAnterior !== null && e.anticipoAnterior > 0 && (
                  <Renglon concepto={`Menos · anticipo liquidado en la declaración de ${e.anio - 1}`} valor={-e.anticipoAnterior} />
                )}
                {e.anticipoSiguiente.valor > 0 && (
                  <Renglon
                    concepto={`Más · anticipo para ${siguiente} (${pct(e.anticipoSiguiente.porcentaje)})`}
                    detalle={
                      e.anticipoSiguiente.procedimiento2 !== null
                        ? "El menor entre el impuesto de este año y el promedio de los dos últimos (art. 807 ET)."
                        : "Sobre el impuesto de este año, menos lo retenido (art. 807 ET)."
                    }
                    valor={e.anticipoSiguiente.valor}
                  />
                )}
                <tr className="border-t-2 border-border bg-muted">
                  <th scope="row" className="px-5 py-3.5 text-left font-sans text-base font-bold">
                    {aFavor ? "Saldo a favor estimado" : "Saldo estimado a pagar"}
                  </th>
                  <td className="px-5 py-3.5 text-right text-base font-bold whitespace-nowrap">{formatCOP(Math.abs(e.saldo))}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
            Calculado con su contabilidad a hoy, al múltiplo de mil. No incluye la tasa mínima de tributación, rentas exentas,
            descuentos ni diferencias fiscales: su contador confirma los ajustes al cierre del año.
            {e.anticipoAnterior === null && ` Falta registrar la declaración de ${e.anio - 1}: sin ella no se resta su anticipo.`}
          </p>
        </section>

        {e.cuotas.length > 0 && (
          <section className="rounded-3xl border border-border bg-card px-6 py-5 shadow-sm">
            <h2 className="text-base font-semibold">Cuándo se paga</h2>
            <ul className={cn("mt-4 grid gap-3", e.cuotas.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
              {e.cuotas.map((q, i) => (
                <li key={q.numero} className="rounded-2xl border border-border px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    {q.numero}.ª cuota{i === 0 ? " · con la declaración" : ""}
                  </p>
                  <p className="font-semibold capitalize">
                    {MESES[meses[i] - 1]} {siguiente}
                  </p>
                  <p className="font-mono text-sm whitespace-nowrap tabular-nums">≈ {formatCOP(q.valor)}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              El día exacto sale del decreto de plazos de {siguiente} y del último dígito del NIT sin el de verificación ({c.digito}).
            </p>
          </section>
        )}
      </div>

      <aside className="flex w-full flex-col gap-4 lg:w-80 lg:shrink-0">
        {datos.anterior && (
          <>
            <TarjetaDeclaracion fila={datos.anterior} titulo={`Declaración ${datos.anterior.periodo}`} onPresentar={onPresentar} onPagar={onPagar} />
            {datos.anterior.declaracion && <Cuotas cuotas={datos.anterior.declaracion.cuotas} pagos={datos.pagos} />}
          </>
        )}
        <Zomac actual={c.zomacTamano} />
        {apartar > 0 && (
          <section className="rounded-3xl border border-border bg-card px-5 py-4 shadow-sm">
            <p className="text-sm font-semibold">Para tenerlo listo</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Si aparta unos <span className="font-mono whitespace-nowrap text-foreground">{formatCOP(apartar)}</span> al mes desde{" "}
              {MESES[mesHoy % 12]}, en {MESES[ultimoMes - 1]} tiene {e.cuotas.length === 1 ? "la cuota" : `las ${e.cuotas.length} cuotas`} sin
              afectar la caja.
            </p>
          </section>
        )}
      </aside>
    </div>
  );
}

/** Las cuotas de la declaración del año anterior: cuáles se pagaron y con qué recibo. */
function Cuotas({ cuotas, pagos }: { cuotas: number; pagos: PagoCuota[] }) {
  return (
    <section className="rounded-3xl border border-border bg-card px-5 py-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Cuotas</p>
      <ul className="mt-2 flex flex-col gap-2">
        {Array.from({ length: cuotas }, (_, i) => {
          const p = pagos.find((x) => x.cuota === i + 1);
          return (
            <li key={i} className="flex items-baseline justify-between gap-3 rounded-2xl bg-muted px-4 py-2.5 text-sm">
              <span>
                <span className="font-semibold">{i + 1}.ª cuota</span>
                <span className="block text-xs text-muted-foreground">
                  {p ? `${fechaCorta(p.pagadaEl).toLowerCase()} · 490 ${p.recibo490}` : "Por pagar"}
                </span>
              </span>
              {p && <span className="font-mono whitespace-nowrap tabular-nums">{formatCOP(p.valor)}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Si la sociedad es ZOMAC y de qué tamaño: le baja la tarifa (Ley 1819 de 2016, art. 237). */
function Zomac({ actual }: { actual: ZomacTamano | null }) {
  const puede = useTieneRol("DIRECTOR", "CONTADOR");
  const queryClient = useQueryClient();
  const guardar = useMutation({
    mutationFn: (z: ZomacTamano | null) => impuestosApi.guardarZomac(z),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["impuestos"] }),
    onError: (e: unknown) => aviso.falla(e),
  });
  return (
    <section className="rounded-3xl border border-border bg-card px-5 py-4 shadow-sm">
      <p className="text-sm font-semibold">¿La empresa es ZOMAC?</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Una sociedad de las zonas más afectadas por el conflicto paga una parte de la tarifa, según su tamaño y el año.
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Tamaño ZOMAC">
        {ZOMAC.map((z) => (
          <button
            key={z.nombre}
            type="button"
            aria-pressed={actual === z.valor}
            disabled={!puede || guardar.isPending}
            onClick={() => guardar.mutate(z.valor)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-60",
              actual === z.valor ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent",
            )}
          >
            {z.nombre}
          </button>
        ))}
      </div>
    </section>
  );
}

function Renglon({ concepto, detalle, valor, fuerte = false }: { concepto: string; detalle?: string; valor: number; fuerte?: boolean }) {
  return (
    <tr className={cn("border-t border-border", fuerte && "bg-muted/50")}>
      <th scope="row" className={cn("px-5 py-3 text-left font-sans", fuerte ? "font-semibold" : "font-medium")}>
        {concepto}
        {detalle && <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{detalle}</span>}
      </th>
      <td className="px-5 py-3 text-right font-semibold whitespace-nowrap">
        {valor < 0 ? `− ${formatCOP(-valor)}` : formatCOP(valor)}
      </td>
    </tr>
  );
}
