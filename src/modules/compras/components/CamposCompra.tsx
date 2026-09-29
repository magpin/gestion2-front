"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { CampoPesos } from "@/components/shared/CampoNumero";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SelectorConcepto } from "@/modules/conceptos/components/SelectorConcepto";
import { Campo } from "@/modules/configuracion/components/Campo";
import { PropuestaRenta } from "@/modules/retenciones/components/PropuestaRenta";
import { fechaConDia, PlazoYPago } from "@/modules/tesoreria/components/PlazoYPago";
import type { BorradorCompra, ClaseDocumento } from "../hooks/useBorradorCompra";
import { comprasApi } from "../services/compras.service";
import { EditorLineasCompra } from "./EditorLineasCompra";
import { SelectorProveedor } from "./SelectorProveedor";

const CLASES: Array<[ClaseDocumento, string, string]> = [
  ["FACTURA_ELECTRONICA", "Factura electrónica del proveedor", "El proveedor factura; vos la registrás"],
  ["DOCUMENTO_SOPORTE", "Documento soporte", "El vendedor no está obligado a facturar; lo emitís vos"],
];

/** Una tarjeta del formulario con su título en versalitas, como en el diseño. */
export function Seccion({
  id,
  titulo,
  derecha,
  children,
  className,
}: {
  id: string;
  titulo: string;
  derecha?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn("flex flex-col gap-[18px] rounded-[26px] border border-border bg-card p-6 shadow-sm", className)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={id} className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {titulo}
        </h2>
        {derecha}
      </div>
      {children}
    </section>
  );
}

/**
 * Documento (pantallas 09 y 10): la clase, quién vende, el número y la fecha.
 * En el soporte el número no se escribe: sale de la resolución, y se muestra
 * en tres celdas —número, resolución, rango—.
 */
