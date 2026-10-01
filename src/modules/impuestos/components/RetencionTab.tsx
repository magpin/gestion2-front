"use client";

import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Check, ChevronLeft, ChevronRight, FileText, TriangleAlert } from "lucide-react";

import { Aviso } from "@/components/shared/Aviso";
import { CabeceraPagina } from "@/components/shared/CabeceraPagina";
import { ErrorCarga, SILENCIOSO } from "@/components/shared/ErrorCarga";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import { Button } from "@/components/ui/button";
import { useTieneRol } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import { cn, formatCOP } from "@/lib/utils";
import { finDeMes, moverMes, nombreMes } from "@/modules/gastos/lib/mes";
import { fechaCorta } from "../lib/impuestos";
import { impuestosApi } from "../services/impuestos.service";
import type { FilaCalendario, Renglon350, RetencionDelMes } from "../types/impuestos.types";

/**
 * Impuestos → Retención (lienzo «Retención de septiembre · 350»): el 350 del
 * mes armado del libro, en qué va su declaración, y la presentación y el pago.
 */
const consultaRetencion = (mes: string) => ({
  queryKey: ["impuestos", "retencion", mes],
  queryFn: () => impuestosApi.retencion(mes),
  meta: SILENCIOSO,
});

/** «septiembre» de un «2026-09». */
const soloMes = (mes: string) => nombreMes(mes).split(" ")[0].toLowerCase();

/**
 * La cabecera de la pestaña (lienzo 04): «Retención en la fuente.», el
 * formulario y su vencimiento, y el pago con su monto a la derecha.
 */
export function CabeceraRetencion({ mes, onPagar }: { mes: string; onPagar: (f: FilaCalendario) => void }) {
  const { data } = useQuery(consultaRetencion(mes));
  const paga = useTieneRol("DIRECTOR", "CONTADOR", "CAJA");
  const fila = data?.fila;
  const vence = fila?.vence ? format(parseISO(fila.vence), "EEEE d 'de' MMMM", { locale: es }) : null;
  return (
    <CabeceraPagina
      ruta={[{ etiqueta: "Impuestos" }, { etiqueta: `Retención · ${nombreMes(mes).toLowerCase()}` }]}
      titulo="Retención en la fuente"
      subtitulo={`Formulario 350 de ${soloMes(mes)}.${vence ? ` Vence el ${vence}.` : ""}`}
      derecha={
        fila?.situacion.estado === "PRESENTADA" &&
        fila.declaracion &&
        paga && (
          <Button className="h-auto flex-col items-start gap-0 rounded-2xl px-6 py-3" onClick={() => onPagar(fila)}>
            <span className="text-xs font-semibold opacity-80">Registrar pago</span>
            <span className="font-mono text-lg font-semibold tabular-nums">{formatCOP(fila.declaracion.valorAPagar)}</span>
          </Button>
        )
      }
    />
  );
}

export function RetencionTab({
  mes,
  onMes,
  mesMaximo,
  onPresentar,
}: {
  mes: string;
  onMes: (mes: string) => void;
  mesMaximo: string;
  onPresentar: (f: FilaCalendario) => void;
}) {
  const { data, isError, error, refetch } = useQuery(consultaRetencion(mes));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-1 self-start rounded-2xl border border-border bg-card p-1 shadow-sm">
        <Button type="button" variant="ghost" className="size-9 rounded-xl p-0" aria-label="Mes anterior" onClick={() => onMes(moverMes(mes, -1))}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-40 text-center text-sm font-semibold">{nombreMes(mes)}</span>
        <Button
          type="button"
          variant="ghost"
          className="size-9 rounded-xl p-0"
          aria-label="Mes siguiente"
          disabled={mes >= mesMaximo}
          onClick={() => onMes(moverMes(mes, 1))}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
      {data === undefined ? (
        isError ? (
          <ErrorCarga error={error} titulo="No se pudo armar el 350" onReintentar={refetch} />
        ) : (
          <SkeletonTable />
        )
      ) : (
        <Contenido datos={data} onPresentar={onPresentar} />
      )}
    </div>
  );
}

