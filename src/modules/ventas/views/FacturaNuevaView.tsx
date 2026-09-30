"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Plus, Trash2 } from "lucide-react";

import { AsientoPrevio } from "@/components/shared/AsientoPrevio";
import { CabeceraPagina } from "@/components/shared/CabeceraPagina";
import { CampoPesos } from "@/components/shared/CampoNumero";
import { SILENCIOSO } from "@/components/shared/ErrorCarga";
import { Button } from "@/components/ui/button";
import { useQuieto } from "@/hooks/useQuieto";
import { aviso } from "@/lib/avisos";
import { cn, formatCOP, formatCOPExacto as pesos, formatFecha } from "@/lib/utils";
import { cobrosApi } from "@/modules/cobros/services/cobros.service";
import { Seccion } from "@/modules/compras/components/CamposCompra";
import { Campo } from "@/modules/configuracion/components/Campo";
import { retencionesApi } from "@/modules/retenciones/services/retenciones.service";
import { PlazoYPago } from "@/modules/tesoreria/components/PlazoYPago";
import { EditorLineasVenta } from "../components/EditorLineasVenta";
import { SelectorTercero } from "../components/SelectorTercero";
import { useBorradorFactura, type BorradorFactura } from "../hooks/useBorradorFactura";
import { useEmitirFactura } from "../hooks/useEmitirFactura";
import { facturasApi } from "../services/ventas.service";
import type { CrearFacturaInput, FacturaPrevia } from "../types/ventas.types";

const VOLVER = "/dashboard/ventas?seccion=facturas";

/**
 * La factura nueva como página (pantalla 13), como en el diseño: Cliente y
 * documento y Plazo a la izquierda, el Resumen a la derecha, las líneas y el
 * asiento a lo ancho, y abajo emitir.
 *
 * Subtotal, IVA y total se calculan en el navegador (`useTotalesBorrador`,
 * igual que el servidor, en centavos) para verse desde la primera línea y
 * aunque el previo falle. Las retenciones, lo que se va a recibir y el asiento
 * los arma el servidor corriendo la factura de verdad y deshaciéndola
 * (`POST /facturas/previo`), que es el que decide.
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
  const previa = pedido === null ? undefined : previo.data;
  const local = b.totales;

  // Las dos cuentas tienen que dar lo mismo: si no, algo del cálculo del
  // navegador se desalineó del servidor.
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && previa && previa.total !== local.totales.total) {
      console.warn("El total del navegador no coincide con el del servidor", local.totales.total, previa.total);
    }
  }, [previa, local.totales.total]);

  const emitir = useEmitirFactura(facturasApi.crear, async (f) => {
    await queryClient.invalidateQueries({ queryKey: ["facturas"] });
    aviso.exito(`Factura ${f.prefijo ?? ""}${f.consecutivo} emitida`);
    router.push(VOLVER);
  });

  return (
    // Una región con el nombre del documento: se lee igual que el diálogo que
    // reemplaza, y desaparece al emitir.
    <div role="region" aria-label="Nueva factura" className="flex w-full flex-col gap-5">
      <CabeceraPagina
        ruta={[{ etiqueta: "Ingresos" }, { etiqueta: "Ventas", href: VOLVER }, { etiqueta: "Nueva" }]}
        titulo="Nueva factura de venta"
        subtitulo="Productos, servicios y otros ingresos en la misma factura. El plazo decide cuándo aparece en Por cobrar."
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Seccion id="v-cli" titulo="Cliente y documento">
            <div className="grid gap-3.5 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <Campo id="cliente" etiqueta="Cliente">
                <SelectorTercero valor={b.cliente} onElegir={b.setCliente} />
              </Campo>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Número</span>
                <div className="flex h-[52px] flex-col justify-center rounded-[9.6px] bg-muted px-3.5">
                  <span className="font-mono text-sm font-semibold">{numeracion?.siguiente ?? "—"}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {numeracion === null ? "No hay resolución vigente" : "Siguiente de la resolución"}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Fecha</span>
                <div className="flex h-[52px] items-center rounded-xl border border-input px-4 text-sm">
                  {formatFecha(b.fecha)}
                </div>
              </div>
            </div>
          </Seccion>

          <Seccion id="v-plazo" titulo="Plazo">
            <Plazo b={b} total={previa?.neto ?? (local.porLinea.some((c) => c !== null) ? local.totales.total : null)} />
          </Seccion>

          {/* Fase 8: la retención que nos practican va por documento, como el
              certificado del cliente. */}
          <Seccion
            id="v-ret"
            titulo="Te retienen"
            derecha={<p className="text-xs text-muted-foreground">Lo que dice el certificado del cliente</p>}
          >
            <Retenciones b={b} subtotal={local.porLinea.some((c) => c !== null) ? local.totales.subtotal : null} />
          </Seccion>
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-6">
          <Resumen
            local={local}
            previa={previa}
            cargando={pedido !== null && previo.isFetching}
            error={pedido !== null && previo.isError ? mensajeDe(previo.error) : null}
          />
        </aside>
      </div>

      <section aria-labelledby="v-lineas" className="overflow-hidden rounded-[26px] border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-6 pt-5 pb-4">
          <h2 id="v-lineas" className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Líneas de la factura
          </h2>
          <p className="text-xs text-muted-foreground">Producto sale del inventario · servicio y otro ingreso van por concepto</p>
        </div>
        <EditorLineasVenta lineas={b.lineas} onCambiar={b.setLineas} conConceptos />
      </section>

      {previa && (
        <AsientoPrevio
          lineas={previa.asiento}
          nota={
            previa.costo > 0
              ? `Y aparte, el costo: sale del inventario lo que costó ${formatCOP(previa.costo)} (costo de venta contra inventario).`
              : undefined
          }
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <p className="flex-grow text-[13px] text-muted-foreground">
          {b.problema ?? "Al emitirla, numera contra la resolución, asienta y descuenta el inventario."}
        </p>
        <Button variant="outline" className="h-12 rounded-[16.8px] px-6" render={<Link href={VOLVER} />}>
          Cancelar
        </Button>
        <Button
          type="button"
          className="h-12 rounded-[16.8px] px-6 shadow-[0_8px_20px_rgb(0_0_0/0.15)]"
          disabled={datos === null || emitir.isPending}
          onClick={() => datos !== null && emitir.mutate(datos)}
        >
          {emitir.isPending && <Loader2 className="size-4 animate-spin" />}
          Emitir factura
        </Button>
      </div>
    </div>
  );
}

