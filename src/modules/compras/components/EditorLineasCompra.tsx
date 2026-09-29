"use client";

import { Plus, Trash2 } from "lucide-react";

import { CampoCantidad, CampoPesos } from "@/components/shared/CampoNumero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useResponsableIva } from "@/core/hooks/useResponsableIva";
import { SelectorConcepto } from "@/modules/conceptos/components/SelectorConcepto";
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
}: {
  lineas: LineaCompraBorrador[];
  onCambiar: (lineas: LineaCompraBorrador[]) => void;
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

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[640px] text-left">
          <thead className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3">
                Qué se compró
              </th>
              <th scope="col" className="px-4 py-3">
                Cantidad
              </th>
              <th scope="col" className="px-4 py-3">
                Costo unitario
              </th>
              {conIva && (
                <th scope="col" className="px-4 py-3 text-center">
                  Sin IVA
                </th>
              )}
              <th scope="col" className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lineas.map((l, i) => (
              <tr key={l.clave} className="align-top">
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-2">
                    {/* Mismo alternador que los medios de pago: dos opciones,
                        una elegida. Por línea y no por factura, porque una
                        factura de proveedor mezcla las dos cosas todo el
                        tiempo: la mercancía y el flete. */}
                    <div className="inline-flex w-fit gap-1 rounded-xl border border-border bg-muted p-1">
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
                            "rounded-lg px-3 py-1 text-xs font-semibold transition-colors",
                            l.tipo === t
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent",
                          )}
                        >
                          {t === "PRODUCTO" ? "Producto" : "Gasto"}
                        </button>
                      ))}
                    </div>

                    {l.tipo === "PRODUCTO" ? (
                      <SelectorProducto
                        valor={l.producto}
                        onElegir={(producto) => actualizar(l.clave, { producto })}
                      />
                    ) : (
                      <>
                        <SelectorConcepto
                          tipos={["GASTO", "COSTO", "NO_GASTO"]}
                          valor={l.concepto}
                          onElegir={(concepto) => actualizar(l.clave, { concepto })}
                          // Solo los que tienen cuenta: sin ella no hay contra qué debitar.
                          filtro={(c) => c.cuenta !== null}
                        />
                        {l.concepto?.cuenta && (
                          <p className="-mt-1 text-xs text-muted-foreground">
                            Va a {l.concepto.cuenta.codigo} · {l.concepto.cuenta.nombre}
                          </p>
                        )}
                        <Input
                          value={l.detalle}
                          onChange={(e) =>
                            actualizar(l.clave, { detalle: e.target.value })
                          }
                          placeholder="Qué fue: arriendo de septiembre, internet…"
                          maxLength={200}
                          className="h-11 rounded-xl px-4"
                          aria-label={`Detalle de la línea ${i + 1}`}
                        />
                      </>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <CampoCantidad
                    unidad={l.producto?.unidad_medida}
                    value={l.cantidad}
                    onChange={(cantidad) => actualizar(l.clave, { cantidad })}
                    placeholder="0"
                    className="h-11 w-28 rounded-xl px-4 text-right font-mono"
                    aria-label={`Cantidad de la línea ${i + 1}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <CampoPesos
                    value={l.costoUnitario}
                    onChange={(costoUnitario) =>
                      actualizar(l.clave, { costoUnitario })
                    }
                    placeholder="0"
                    className="h-11 w-32 rounded-xl px-4 text-right font-mono"
                    aria-label={`Costo unitario de la línea ${i + 1}`}
                  />
                </td>
                {/* La tarifa sale del proveedor y del producto; esto es para
                    cuando la factura dice otra cosa —un régimen simple, una
                    exportación, un excluido—. Solo baja a cero: poner IVA
                    donde el proveedor no lo cobró sería inventarlo. */}
                {conIva && (
                  <td className="px-4 py-3 text-center">
                    {/* En una línea de gasto no hay producto que diga la
                        tarifa, así que se elige. En una de producto no: la
                        dice el producto, y acá solo se baja a cero. */}
                    {l.tipo === "GASTO" ? (
                      <select
                        value={l.ivaTarifa}
                        onChange={(e) =>
                          actualizar(l.clave, { ivaTarifa: e.target.value })
                        }
                        className="h-11 rounded-xl border border-input bg-card px-3 text-sm"
                        aria-label={`IVA de la línea ${i + 1}`}
                      >
                        <option value="19">19 %</option>
                        <option value="5">5 %</option>
                        <option value="0">Sin IVA</option>
                      </select>
                    ) : (
                      <input
                        type="checkbox"
                        checked={l.sinIva}
                        onChange={(e) =>
                          actualizar(l.clave, { sinIva: e.target.checked })
                        }
                        className="size-4 rounded border-border"
                        aria-label={`La línea ${i + 1} vino sin IVA`}
                      />
                    )}
                  </td>
                )}
                <td className="px-4 py-3">
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
            ))}
          </tbody>
        </table>
      </div>

      {/* Dos botones y no uno con un menú: son las dos cosas que trae una
          factura, y elegir cuál se agrega ahorra el paso de cambiarle el tipo
          a una línea recién creada. */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="ghost"
          className="h-11 self-start rounded-xl px-4 text-brand-text"
          onClick={() => agregar("PRODUCTO")}
        >
          <Plus className="size-4" />
          Agregar producto
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-11 self-start rounded-xl px-4 text-brand-text"
          onClick={() => agregar("GASTO")}
        >
          <Plus className="size-4" />
          Agregar gasto
        </Button>
      </div>
    </div>
  );
}