function Contenido({ datos, onPresentar }: { datos: RetencionDelMes; onPresentar: (f: FilaCalendario) => void }) {
  const { fila, formulario } = datos;
  const d = fila.declaracion;
  const estado = fila.situacion.estado;
  const presenta = useTieneRol("DIRECTOR", "CONTADOR");
  const corte = fechaCorta(finDeMes(datos.mes)).toLowerCase();
  const pagadaPorBanco = d?.conciliada !== null && d?.conciliada !== undefined;

  // Los cinco pasos del lienzo. «Revisado» es al presentarla: quien la
  // registra como presentada es quien revisó el borrador.
  const pasos = [
    {
      nombre: "Causada",
      detalle:
        estado === "CAUSANDOSE"
          ? "Se sigue causando"
          : `1 al ${corte} · ${formulario.filas} ${formulario.filas === 1 ? "retención" : "retenciones"}`,
      hecho: estado !== "CAUSANDOSE",
    },
    {
      nombre: "Borrador revisado",
      detalle: d
        ? `${fechaCorta(d.presentadaEl)}${d.presentadaPor ? ` · ${d.presentadaPor}` : ""}`
        : formulario.cuadre.cuadra
          ? "Cuadra con el libro"
          : "Revise la diferencia",
      hecho: d !== null,
    },
    {
      nombre: "Presentada en MUISCA",
      detalle: d ? `${fechaCorta(d.presentadaEl)} · N.º ${d.numeroFormulario}` : "Con su firma",
      hecho: d !== null,
    },
    {
      nombre: "Pagada",
      detalle: d?.pagadaEl
        ? `${fechaCorta(d.pagadaEl)}${d.egreso ? ` · ${d.egreso}` : ""}`
        : fila.vence
          ? `Antes del ${fechaCorta(fila.vence).toLowerCase()}`
          : "Fecha por confirmar",
      hecho: estado === "PAGADA",
    },
    {
      nombre: "Conciliada",
      detalle: estado === "PAGADA" && !pagadaPorBanco ? "Pagada por caja: no se concilia" : "Con el extracto del banco",
      hecho: d?.conciliada === true || (estado === "PAGADA" && !pagadaPorBanco),
    },
  ];
  const renglones = formulario.secciones.flatMap((s) => s.renglones.filter((r) => !r.vacio));

  return (
    <>
      <ol className="grid gap-4 rounded-3xl border border-border bg-card px-6 py-5 shadow-sm sm:grid-cols-3 lg:grid-cols-5">
        {pasos.map((p, i) => (
          <li key={p.nombre} className="flex items-start gap-3">
            <span
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-full border text-xs font-bold",
                p.hecho ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground",
              )}
            >
              {p.hecho ? <Check className="size-4" /> : i + 1}
            </span>
            <span>
              <span className="block text-sm font-semibold">{p.nombre}</span>
              <span className="block text-xs text-muted-foreground">{p.detalle}</span>
            </span>
          </li>
        ))}
      </ol>

      {estado === "PRESENTADA" && (
        <Aviso tono={fila.situacion.vencida ? "error" : "alarma"} titulo="Presentada, falta pagarla" cifra={formatCOP(d!.valorAPagar)}>
          Un 350 con saldo a pagar que no se paga dentro de los dos meses siguientes al vencimiento queda como no presentado (art.
          580-1 ET). {fila.situacion.vencida ? "Ya venció: al pagar, sume los intereses de mora." : ""}
        </Aviso>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <section className="min-w-0 flex-1 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-base font-semibold">Borrador del 350</h2>
              <p className="text-xs text-muted-foreground">
                Armado desde los auxiliares 2365. Los renglones siguen el formulario vigente. Valores al mil.
              </p>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                formulario.cuadre.cuadra ? "border-success/30 bg-success/15" : "border-warning/30 bg-warning/15",
              )}
            >
              {formulario.cuadre.cuadra ? <Check className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
              {formulario.cuadre.cuadra ? "Cuadra con el libro" : `No cuadra por ${formulario.cuadre.diferencia}`}
            </span>
          </div>
          {renglones.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground">
              En {nombreMes(datos.mes).split(" ")[0].toLowerCase()} no se practicaron retenciones. Sin operaciones sujetas a
              retención, el 350 no se presenta.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    <th className="px-5 py-3">Concepto</th>
                    <th className="px-3 py-3 text-right">Base</th>
                    <th className="px-3 py-3 text-right">Tarifa</th>
                    <th className="px-5 py-3 text-right">Retenido</th>
                  </tr>
                </thead>
                <tbody className="font-mono tabular-nums">
                  {renglones.map((r) => (
                    <FilaRenglon key={r.codigo} renglon={r} />
                  ))}
                  <tr className="border-t-2 border-border bg-muted">
                    <th scope="row" className="px-5 py-3.5 text-left font-sans text-base font-bold">
                      Total a pagar
                    </th>
                    <td />
                    <td />
                    <td className="px-5 py-3.5 text-right text-base font-bold whitespace-nowrap">{formulario.totales.total}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          {formulario.sinRenglon.length > 0 && (
            <p className="border-t border-border px-5 py-3 text-xs text-warning">
              {formulario.sinRenglon.length} {formulario.sinRenglon.length === 1 ? "retención no tiene" : "retenciones no tienen"} renglón
              en el formulario: revíselas en Reportes → Formulario 350 antes de presentar.
            </p>
          )}
        </section>

        <aside className="flex w-full flex-col gap-4 lg:w-80 lg:shrink-0">
          <section className="rounded-3xl border border-border bg-card px-5 py-4 shadow-sm">
            <h2 className="text-base font-semibold">Presentación y recibo</h2>
            {d === null ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {estado === "CAUSANDOSE"
                  ? "El mes todavía no termina: la retención se sigue causando."
                  : "Preséntela en MUISCA y deje aquí el número del formulario y el PDF."}
              </p>
            ) : (
              <dl className="mt-3 flex flex-col gap-3 text-sm">
                <Dato etiqueta="Formulario 350" valor={d.numeroFormulario} detalle={`Presentado el ${fechaCorta(d.presentadaEl).toLowerCase()}`} />
                {d.recibo490 && (
                  <Dato
                    etiqueta="Recibo de pago 490"
                    valor={d.recibo490}
                    detalle={d.pagadaEl ? `Pagado el ${fechaCorta(d.pagadaEl).toLowerCase()}${d.egreso ? ` · ${d.egreso}` : ""}` : ""}
                  />
                )}
                {d.tieneArchivo && (
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-left text-sm hover:bg-accent"
                    onClick={() =>
                      void impuestosApi
                        .archivo(d.id)
                        .then((a) => window.open(a.url, "_blank", "noopener"))
                        .catch((e: unknown) => aviso.falla(e, "cargar"))
                    }
                  >
                    <FileText className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{d.archivoNombre ?? "El formulario en PDF"}</span>
                    <span className="font-semibold">Abrir</span>
                  </button>
                )}
              </dl>
            )}
            <div className="mt-4 flex flex-col gap-2">
              {estado === "POR_PRESENTAR" && presenta && (
                <Button className="h-11 rounded-xl" onClick={() => onPresentar(fila)}>
                  Ya la presenté
                </Button>
              )}
              {estado === "PRESENTADA" && presenta && (
                <Button variant="outline" className="h-11 rounded-xl" onClick={() => onPresentar(fila)}>
                  Corregir la presentación
                </Button>
              )}
            </div>
          </section>
          {d !== null && <Trazabilidad datos={datos} />}
        </aside>
      </div>
    </>
  );
}