function mensajeDe(e: unknown): string {
  const m = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(m) ? m[0] : (m ?? "No se pudo armar el resumen.");
}

/** Contado o A crédito; a crédito, el plazo (el del cliente) y el vence; y las vencidas del cliente. */
function Plazo({ b, total }: { b: BorradorFactura; total: number | null }) {
  const { data: facturas = [] } = useQuery({
    queryKey: ["cartera", "facturas", b.cliente?.id],
    queryFn: () => cobrosApi.facturasDe(b.cliente!.id),
    enabled: b.cliente !== null,
  });
  const vencidas = facturas.filter((f) => f.diasVencidos > 0);

  return (
    <div className="flex flex-col gap-[18px]">
      <PlazoYPago
        valor={b.formaPago}
        onCambiar={b.setFormaPago}
        plazo={b.plazo}
        onPlazo={b.setPlazo}
        plazoHabitual={b.plazoDelCliente}
        quien="este cliente"
        vence={b.vence}
        medio="Entra a"
        cajaFija
        conRepartido
        total={total}
      />
      {vencidas.length > 0 && (
        <p className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/15 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Este cliente tiene {vencidas.length === 1 ? "1 factura vencida" : `${vencidas.length} facturas vencidas`} por{" "}
            <span className="font-mono font-semibold">{formatCOP(vencidas.reduce((s, f) => s + f.pendiente, 0))}</span> hace{" "}
            {Math.max(...vencidas.map((f) => f.diasVencidos))} días.
          </span>
        </p>
      )}
    </div>
  );
}

