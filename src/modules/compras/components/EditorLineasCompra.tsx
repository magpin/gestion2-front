"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Sparkles, Trash2 } from "lucide-react";

import { CampoCantidad, CampoPesos } from "@/components/shared/CampoNumero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useResponsableIva } from "@/core/hooks/useResponsableIva";
import { useQuieto } from "@/hooks/useQuieto";
import { SelectorConcepto } from "@/modules/conceptos/components/SelectorConcepto";
import { conceptosApi } from "@/modules/conceptos/services/conceptos.service";
import { gastosApi } from "@/modules/gastos/services/gastos.service";
import { PALABRAS_CERTEZA } from "@/modules/gastos/types/gastos.types";
import type { Concepto } from "@/modules/conceptos/types/conceptos.types";
import { SelectorProducto } from "@/modules/inventario/components/SelectorProducto";
import type { ProductoResumen } from "@/modules/inventario/types/inventario.types";

/** Una línea mientras se edita. Cantidad y costo son texto: vacío es "sin llenar", no cero. */
export interface LineaCompraBorrador {
  /** Clave de React. No viaja al servidor: el `orden` lo pone el backend. */
  clave: number;
  /**
   * Qué se compró: algo del catálogo, o un gasto.
   *
   * Un arriendo, el internet o unos honorarios no son productos de nadie y no
   * entran a ninguna bodega: van contra una cuenta y se acabó.
   */
  tipo: "PRODUCTO" | "GASTO";
  producto: ProductoResumen | null;
  /**
   * Solo en las de gasto: qué es («Arriendo», «Transporte, fletes y
   * acarreos»). La cuenta la pone el concepto: nadie elige un código.
   */
  concepto: Concepto | null;
  /** Solo en las de gasto: qué fue. Sin esto la línea es un código y un número. */
  detalle: string;
  /** Solo en las de gasto: la tarifa la dice la factura, no un catálogo. */
  ivaTarifa: string;
  cantidad: string;
  costoUnitario: string;
  /**
   * "Esta línea vino sin IVA aunque debería llevarlo". La tarifa normal sale
   * del proveedor y del producto; esto es para cuando la factura dice otra
   * cosa —un régimen simple, una exportación, un excluido—.
   */
  sinIva: boolean;
}

export function lineaCompraVacia(
  tipo: LineaCompraBorrador["tipo"] = "PRODUCTO",
): LineaCompraBorrador {
  return {
    clave: Date.now() + Math.random(),
    tipo,
    producto: null,
    concepto: null,
    detalle: "",
    // La corriente. Quien registra la cambia si la factura dice otra cosa.
    ivaTarifa: "19",
    cantidad: tipo === "GASTO" ? "1" : "",
    costoUnitario: "",
    sinIva: false,
  };
}

/** Si la línea ya tiene lo mínimo para poder registrarse. */
export function lineaCompleta(l: LineaCompraBorrador): boolean {
  return l.tipo === "PRODUCTO"
    ? l.producto !== null
    : l.concepto !== null && l.detalle.trim().length >= 2;
}

/**
 * Las líneas de una compra: producto, cantidad y costo. A diferencia de
 * `EditorLineasVenta` de `ventas`, acá SÍ hay una columna de costo: es lo
 * que dice la factura del proveedor esta vez, no un precio de catálogo —
 * ver `docs/planes/compras-backend.md`, decisión 3.
 */