export function DocumentoCompra({ b, completa = false }: { b: BorradorCompra; completa?: boolean }) {
  const { data: numeracion, isLoading: leyendo } = useQuery({
    queryKey: ["compras", "soporte", "numeracion"],
    queryFn: comprasApi.numeracionSoporte,
    enabled: b.soporte,
  });
  const prefijo = numeracion?.siguiente?.replace(/\d+$/, "") ?? "";

  return (
    <div className="flex flex-col gap-[18px]">
      {completa && (
        <fieldset>
          <legend className="sr-only">Tipo de documento</legend>
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Clase de documento">
            {CLASES.map(([clase, titulo, detalle]) => (
              <label
                key={clase}
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-2xl border px-4 py-3.5 transition-colors",
                  b.clase === clase ? "border-foreground" : "border-border hover:bg-accent/50",
                )}
              >
                <input
                  type="radio"
                  name="clase-documento"
                  checked={b.clase === clase}
                  onChange={() => b.setClase(clase)}
                  aria-label={titulo}
                  className="mt-0.5 size-4 accent-foreground"
                />
                <span>
                  <span className="block text-sm font-semibold">{titulo}</span>
                  <span className="block text-xs text-muted-foreground">{detalle}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div
        className={cn(
          "grid gap-3.5",
          b.soporte ? "sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]" : "sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]",
        )}
      >
        <Campo id="proveedor" etiqueta={b.soporte ? "Vendedor" : "Proveedor"}>
          <SelectorProveedor valor={b.proveedor} onElegir={b.setProveedor} />
        </Campo>
        {!b.soporte && (
          <Campo id="numeroFactura" etiqueta="Número de factura">
            <Input
              id="numeroFactura"
              value={b.numeroFactura}
              onChange={(e) => b.setNumeroFactura(e.target.value)}
              placeholder="FE-12345"
              className="h-[52px] rounded-xl px-4 font-mono"
            />
          </Campo>
        )}
        <Campo id="fecha" etiqueta={b.soporte ? "Fecha" : "Fecha de la factura"}>
          <Input
            id="fecha"
            type="date"
            value={b.fecha}
            onChange={(e) => b.setFecha(e.target.value)}
            className="h-[52px] rounded-xl px-4"
          />
        </Campo>
      </div>

      {completa && !b.soporte && (
        <Campo
          id="cufe"
          etiqueta="CUFE (opcional)"
          ayuda="Se guarda como dato, para encontrarla después. No se consulta en la DIAN."
        >
          <Input
            id="cufe"
            value={b.cufe}
            onChange={(e) => b.setCufe(e.target.value)}
            maxLength={200}
            placeholder="a41f9c07e2…"
            className="h-11 rounded-xl px-4 font-mono"
          />
        </Campo>
      )}

      {b.soporte &&
        (leyendo ? (
          <p className="text-sm text-muted-foreground">Mirando la numeración…</p>
        ) : numeracion ? (
          <div className="grid gap-3 rounded-2xl bg-muted/60 px-4 py-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Número</p>
              <p className="flex flex-wrap items-center gap-2 font-mono text-sm font-semibold">
                {numeracion.siguiente}
                {/* PC2: sin módulo DIAN, el soporte nace sin transmitir. */}
                <span className="rounded-full border border-warning/40 bg-warning/15 px-2 py-0.5 font-sans text-[11px] font-medium">
                  Sin transmitir
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Resolución DIAN</p>
              <p className="font-mono text-sm font-semibold">{numeracion.resolucion}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rango</p>
              <p className="font-mono text-sm font-semibold">
                {prefijo}
                {numeracion.desde} a {prefijo}
                {numeracion.hasta} · quedan {numeracion.quedan}
              </p>
            </div>
          </div>
        ) : (
          <p className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            No hay una resolución de documento soporte vigente. Cargala en la configuración de la empresa, en Resoluciones,
            antes de registrarlo.
          </p>
        ))}
    </div>
  );
}

/** Plazo y pago de la compra: contado o crédito, el plazo en días y el pronto pago. */
export function PlazoCompra({ b, ahorro }: { b: BorradorCompra; ahorro?: number | null }) {
  return (
    <div className="flex flex-col gap-[18px]">
      <PlazoYPago
        valor={b.formaPago}
        onCambiar={b.setFormaPago}
        plazo={b.plazo}
        onPlazo={b.setPlazo}
        plazoHabitual={b.plazoHabitual}
        quien="este proveedor"
        vence={b.vence}
        medio="Sale de"
        soloCredito={!b.puedePagar}
        motivoSoloCredito="Pagar de contado lo hace alguien con rol Caja o Director. Registrala a crédito y que caja la pague."
      />

      {b.formaPago.modo === "CREDITO" && !b.soporte && (
        <div className="flex flex-col gap-3">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={b.conPronto}
              onChange={(e) => b.setConPronto(e.target.checked)}
              className="mt-0.5 size-4 accent-foreground"
            />
            <span>
              <span className="block text-sm font-semibold">Descuento por pronto pago</span>
              <span className="block text-xs text-muted-foreground">
                {b.conPronto && Number(b.prontoPct) > 0 && b.prontoHasta
                  ? `Condición de la factura: ${b.prontoPct} % pagando hasta el ${fechaConDia(b.prontoHasta).toLowerCase()}`
                  : "Si la factura trae una condición de pronto pago"}
              </span>
            </span>
          </label>
          {b.conPronto && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Campo id="compra-pronto-pct" etiqueta="Descuento">
                <Input
                  id="compra-pronto-pct"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={99.99}
                  step="0.01"
                  value={b.prontoPct}
                  onChange={(e) => b.setProntoPct(e.target.value)}
                  placeholder="2 %"
                  className="h-11 rounded-xl px-4 font-mono"
                />
              </Campo>
              <Campo id="compra-pronto-hasta" etiqueta="Si pagás hasta">
                <Input
                  id="compra-pronto-hasta"
                  type="date"
                  value={b.prontoHasta}
                  onChange={(e) => b.setProntoHasta(e.target.value)}
                  className="h-11 rounded-xl px-4"
                />
              </Campo>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Te ahorrás</span>
                <div className="flex h-11 items-center rounded-xl bg-muted px-4 font-mono text-sm font-semibold">
                  {ahorro != null && ahorro > 0 ? `$ ${Math.round(ahorro).toLocaleString("es-CO")}` : "—"}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Lo del motor de retenciones que va con las líneas: la propuesta, la tarjeta y el municipio. */
function RetencionCompra({ b }: { b: BorradorCompra }) {
  return (
    <>
      <PropuestaRenta
        propuesta={b.simulacion.propuesta}
        cargando={b.simulacion.cargando}
        error={b.simulacion.error}
        respuestas={b.renta}
        onCambiar={b.setRenta}
      />
      {/* Con tarjeta la retención la practica la entidad de la tarjeta,
          no la empresa (caso borde 6). */}
      <label className="flex w-fit items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          className="size-4 accent-foreground"
          checked={b.conTarjeta}
          onChange={(e) => b.setConTarjeta(e.target.checked)}
        />
        La pagué con tarjeta débito o crédito
      </label>
      {b.municipiosIca.length > 1 && (
        <label className="flex w-fit flex-col gap-1.5 text-xs text-muted-foreground">
          Dónde se recibe (decide el municipio de la ReteICA)
          <select
            className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm text-foreground"
            value={b.municipio}
            onChange={(e) => b.setMunicipio(e.target.value)}
          >
            <option value="">
              {b.municipiosIca.find((m) => m.es_principal)?.nombre ?? "La sede principal"} (principal)
            </option>
            {b.municipiosIca
              .filter((m) => !m.es_principal)
              .map((m) => (
                <option key={m.codigo} value={m.codigo}>
                  {m.nombre}
                </option>
              ))}
          </select>
        </label>
      )}
    </>
  );
}

/** Las líneas de la factura: la tabla editable y lo que propone el motor. */
export function LineasCompra({ b, completa = false }: { b: BorradorCompra; completa?: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      <EditorLineasCompra
        lineas={b.lineas}
        onCambiar={b.setLineas}
        sugerirPara={completa ? (b.proveedor?.id ?? null) : undefined}
        sinMarco
      />
      <div className="flex flex-col gap-3 px-6 pb-6">
        <RetencionCompra b={b} />
      </div>
    </div>
  );
}

/**
 * «Qué se compró» del documento soporte (pantalla 10): una línea simple de
 * descripción, concepto y valor, sin IVA —el vendedor no factura— y, al lado,
 * cómo se paga.
 */
export function QueSeCompro({ b }: { b: BorradorCompra }) {
  const l = b.lineas[0];
  const cambiar = (cambio: Partial<typeof l>) =>
    b.setLineas([{ ...l, ...cambio, tipo: "GASTO", cantidad: "1", ivaTarifa: "0" }, ...b.lineas.slice(1)]);
  return (
    <div className="flex flex-col gap-[18px]">
      <Campo id="soporte-descripcion" etiqueta="Descripción">
        <Input
          id="soporte-descripcion"
          aria-label="Detalle de la línea 1"
          value={l?.detalle ?? ""}
          onChange={(e) => cambiar({ detalle: e.target.value })}
          placeholder="Reparación de la puerta enrollable de la bodega"
          maxLength={200}
          className="h-[52px] rounded-xl px-4"
        />
      </Campo>
      <div className="grid gap-3.5 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Concepto</span>
          <SelectorConcepto
            tipos={["GASTO", "COSTO", "NO_GASTO"]}
            valor={l?.concepto ?? null}
            onElegir={(concepto) => cambiar({ concepto })}
            filtro={(c) => c.cuenta !== null}
          />
          {l?.concepto?.cuenta && (
            <p className="text-xs text-muted-foreground">
              Va a <span className="font-mono">{l.concepto.cuenta.codigo}</span>
              {l.concepto.operacional === true ? " · gasto operacional" : l.concepto.operacional === false ? " · no operacional" : ""}{" "}
              · sin IVA
            </p>
          )}
        </div>
        <Campo id="soporte-valor" etiqueta="Valor">
          <CampoPesos
            id="soporte-valor"
            aria-label="Costo unitario de la línea 1"
            value={l?.costoUnitario ?? ""}
            onChange={(costoUnitario) => cambiar({ costoUnitario })}
            placeholder="$ 0"
            className="h-[52px] rounded-xl px-4 text-right font-mono"
          />
        </Campo>
      </div>
      <PlazoCompra b={b} />
      <RetencionCompra b={b} />
    </div>
  );
}

/**
 * Los campos de una compra en el diálogo (lectura de facturas, Registrar
 * gasto): las mismas secciones de la página, una debajo de otra.
 */
export function CamposCompra({ b, completa = false }: { b: BorradorCompra; completa?: boolean }) {
  return (
    <div className="flex flex-col gap-8">
      <DocumentoCompra b={b} completa={completa} />
      <EditorLineasCompra
        lineas={b.lineas}
        onCambiar={b.setLineas}
        sugerirPara={completa ? (b.proveedor?.id ?? null) : undefined}
      />
      <RetencionCompra b={b} />
      <PlazoCompra b={b} />
    </div>
  );
}