/** Lo que el cliente nos retiene: el concepto (de los que nos pueden retener) y la base. */
function Retenciones({ b, subtotal }: { b: BorradorFactura; subtotal: number | null }) {
  const { data: conceptos = [] } = useQuery({
    queryKey: ["retenciones", "conceptos"],
    queryFn: () => retencionesApi.conceptos(),
  });
  const deVenta = conceptos.filter((c) => c.activo && c.cuenta_activo_id !== null);
  const cambiar = (clave: number, cambio: Partial<{ conceptoId: string; base: string }>) =>
    b.setRetenciones(b.retenciones.map((r) => (r.clave === clave ? { ...r, ...cambio } : r)));

  return (
    <div className="flex flex-col gap-3">
      {b.retenciones.length === 0 && (
        <p className="text-sm text-muted-foreground">El cliente no te retiene nada en esta factura.</p>
      )}
      {b.retenciones.map((r, i) => (
        <div key={r.clave} className="grid items-end gap-3 sm:grid-cols-[1fr_180px_auto]">
          <Campo id={`ret-${r.clave}`} etiqueta={i === 0 ? "Concepto" : ""}>
            <select
              id={`ret-${r.clave}`}
              value={r.conceptoId}
              onChange={(e) => cambiar(r.clave, { conceptoId: e.target.value })}
              className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
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
            onClick={() => b.setRetenciones(b.retenciones.filter((x) => x.clave !== r.clave))}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="h-9 w-fit rounded-xl border-dashed px-3 text-sm"
        onClick={() =>
          b.setRetenciones([
            ...b.retenciones,
            { clave: Date.now() + Math.random(), conceptoId: "", base: subtotal === null ? "" : String(subtotal) },
          ])
        }
      >
        <Plus className="size-3.5" />
        Agregar retención
      </Button>
    </div>
  );
}

/** «IVA 19 %» si todas las líneas llevan la misma tarifa. */
function tarifaUnica(tarifas: number[]): string {
  const distintas = [...new Set(tarifas.filter((t) => t > 0))];
  return distintas.length === 1 ? ` ${distintas[0]} %` : "";
}

/** «28 oct». */
function diaMes(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][m - 1]}`;
}

/**
 * Subtotal, IVA y total, calculados en el navegador desde la primera línea;
 * lo que retienen, «Vas a recibir» y el vence, del previo del servidor. Si
 * el previo falla, el error va debajo, sin tapar los totales.
 */
function Resumen({
  local,
  previa,
  cargando,
  error,
}: {
  local: BorradorFactura["totales"];
  previa: FacturaPrevia | undefined;
  cargando: boolean;
  error: string | null;
}) {
  const fila = (etiqueta: string, valor: string, fuerte = false) => (
    <p className={cn("flex justify-between gap-3 text-sm", fuerte && "font-semibold")}>
      <span className={fuerte ? "" : "text-muted-foreground"}>{etiqueta}</span>
      <span className="font-mono whitespace-nowrap tabular-nums">{valor}</span>
    </p>
  );
  const hayLineas = local.porLinea.some((c) => c !== null);
  const tarifas = local.porLinea.flatMap((c) => (c === null ? [] : [c.tarifa]));
  return (
    <section
      aria-labelledby="v-res"
      className="flex flex-col gap-2.5 rounded-[26px] border border-border bg-card p-5 shadow-sm"
    >
      <h2 id="v-res" className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        Resumen
      </h2>
      {!hayLineas ? (
        <p className="text-sm text-muted-foreground">
          Cuando agregues las líneas, acá ves el total y cuánto vas a recibir, antes de emitir.
        </p>
      ) : (
        <>
          {fila("Subtotal", pesos(local.totales.subtotal))}
          {local.responsable === true && fila(`IVA${tarifaUnica(tarifas)}`, pesos(local.totales.iva))}
          {fila("Total factura", pesos(local.totales.total), true)}
          {local.pendientes > 0 && (
            <p className="text-xs text-muted-foreground">
              {local.pendientes === 1
                ? "Falta completar 1 línea: no está en el total."
                : `Faltan completar ${local.pendientes} líneas: no están en el total.`}
            </p>
          )}
          {previa !== undefined && (
            <div className={cn("flex flex-col gap-2.5", cargando && "opacity-60")}>
              {previa.retenciones.map((r, i) => (
                <p key={i} className="flex justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">
                    Te retienen {(r.tarifa * 100).toLocaleString("es-CO", { maximumFractionDigits: 3 })} %
                  </span>
                  <span className="font-mono whitespace-nowrap tabular-nums">− {pesos(r.valor)}</span>
                </p>
              ))}
              <div className="mt-2 border-t border-border pt-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Vas a recibir</p>
                <p className="mt-1 font-mono text-[28px] leading-[34px] font-semibold tracking-[-0.03em]">
                  {pesos(previa.neto)}
                </p>
                {previa.vence !== null && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Aparece en Cobros → Por cobrar hasta el {diaMes(previa.vence)}
                  </p>
                )}
              </div>
              {(previa.pagos ?? []).length > 0 && (
                <div className="flex flex-col gap-1.5 border-t border-border pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Entra por</p>
                  {previa.pagos.map((p, i) => (
                    <p key={i} className="flex justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-muted-foreground">
                        {p.medio === "CAJA" ? "Caja" : "Banco"} · {p.nombre}
                      </span>
                      <span className="font-mono whitespace-nowrap tabular-nums">{pesos(p.valor)}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
      {cargando && previa === undefined && (
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Armando el resumen…
        </p>
      )}
      {error !== null && !cargando && <p className="text-sm text-danger">{error}</p>}
    </section>
  );
}