export function EditorLineasCompra({
  lineas,
  onCambiar,
  sugerirPara,
  sinMarco = false,
}: {
  lineas: LineaCompraBorrador[];
  onCambiar: (lineas: LineaCompraBorrador[]) => void;
  /**
   * Si María sugiere el concepto de cada gasto: el id del proveedor (o `null`
   * si todavía no hay). Sin esto, no sugiere.
   */
  sugerirPara?: string | null;
  /** Dentro de una tarjeta de la página: sin borde propio (pantalla 09). */
  sinMarco?: boolean;
}) {
  const conIva = useResponsableIva();

  const actualizar = (clave: number, cambio: Partial<LineaCompraBorrador>) =>
    onCambiar(
      lineas.map((l) => (l.clave === clave ? { ...l, ...cambio } : l)),
    );

  const agregar = (tipo: LineaCompraBorrador["tipo"]) =>
    onCambiar([...lineas, lineaCompraVacia(tipo)]);
  const quitar = (clave: number) =>
    onCambiar(lineas.filter((l) => l.clave !== clave));

  // El subtotal de la línea, como lo verá el libro: cantidad por valor.
  const subtotalDe = (l: LineaCompraBorrador) => {
    const c = Number(l.cantidad);
    const v = Number(l.costoUnitario);
    return c > 0 && v >= 0 && l.costoUnitario.trim() !== "" ? Math.round(c * v * 100) / 100 : null;
  };
  const th = "px-3 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground";

  return (
    <div className="flex flex-col">
      <div className={cn("overflow-x-auto", !sinMarco && "rounded-2xl border border-border")}>
        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
          <thead className="border-y border-border">
            <tr>
              <th scope="col" className={cn(th, "min-w-72 pl-6")}>Qué</th>
              <th scope="col" className={th}>Tipo y a dónde va</th>
              <th scope="col" className={cn(th, "text-right")}>Cant.</th>
              <th scope="col" className={cn(th, "text-right")}>Valor unit.</th>
              {conIva && <th scope="col" className={cn(th, "text-right")}>IVA</th>}
              <th scope="col" className={cn(th, "text-right")}>Subtotal</th>
              <th scope="col" className="w-12 pr-6" />
            </tr>
          </thead>
          <tbody>
            {lineas.map((l, i) => {
              const subtotal = subtotalDe(l);
              return (
                <tr key={l.clave} className="border-b border-border align-top">
                  {/* Qué: el producto del catálogo, o qué fue el gasto. */}
                  <td className="py-3.5 pr-3 pl-6">
                    {l.tipo === "PRODUCTO" ? (
                      <SelectorProducto
                        valor={l.producto}
                        onElegir={(producto) => actualizar(l.clave, { producto })}
                      />
                    ) : (
                      <div className="flex flex-col gap-2">
                        <Input
                          value={l.detalle}
                          onChange={(e) => actualizar(l.clave, { detalle: e.target.value })}
                          placeholder="Qué fue: mantenimiento, flete, internet…"
                          maxLength={200}
                          className="h-11 rounded-xl px-4"
                          aria-label={`Detalle de la línea ${i + 1}`}
                        />
                        {sugerirPara !== undefined && (
                          <SugerenciaConcepto
                            detalle={l.detalle}
                            terceroId={sugerirPara}
                            actual={l.concepto}
                            onUsar={(concepto) => actualizar(l.clave, { concepto })}
                          />
                        )}
                      </div>
                    )}
                  </td>
                  {/* Tipo y a dónde va: Mercancía al inventario, o el concepto del gasto. */}
                  <td className="px-3 py-3.5">
                    <div className="flex flex-col gap-1.5">
                      <div className="inline-flex w-fit gap-1 rounded-lg border border-border bg-muted p-0.5">
                        {(["PRODUCTO", "GASTO"] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            aria-pressed={l.tipo === t}
                            onClick={() =>
                              actualizar(l.clave, {
                                tipo: t,
                                // Cambiar de tipo limpia lo del otro: dejar un
                                // producto elegido en una línea de gasto es
                                // guardar algo que ya no se va a usar.
                                producto: null,
                                concepto: null,
                                detalle: "",
                              })
                            }
                            className={cn(
                              "rounded-md px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                              l.tipo === t
                                ? t === "PRODUCTO"
                                  ? "border border-info/30 bg-info/15 text-foreground"
                                  : "border border-warning/30 bg-warning/15 text-foreground"
                                : "text-muted-foreground hover:bg-accent",
                            )}
                          >
                            {t === "PRODUCTO" ? "Mercancía" : "Gasto"}
                          </button>
                        ))}
                      </div>
                      {l.tipo === "PRODUCTO" ? (
                        <p className="text-xs text-muted-foreground">Inventario · entra al kardex</p>
                      ) : (
                        <>
                          <SelectorConcepto
                            tipos={["GASTO", "COSTO", "NO_GASTO"]}
                            valor={l.concepto}
                            // PC23: el concepto propone el IVA; la persona lo cambia si la factura dice otra cosa.
                            onElegir={(concepto) =>
                              actualizar(l.clave, {
                                concepto,
                                ...(concepto.ivaCompra === "SIN_IVA" && { ivaTarifa: "0" }),
                              })
                            }
                            // Solo los que tienen cuenta: sin ella no hay contra qué debitar.
                            filtro={(c) => c.cuenta !== null}
                          />
                          {l.concepto?.cuenta && (
                            <p className="text-xs text-muted-foreground">
                              {l.concepto.cuenta.nombre} · <span className="font-mono">{l.concepto.cuenta.codigo}</span>
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-right">
                    <CampoCantidad
                      unidad={l.producto?.unidad_medida}
                      value={l.cantidad}
                      onChange={(cantidad) => actualizar(l.clave, { cantidad })}
                      placeholder="0"
                      className="ml-auto h-11 w-20 rounded-xl px-3 text-right font-mono"
                      aria-label={`Cantidad de la línea ${i + 1}`}
                    />
                  </td>
                  <td className="px-3 py-3.5 text-right">
                    <CampoPesos
                      value={l.costoUnitario}
                      onChange={(costoUnitario) => actualizar(l.clave, { costoUnitario })}
                      placeholder="0"
                      className="ml-auto h-11 w-32 rounded-xl px-3 text-right font-mono"
                      aria-label={`Costo unitario de la línea ${i + 1}`}
                    />
                  </td>
                  {/* La tarifa sale del proveedor y del producto; esto es para
                      cuando la factura dice otra cosa —un régimen simple, una
                      exportación, un excluido—. En la de producto solo se baja
                      a cero: poner IVA donde el proveedor no lo cobró sería
                      inventarlo. En la de gasto se elige. */}
                  {conIva && (
                    <td className="px-3 py-3.5 text-right">
                      {l.tipo === "GASTO" ? (
                        <select
                          value={l.ivaTarifa}
                          onChange={(e) => actualizar(l.clave, { ivaTarifa: e.target.value })}
                          className="h-11 rounded-xl border border-input bg-card px-2 font-mono text-sm"
                          aria-label={`IVA de la línea ${i + 1}`}
                        >
                          <option value="19">19 %</option>
                          <option value="5">5 %</option>
                          <option value="0">0 %</option>
                        </select>
                      ) : (
                        <div className="flex flex-col items-end gap-1 pt-2.5">
                          <span className="font-mono">
                            {l.producto === null ? "—" : l.sinIva ? "0 %" : `${Number(l.producto.iva_tarifa)} %`}
                          </span>
                          <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={l.sinIva}
                              onChange={(e) => actualizar(l.clave, { sinIva: e.target.checked })}
                              className="size-3.5 rounded border-border"
                              aria-label={`La línea ${i + 1} vino sin IVA`}
                            />
                            vino sin IVA
                          </label>
                        </div>
                      )}
                    </td>
                  )}
                  <td className="px-3 py-3.5 pt-6 text-right font-mono font-semibold whitespace-nowrap">
                    {subtotal === null ? "—" : `$ ${subtotal.toLocaleString("es-CO")}`}
                  </td>
                  <td className="py-3.5 pr-6">
                    {/* Con una sola línea no se ofrece quitar: es el mínimo del documento. */}
                    {lineas.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Quitar la línea ${i + 1}`}
                        className="text-muted-foreground hover:text-danger"
                        onClick={() => quitar(l.clave)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
            <tr>
              {/* Dos botones y no uno con un menú: son las dos cosas que trae una
                  factura, y elegir cuál se agrega ahorra el paso de cambiarle el
                  tipo a una línea recién creada. */}
              <td colSpan={7} className="px-6 py-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-xl border-dashed px-3 text-sm"
                    onClick={() => agregar("PRODUCTO")}
                  >
                    <Plus className="size-3.5" />
                    Agregar mercancía
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-xl border-dashed px-3 text-sm"
                    onClick={() => agregar("GASTO")}
                  >
                    <Plus className="size-3.5" />
                    Agregar gasto con concepto
                  </Button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * «María sugiere: X · Usar» debajo de un gasto. Lee el detalle y el historial
 * del proveedor; nunca cambia el concepto sola (PC22).
 */
function SugerenciaConcepto({
  detalle,
  terceroId,
  actual,
  onUsar,
}: {
  detalle: string;
  terceroId: string | null;
  actual: Concepto | null;
  onUsar: (c: Concepto) => void;
}) {
  const quieto = useQuieto(detalle.trim());
  const { data: sugerencia } = useQuery({
    queryKey: ["gastos", "sugerir", quieto, terceroId],
    queryFn: () => gastosApi.sugerir(quieto, terceroId ?? undefined),
    enabled: quieto.length >= 3,
  });
  const { data: conceptos = [] } = useQuery({
    queryKey: ["conceptos", false],
    queryFn: () => conceptosApi.listar(),
    staleTime: 60_000,
    enabled: sugerencia?.conceptoId != null,
  });
  const sugerido = conceptos.find((c) => c.id === sugerencia?.conceptoId && c.cuenta !== null);
  if (!sugerencia || !sugerido || sugerido.id === actual?.id) return null;
  return (
    <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <Sparkles className="size-3.5 text-brand" />
      <span>
        María sugiere: <span className="font-semibold text-foreground">{sugerido.nombre}</span> ·{" "}
        {PALABRAS_CERTEZA[sugerencia.certeza]}
      </span>
      <button
        type="button"
        onClick={() => onUsar(sugerido)}
        className="rounded-md border border-border px-2 py-0.5 font-semibold text-foreground hover:bg-accent"
      >
        Usar
      </button>
    </p>
  );
}
