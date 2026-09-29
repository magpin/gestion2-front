"use client";

import { useQuery } from "@tanstack/react-query";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Campo } from "@/modules/configuracion/components/Campo";
import { PropuestaRenta } from "@/modules/retenciones/components/PropuestaRenta";
import { SelectorFormaPago } from "@/modules/tesoreria/components/SelectorFormaPago";
import type { BorradorCompra, ClaseDocumento } from "../hooks/useBorradorCompra";
import { comprasApi } from "../services/compras.service";
import { EditorLineasCompra } from "./EditorLineasCompra";
import { SelectorProveedor } from "./SelectorProveedor";

const CLASES: Array<[ClaseDocumento, string, string]> = [
  ["FACTURA_ELECTRONICA", "Factura electrónica del proveedor", "Él la emite; vos la registrás con su número."],
  ["DOCUMENTO_SOPORTE", "Documento soporte", "Le comprás a quien no factura: lo numerás vos."],
];

/**
 * Los campos de una compra. Los comparten el diálogo y la página de compra
 * nueva; la página suma lo que el diálogo no tiene lugar para mostrar: la
 * clase de documento, el CUFE y lo que María sugiere en cada gasto.
 */
export function CamposCompra({ b, completa = false }: { b: BorradorCompra; completa?: boolean }) {
  const { data: numeracion, isLoading: leyendoNumeracion } = useQuery({
    queryKey: ["compras", "soporte", "numeracion"],
    queryFn: comprasApi.numeracionSoporte,
    enabled: b.soporte,
  });

  return (
    <div className="flex flex-col gap-8">
      {completa && (
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Clase de documento">
          {CLASES.map(([clase, titulo, detalle]) => (
            <button
              key={clase}
              type="button"
              role="radio"
              aria-checked={b.clase === clase}
              onClick={() => b.setClase(clase)}
              className={cn(
                "rounded-2xl border px-4 py-3 text-left transition-colors",
                b.clase === clase ? "border-foreground bg-accent" : "border-border hover:bg-accent/50",
              )}
            >
              <span className="block text-sm font-semibold">{titulo}</span>
              <span className="block text-xs text-muted-foreground">{detalle}</span>
            </button>
          ))}
        </div>
      )}

      {b.soporte && (
        <div className="-mt-4 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm">
          {leyendoNumeracion ? (
            <span className="text-muted-foreground">Mirando la numeración…</span>
          ) : numeracion ? (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
              <span>
                Va a quedar como <span className="font-mono font-semibold">{numeracion.siguiente}</span>
              </span>
              <span className="text-muted-foreground">
                Resolución {numeracion.resolucion} · del {numeracion.desde} al {numeracion.hasta} · quedan{" "}
                {numeracion.quedan}
              </span>
              <span className="rounded-full border border-warning/40 bg-warning/15 px-2 py-0.5 text-[11px] font-medium">
                Sin transmitir
              </span>
            </div>
          ) : (
            <span className="text-danger">
              No hay una resolución de documento soporte vigente. Cargala en la configuración de la empresa, en Resoluciones, antes de
              registrarlo.
            </span>
          )}
        </div>
      )}

      <div className={cn("grid gap-4", b.soporte ? "sm:grid-cols-[1fr_180px]" : "sm:grid-cols-[1fr_180px_160px]")}>
        <Campo id="proveedor" etiqueta="Proveedor" escala="grande">
          <SelectorProveedor valor={b.proveedor} onElegir={b.setProveedor} />
        </Campo>

        <Campo id="fecha" etiqueta="Fecha" escala="grande">
          <Input
            id="fecha"
            type="date"
            value={b.fecha}
            onChange={(e) => b.setFecha(e.target.value)}
            className="h-11 rounded-xl px-4"
          />
        </Campo>

        {!b.soporte && (
          <Campo id="numeroFactura" etiqueta="N.° factura proveedor" escala="grande">
            <Input
              id="numeroFactura"
              value={b.numeroFactura}
              onChange={(e) => b.setNumeroFactura(e.target.value)}
              placeholder="FE-12345"
              className="h-11 rounded-xl px-4"
            />
          </Campo>
        )}
      </div>

      {completa && !b.soporte && (
        <Campo
          id="cufe"
          etiqueta="CUFE (opcional)"
          ayuda="Se guarda como dato, para encontrarla después. No se consulta en la DIAN."
          escala="grande"
        >
          <Input
            id="cufe"
            value={b.cufe}
            onChange={(e) => b.setCufe(e.target.value)}
            maxLength={120}
            placeholder="a41f9c07e2…"
            className="h-11 rounded-xl px-4 font-mono"
          />
        </Campo>
      )}

      <EditorLineasCompra
        lineas={b.lineas}
        onCambiar={b.setLineas}
        sugerirPara={completa ? (b.proveedor?.id ?? null) : undefined}
      />

      <PropuestaRenta
        propuesta={b.simulacion.propuesta}
        cargando={b.simulacion.cargando}
        error={b.simulacion.error}
        respuestas={b.renta}
        onCambiar={b.setRenta}
      />
      {/* Con tarjeta la retención la practica la entidad de la tarjeta,
          no la empresa (caso borde 6). */}
      <label className="-mt-4 flex w-fit items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          className="size-4 accent-foreground"
          checked={b.conTarjeta}
          onChange={(e) => b.setConTarjeta(e.target.checked)}
        />
        La pagué con tarjeta débito o crédito
      </label>

      {b.municipiosIca.length > 1 && (
        <label className="-mt-2 flex w-fit flex-col gap-1.5 text-xs text-muted-foreground">
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

      <SelectorFormaPago
        valor={b.formaPago}
        onCambiar={b.setFormaPago}
        soloCredito={!b.puedePagar}
        motivoSoloCredito="Pagar de contado lo hace alguien con rol Caja o Director. Registrala a crédito y que caja la pague."
        conVence
      />
      {b.formaPago.modo === "CREDITO" && b.proveedor?.diasPlazoProveedor != null && (
        <p className="-mt-6 text-xs text-muted-foreground">
          {b.proveedor.nombre} te da {b.proveedor.diasPlazoProveedor} días: el vence sale de ahí, y lo podés cambiar.
        </p>
      )}

      {b.formaPago.modo === "CREDITO" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="compra-pronto-pct" etiqueta="Descuento por pronto pago (%, opcional)">
            <Input
              id="compra-pronto-pct"
              type="number"
              inputMode="decimal"
              min={0}
              max={99.99}
              step="0.01"
              value={b.prontoPct}
              onChange={(e) => b.setProntoPct(e.target.value)}
              placeholder="2"
              className="h-11 rounded-xl px-4"
            />
          </Campo>
          <Campo id="compra-pronto-hasta" etiqueta="Pagando hasta">
            <Input
              id="compra-pronto-hasta"
              type="date"
              value={b.prontoHasta}
              onChange={(e) => b.setProntoHasta(e.target.value)}
              className="h-11 rounded-xl px-4"
            />
          </Campo>
        </div>
      )}
    </div>
  );
}