function FilaRenglon({ renglon: r }: { renglon: Renglon350 }) {
  const cifra = r.unico ?? sumar(r.pj, r.pn);
  const tarifa = r.tarifa ?? (r.seccion === "AUTORRETENCION" ? "Según CIIU" : "Varias");
  return (
    <tr className="border-t border-border">
      <th scope="row" className="px-5 py-3 text-left font-sans font-medium">
        {r.nombre}
        <span className="block text-xs font-normal text-muted-foreground">
          {r.documentos} {r.documentos === 1 ? "documento" : "documentos"} ·{" "}
          <span className="font-mono">renglón {r.casillas}</span>
        </span>
      </th>
      <td className="px-3 py-3 text-right whitespace-nowrap">{cifra ? formatCOP(cifra.baseMil / 100) : ""}</td>
      <td className="px-3 py-3 text-right font-sans whitespace-nowrap text-muted-foreground">{tarifa}</td>
      <td className="px-5 py-3 text-right font-semibold whitespace-nowrap">{cifra ? formatCOP(cifra.valorMil / 100) : ""}</td>
    </tr>
  );
}

/** Personas jurídicas y naturales juntas: la pantalla muestra el renglón entero. */
function sumar(a: { baseMil: number; valorMil: number } | null, b: { baseMil: number; valorMil: number } | null) {
  if (a === null && b === null) return null;
  return { baseMil: (a?.baseMil ?? 0) + (b?.baseMil ?? 0), valorMil: (a?.valorMil ?? 0) + (b?.valorMil ?? 0) };
}

