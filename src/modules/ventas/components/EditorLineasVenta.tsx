"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCOP } from "@/lib/utils";
import { SelectorProducto } from "@/modules/inventario/components/SelectorProducto";
import {
  kardexApi,
  precioApi,
} from "@/modules/inventario/services/inventario.service";
import type { ProductoResumen } from "@/modules/inventario/types/inventario.types";

/** Una línea mientras se edita. La cantidad es texto: vacío es "sin llenar", no cero. */
export interface LineaVentaBorrador {
  /** Clave de React. No viaja al servidor: el `orden` lo pone el backend. */
  clave: number;
  producto: ProductoResumen | null;
  cantidad: string;
  /** Solo se llena —y solo se manda— si el producto no tiene precio de lista. */
  precioUnitario: string;
}

export function lineaVentaVacia(): LineaVentaBorrador {
  return {
    clave: Date.now() + Math.random(),
    producto: null,
    cantidad: "",
    precioUnitario: "",
  };
}

/** El precio de lista vigente de un producto, o `null` si no tiene ninguno. */
export function usePrecioVigente(producto: ProductoResumen | null) {
  const { data: precios, isFetching } = useQuery({
    queryKey: ["productos", "precios", producto?.id],
    queryFn: () => precioApi.historialDe(producto!.id),
    enabled: producto !== null,
    staleTime: 60_000,
  });
  const vigente = precios?.find((p) => p.fecha_fin === null) ?? null;
  const precio = vigente === null ? null : Number(vigente.precio_venta);
  return {
    precio: precio !== null && precio > 0 ? precio : null,
    cargando: isFetching,
  };
}

/**
 * Las líneas de una cotización o factura: producto y cantidad.
 *
 * El precio es el de lista vigente del producto y el IVA lo decide el backend
 * según si la empresa es responsable: no se negocian acá (ver "Descuentos por
 * línea o por documento" en `docs/planes/ventas-backend.md`). La única
 * excepción es `precioEditable` —la cotización— y solo para el producto que
 * todavía no tiene precio de lista: de los 1.638 importados, muchos llegaron
 * sin ese dato, y una cotización no puede quedar trabada por eso. El total
 * exacto se ve recién en la respuesta, no mientras se digita.
 */
export function EditorLineasVenta({
  lineas,
  onCambiar,
  precioEditable = false,
}: {
  lineas: LineaVentaBorrador[];
  onCambiar: (lineas: LineaVentaBorrador[]) => void;
  /** Solo la cotización: deja digitar el precio del producto que no tiene. */
  precioEditable?: boolean;
}) {
  const actualizar = (clave: number, cambio: Partial<LineaVentaBorrador>) =>
    onCambiar(lineas.map((l) => (l.clave === clave ? { ...l, ...cambio } : l)));

  const agregar = () => onCambiar([...lineas, lineaVentaVacia()]);
  const quitar = (clave: number) =>
    onCambiar(lineas.filter((l) => l.clave !== clave));

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[560px] text-left">
          <thead className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3">
                Producto
              </th>
              <th scope="col" className="px-4 py-3">
                Cantidad
              </th>
              {precioEditable && (
                <th scope="col" className="px-4 py-3">
                  Precio
                </th>
              )}
              <th scope="col" className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lineas.map((l, i) => (
              <tr key={l.clave} className="align-top">
                <td className="px-4 py-3">
                  <SelectorProducto
                    valor={l.producto}
                    onElegir={(producto) =>
                      actualizar(l.clave, { producto, precioUnitario: "" })
                    }
                  />
                  {l.producto && <Existencia producto={l.producto} />}
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
                    className="h-11 w-32 rounded-xl px-4 text-right font-mono"
                    aria-label={`Cantidad de la línea ${i + 1}`}
                  />
                </td>
                {precioEditable && (
                  <td className="px-4 py-3">
                    <PrecioDeLinea
                      producto={l.producto}
                      valor={l.precioUnitario}
                      onCambiar={(precioUnitario) =>
                        actualizar(l.clave, { precioUnitario })
                      }
                      etiqueta={`Precio de la línea ${i + 1}`}
                    />
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

/**
 * La existencia del producto, como dato y no como traba: una cotización se
 * hace igual sin nada en bodega —el cliente pregunta hoy y la mercancía se
 * compra después—. Es al facturar cuando el kardex decide.
 */
function Existencia({ producto }: { producto: ProductoResumen }) {
  const { data: movimientos } = useQuery({
    queryKey: ["productos", "movimientos", producto.id, 1],
    queryFn: () => kardexApi.listar(producto.id, 1),
    staleTime: 30_000,
  });
  const ultimo = movimientos?.datos[0] ?? null;
  const saldo = Number(ultimo?.saldo_cantidad ?? 0);

  return (
    <p className="mt-1.5 text-xs text-muted-foreground">
      {saldo > 0 ? (
        <>
          Existencia: <b className="font-mono font-semibold">{saldo}</b>
        </>
      ) : (
        "Sin existencia — se puede cotizar"
      )}
    </p>
  );
}

/**
 * El precio de la línea. Si el producto tiene precio de lista, se muestra y no
 * se toca: cambiarlo acá sería prometer una negociación por documento que no
 * existe. Si no tiene, se digita, y es lo único que deja seguir.
 */
function PrecioDeLinea({
  producto,
  valor,
  onCambiar,
  etiqueta,
}: {
  producto: ProductoResumen | null;
  valor: string;
  onCambiar: (valor: string) => void;
  etiqueta: string;
}) {
  const { precio, cargando } = usePrecioVigente(producto);

  if (producto === null) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  if (cargando && precio === null) {
    return <span className="text-sm text-muted-foreground">…</span>;
  }
  if (precio !== null) {
    return (
      <span className="block w-32 text-right font-mono text-sm">
        {formatCOP(precio)}
        <span className="mt-1 block text-[10px] font-sans text-muted-foreground">
          de lista
        </span>
      </span>
    );
  }
  return (
    <>
      <Input
        type="number"
        min="0.01"
        step="any"
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        placeholder="0"
        className="h-11 w-32 rounded-xl px-4 text-right font-mono"
        aria-label={etiqueta}
      />
      <span className="mt-1 block text-[10px] text-muted-foreground">
        sin precio de lista
      </span>
    </>
  );
}
