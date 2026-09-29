"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";

import { CampoPesos } from "@/components/shared/CampoNumero";
import { Button } from "@/components/ui/button";
import { SILENCIOSO } from "@/components/shared/ErrorCarga";
import { useQuieto } from "@/hooks/useQuieto";
import { aviso } from "@/lib/avisos";
import { cn, formatCOP, formatFecha } from "@/lib/utils";
import { cobrosApi } from "@/modules/cobros/services/cobros.service";
import { Campo } from "@/modules/configuracion/components/Campo";
import { retencionesApi } from "@/modules/retenciones/services/retenciones.service";
import { SelectorFormaPago } from "@/modules/tesoreria/components/SelectorFormaPago";
import { EditorLineasVenta } from "../components/EditorLineasVenta";
import { SelectorTercero } from "../components/SelectorTercero";
import {
  useBorradorFactura,
  PLAZOS,
  type BorradorFactura,
} from "../hooks/useBorradorFactura";
import { useEmitirFactura } from "../hooks/useEmitirFactura";
import { facturasApi } from "../services/ventas.service";
import type { CrearFacturaInput, FacturaPrevia } from "../types/ventas.types";

/**
 * La factura nueva como página (pantalla 13): productos, servicios y otros
 * ingresos en la misma factura, el plazo que decide cuándo aparece en Por
 * cobrar y, a la derecha, cuánto va a entrar.
 *
 * El resumen y el asiento los arma el servidor corriendo la factura de verdad
 * y deshaciéndola (`POST /facturas/previo`): no hay una segunda cuenta en el
 * navegador que se pueda desalinear de la que se emite.
 */
export function FacturaNuevaView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const b = useBorradorFactura();

  const { data: numeracion } = useQuery({
    queryKey: ["facturas", "numeracion"],
    queryFn: facturasApi.numeracion,
  });

  const datos = b.datos();
  const pedido = useQuieto(datos === null ? null : JSON.stringify(datos), 500);
  const previo = useQuery({
    queryKey: ["facturas", "previo", pedido],
    queryFn: () => facturasApi.previo(JSON.parse(pedido!) as CrearFacturaInput),
    enabled: pedido !== null,
    retry: false,
    staleTime: 30_000,
    // El error se muestra en el resumen, no en un aviso que tapa la página.
    meta: SILENCIOSO,
  });

  const emitir = useEmitirFactura(facturasApi.crear, async (f) => {
    await queryClient.invalidateQueries({ queryKey: ["facturas"] });
    aviso.exito(`Factura ${f.prefijo ?? ""}${f.consecutivo} emitida`);
    router.push("/dashboard/ventas");
  });

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-7 sm:px-10 lg:px-16">
      <header className="mb-8">
        <Link
          href="/dashboard/ventas"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Ventas
        </Link>
        <h1 className="text-4xl font-semibold tracking-[-0.04em]">
          Nueva factura de venta<span className="text-brand">.</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Productos, servicios y otros ingresos en la misma factura. El plazo
          decide cuándo aparece en Por cobrar.
        </p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          <Tarjeta titulo="Cliente y documento">
            <div className="grid gap-4 sm:grid-cols-[1fr_180px_160px]">
              <Campo id="cliente" etiqueta="Cliente" escala="grande">
                <SelectorTercero valor={b.cliente} onElegir={b.setCliente} />
              </Campo>
              <Campo id="numero" etiqueta="Número" escala="grande">
                <div className="flex h-11 flex-col justify-center rounded-xl bg-muted px-4">
                  <span className="font-mono text-sm font-semibold">
                    {numeracion?.siguiente ?? "—"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {numeracion === null
                      ? "No hay resolución vigente"
                      : "Siguiente de la resolución"}
                  </span>
                </div>
              </Campo>
              <Campo id="fecha" etiqueta="Fecha" escala="grande">
                <div className="flex h-11 items-center rounded-xl border border-input px-4 text-sm">
                  {formatFecha(b.fecha)}
                </div>
              </Campo>
            </div>
          </Tarjeta>

          <Tarjeta titulo="Plazo">
            <Plazo b={b} />
          </Tarjeta>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:row-span-2">
          <Resumen
            previa={pedido === null ? undefined : previo.data}
            cargando={pedido !== null && previo.isFetching}
            error={
              pedido !== null && previo.isError ? mensajeDe(previo.error) : null
            }
          />
          <p className="text-sm text-muted-foreground">
            {b.problema ?? "Lista para emitir."}
          </p>
          <Button
            type="button"
            className="h-12 rounded-xl px-6"
            disabled={datos === null || emitir.isPending}
            onClick={() => datos !== null && emitir.mutate(datos)}
          >
            {emitir.isPending && <Loader2 className="size-4 animate-spin" />}
            Emitir factura
          </Button>
          <Button
            variant="outline"
            className="h-12 rounded-xl px-6"
            render={<Link href="/dashboard/ventas" />}
          >
            Cancelar
          </Button>
        </aside>

        <div className="flex flex-col gap-6 lg:col-start-1">
          <Tarjeta
            titulo="Líneas de la factura"
            nota="Producto sale del inventario · servicio y otro ingreso van por concepto"
          >
            <EditorLineasVenta
              lineas={b.lineas}
              onCambiar={b.setLineas}
              conConceptos
            />
          </Tarjeta>

          <Tarjeta
            titulo="Te retienen"
            nota="Lo que dice el certificado del cliente. No baja el total: baja lo que entra."
          >
            <Retenciones b={b} subtotal={previo.data?.subtotal ?? null} />
          </Tarjeta>

          {previo.data && pedido !== null && <Asiento previa={previo.data} />}
        </div>
      </div>
    </div>
  );
}