function Dato({ etiqueta, valor, detalle }: { etiqueta: string; valor: string; detalle: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{etiqueta}</dt>
      <dd className="font-mono text-base font-semibold">{valor}</dd>
      {detalle && <dd className="text-xs text-muted-foreground">{detalle}</dd>}
    </div>
  );
}

/** Iniciales para el círculo: «Camila Torres» → «CT». */
const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

/**
 * Quién hizo qué con la declaración (lienzo 04): el borrador que sale del
 * libro, quién la presentó, quién registró el pago y si ya se concilió.
 */
function Trazabilidad({ datos }: { datos: RetencionDelMes }) {
  const d = datos.fila.declaracion!;
  const pasos: Array<{ titulo: string; detalle: string; fecha: string; quien: string | null }> = [
    {
      titulo: "El borrador salió del libro",
      detalle: `Desde los auxiliares, al cerrar ${soloMes(datos.mes)}`,
      fecha: fechaCorta(finDeMes(datos.mes)),
      quien: null,
    },
    {
      titulo: d.presentadaPor ? `${d.presentadaPor} la presentó en MUISCA` : "Presentada en MUISCA",
      detalle: d.tieneArchivo ? `Subió el PDF · N.º ${d.numeroFormulario}` : `N.º ${d.numeroFormulario}`,
      fecha: fechaCorta(d.presentadaEl),
      quien: d.presentadaPor,
    },
  ];
  if (d.pagadaEl) {
    pasos.push({
      titulo: d.pagadaPor ? `${d.pagadaPor} registró el pago` : "Pago registrado",
      detalle: [d.egreso, d.recibo490 ? `recibo 490 ${d.recibo490}` : null].filter(Boolean).join(" · "),
      fecha: fechaCorta(d.pagadaEl),
      quien: d.pagadaPor,
    });
  }
  if (d.conciliada) {
    pasos.push({ titulo: "Conciliada", detalle: "Con el extracto del banco", fecha: "", quien: null });
  }
  return (
    <section className="rounded-3xl border border-border bg-card px-5 py-4 shadow-sm">
      <h2 className="text-base font-semibold">Trazabilidad</h2>
      <ol className="mt-3 flex flex-col gap-3">
        {pasos.map((p) => (
          <li key={p.titulo} className="flex items-start gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-muted text-[11px] font-bold">
              {p.quien ? iniciales(p.quien) : <Check className="size-3.5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{p.titulo}</span>
              {p.detalle && <span className="block text-xs text-muted-foreground">{p.detalle}</span>}
            </span>
            {p.fecha && <span className="shrink-0 text-xs text-muted-foreground">{p.fecha}</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}
