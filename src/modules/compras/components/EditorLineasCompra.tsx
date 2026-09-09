"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectorProducto } from "@/modules/inventario/components/SelectorProducto";
import type { ProductoResumen } from "@/modules/inventario/types/inventario.types";

/** Una línea mientras se edita. Cantidad y costo son texto: vacío es "sin llenar", no cero. */
export interface LineaCompraBorrador {
  /** Clave de React. No viaja al servidor: el `orden` lo pone el backend. */
  clave: number;
  producto: ProductoResumen | null;
  cantidad: string;
  costoUnitario: string;
}

export function lineaCompraVacia(): LineaCompraBorrador {
  return {
    clave: Date.now() + Math.random(),
    producto: null,
    cantidad: "",
    costoUnitario: "",
  };
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
  const actualizar = (clave: number, cambio: Partial<LineaCompraBorrador>) =>
    onCambiar(
      lineas.map((l) => (l.clave === clave ? { ...l, ...cambio } : l)),
    );

  const agregar = () => onCambiar([...lineas, lineaCompraVacia()]);
  const quitar = (clave: number) =>
    onCambiar(lineas.filter((l) => l.clave !== clave));

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[640px] text-left">
          <thead className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3">
                Producto
              </th>
              <th scope="col" className="px-4 py-3">
                Cantidad
              </th>
              <th scope="col" className="px-4 py-3">
                Costo unitario
              </th>
              <th scope="col" className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lineas.map((l, i) => (
              <tr key={l.clave} className="align-top">
                <td className="px-4 py-3">
                  <SelectorProducto
                    valor={l.producto}
                    onElegir={(producto) => actualizar(l.clave, { producto })}
                  />
                </td>
                <td className="px-4 py-3">
                  <Input
                    type="number"
                    min="0.000001"
                    step="any"
                    value={l.cantidad}
                    onChange={(e) =>
                      actualizar(l.clave, { cantidad: e.target.value })
                    }
                    placeholder="0"
                    className="h-11 w-28 rounded-xl px-4 text-right font-mono"
                    aria-label={`Cantidad de la línea ${i + 1}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={l.costoUnitario}
                    onChange={(e) =>
                      actualizar(l.clave, { costoUnitario: e.target.value })
                    }
                    placeholder="0"
                    className="h-11 w-32 rounded-xl px-4 text-right font-mono"
                    aria-label={`Costo unitario de la línea ${i + 1}`}
                  />
                </td>
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

      <Button
        type="button"
        variant="ghost"
        className="h-11 self-start rounded-xl px-4 text-brand-text"
        onClick={agregar}
      >
        <Plus className="size-4" />
        Agregar línea
      </Button>
    </div>
  );
}