function mensajeDe(e: unknown): string {
  const m = (e as { response?: { data?: { message?: string | string[] } } })
    ?.response?.data?.message;
  return Array.isArray(m) ? m[0] : (m ?? "No se pudo armar el resumen.");
}

function Tarjeta({
  titulo,
  nota,
  children,
}: {
  titulo: string;
  nota?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {titulo}
        </h2>
        {nota && <p className="text-xs text-muted-foreground">{nota}</p>}
      </div>
      {children}
    </section>
  );
}

/** Contado o crédito; a crédito, el plazo (el del cliente por defecto) y el vence. */
function Plazo({ b }: { b: BorradorFactura }) {
  const { data: facturas = [] } = useQuery({
    queryKey: ["cartera", "facturas", b.cliente?.id],
    queryFn: () => cobrosApi.facturasDe(b.cliente!.id),
    enabled: b.cliente !== null,
  });
  const vencidas = facturas.filter((f) => f.diasVencidos > 0);
  const plazos = [
    ...new Set([
      ...PLAZOS,
      ...(b.plazoDelCliente === null ? [] : [b.plazoDelCliente]),
    ]),
  ].sort((x, y) => x - y);

  return (
    <div className="flex flex-col gap-4">
      <SelectorFormaPago
        valor={b.formaPago}
        onCambiar={b.setFormaPago}
        cajaFija
      />
      {b.formaPago.modo === "CREDITO" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="plazo" etiqueta="Plazo" escala="grande">
            <select
              id="plazo"
              value={b.plazo}
              onChange={(e) => b.setPlazo(e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm"
            >
              {plazos.map((d) => (
                <option key={d} value={String(d)}>
                  {d === 0 ? "Mismo día" : `${d} días`}
                </option>
              ))}
            </select>
          </Campo>
          <Campo id="vence" etiqueta="Vence" escala="grande">
            <div className="flex h-11 flex-col justify-center rounded-xl bg-muted px-4">
              <span className="text-sm font-semibold">
                {b.vence ? formatFecha(b.vence) : "—"}
              </span>
              {b.plazoDelCliente !== null &&
                Number(b.plazo) === b.plazoDelCliente && (
                  <span className="text-[11px] text-muted-foreground">
                    Plazo habitual de este cliente
                  </span>
                )}
            </div>
          </Campo>
        </div>
      )}
      {vencidas.length > 0 && (
        <p className="flex items-start gap-2 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Este cliente tiene{" "}
            {vencidas.length === 1
              ? "1 factura vencida"
              : `${vencidas.length} facturas vencidas`}{" "}
            por{" "}
            <span className="font-mono font-semibold">
              {formatCOP(vencidas.reduce((s, f) => s + f.pendiente, 0))}
            </span>
            , la más vieja hace{" "}
            {Math.max(...vencidas.map((f) => f.diasVencidos))} días.
          </span>
        </p>
      )}
    </div>
  );
}

/** Lo que el cliente nos retiene: el concepto (de los que nos pueden retener) y la base. */
function Retenciones({
  b,
  subtotal,
}: {
  b: BorradorFactura;
  subtotal: number | null;
}) {
  const { data: conceptos = [] } = useQuery({
    queryKey: ["retenciones", "conceptos"],
    queryFn: () => retencionesApi.conceptos(),
  });
  const deVenta = conceptos.filter(
    (c) => c.activo && c.cuenta_activo_id !== null,
  );
  const cambiar = (
    clave: number,
    cambio: Partial<{ conceptoId: string; base: string }>,
  ) =>
    b.setRetenciones(
      b.retenciones.map((r) => (r.clave === clave ? { ...r, ...cambio } : r)),
    );

  return (
    <div className="flex flex-col gap-3">
      {b.retenciones.length === 0 && (
        <p className="text-sm text-muted-foreground">
          El cliente no te retiene nada en esta factura.
        </p>
      )}
      {b.retenciones.map((r, i) => (
        <div
          key={r.clave}
          className="grid items-end gap-3 sm:grid-cols-[1fr_180px_auto]"
        >
          <Campo id={`ret-${r.clave}`} etiqueta={i === 0 ? "Concepto" : ""}>
            <select
              id={`ret-${r.clave}`}
              value={r.conceptoId}
              onChange={(e) => cambiar(r.clave, { conceptoId: e.target.value })}
              className="h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm"
            >
              <option value="">Elegí…</option>
              {deVenta.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo id={`base-${r.clave}`} etiqueta={i === 0 ? "Base" : ""}>
            <CampoPesos
              id={`base-${r.clave}`}
              value={r.base}
              onChange={(base) => cambiar(r.clave, { base })}
              className="h-11 rounded-xl px-4 text-right font-mono"
            />
          </Campo>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Quitar la retención"
            className="mb-1 text-muted-foreground hover:text-danger"
            onClick={() =>
              b.setRetenciones(b.retenciones.filter((x) => x.clave !== r.clave))
            }
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        className="h-10 w-fit rounded-xl px-3 text-brand-text"
        onClick={() =>
          b.setRetenciones([
            ...b.retenciones,
            {
              clave: Date.now() + Math.random(),
              conceptoId: "",
              base: subtotal === null ? "" : String(subtotal),
            },
          ])
        }
      >
        <Plus className="size-4" />
        Agregar retención
      </Button>
    </div>
  );
}

/** Subtotal, IVA, total, lo que retienen y «Vas a recibir». */
function Resumen({
  previa,
  cargando,
  error,
}: {
  previa: FacturaPrevia | undefined;
  cargando: boolean;
  error: string | null;
}) {
  if (previa === undefined) {
    return (
      <div className="rounded-3xl border border-dashed border-border px-5 py-6 text-sm text-muted-foreground">
        {cargando ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Armando el resumen…
          </span>
        ) : error !== null ? (
          <span className="text-danger">{error}</span>
        ) : (
          "Cuando esté todo, acá ves cuánto vas a recibir y el asiento, antes de emitir."
        )}
      </div>
    );
  }
  const fila = (etiqueta: string, valor: number, fuerte = false) => (
    <div className="flex justify-between gap-3">
      <span className={fuerte ? "font-semibold" : "text-muted-foreground"}>
        {etiqueta}
      </span>
      <span className={cn("font-mono tabular-nums", fuerte && "font-semibold")}>
        {formatCOP(valor)}
      </span>
    </div>
  );
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-3xl border border-border bg-card p-5 text-sm shadow-sm",
        cargando && "opacity-60",
      )}
    >
      <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
        Resumen
      </p>
      {fila("Subtotal", previa.subtotal)}
      {previa.iva > 0 && fila("IVA", previa.iva)}
      {fila("Total factura", previa.total, true)}
      {previa.retenciones.map((r, i) => (
        <div key={i} className="flex justify-between gap-3">
          <span className="text-muted-foreground">
            Te retienen{" "}
            <span className="text-xs">
              (
              {(r.tarifa * 100).toLocaleString("es-CO", {
                maximumFractionDigits: 3,
              })}{" "}
              %)
            </span>
          </span>
          <span className="font-mono tabular-nums">−{formatCOP(r.valor)}</span>
        </div>
      ))}
      <div className="mt-2 border-t border-border pt-3">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Vas a recibir
        </p>
        <p className="font-mono text-2xl font-semibold tabular-nums">
          {formatCOP(previa.neto)}
        </p>
        {previa.vence !== null && (
          <p className="text-xs text-muted-foreground">
            Aparece en Cobros → Por cobrar hasta el {formatFecha(previa.vence)}
          </p>
        )}
      </div>
    </div>
  );
}

/** El asiento que haría la factura, con el costo aparte. */
function Asiento({ previa }: { previa: FacturaPrevia }) {
  const debitos = previa.asiento.reduce((s, l) => s + l.debito, 0);
  const creditos = previa.asiento.reduce((s, l) => s + l.credito, 0);
  const cuadra = Math.abs(debitos - creditos) < 0.005;
  return (
    <section className="rounded-3xl border border-border bg-card p-5 text-sm shadow-sm sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Así queda en el libro
        </h2>
        {cuadra && (
          <span className="rounded-full border border-success/40 bg-success/10 px-2.5 py-0.5 text-xs font-medium">
            Cuadra · débitos = créditos
          </span>
        )}
      </div>
      <table className="w-full">
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th className="py-1.5 text-left font-medium">Cuenta</th>
            <th className="py-1.5 text-right font-medium">Débito</th>
            <th className="py-1.5 text-right font-medium">Crédito</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {previa.asiento.map((l, i) => (
            <tr key={i}>
              <td className="py-2 pr-2">
                <span className="font-mono text-muted-foreground">
                  {l.codigo}
                </span>{" "}
                {l.nombre}
              </td>
              <td className="py-2 text-right font-mono tabular-nums">
                {l.debito > 0 ? formatCOP(l.debito) : ""}
              </td>
              <td className="py-2 text-right font-mono tabular-nums">
                {l.credito > 0 ? formatCOP(l.credito) : ""}
              </td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="py-2">Totales</td>
            <td className="py-2 text-right font-mono tabular-nums">
              {formatCOP(debitos)}
            </td>
            <td className="py-2 text-right font-mono tabular-nums">
              {formatCOP(creditos)}
            </td>
          </tr>
        </tbody>
      </table>
      {previa.costo > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Y aparte, el costo: sale del inventario lo que costó{" "}
          {formatCOP(previa.costo)} (costo de venta contra inventario).
        </p>
      )}
    </section>
  );
}
