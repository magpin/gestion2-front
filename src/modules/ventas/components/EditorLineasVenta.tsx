"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";

import { CampoCantidad, CampoPesos } from "@/components/shared/CampoNumero";
import { Button } from "@/components/ui/button";
import { useResponsableIva } from "@/core/hooks/useResponsableIva";
import { formatCOP } from "@/lib/utils";
import { SelectorProducto } from "@/modules/inventario/components/SelectorProducto";
import {
  kardexApi,
  precioApi,
} from "@/modules/inventario/services/inventario.service";
import type { ProductoResumen } from "@/modules/inventario/types/inventario.types";
import { sumarTotales, totalesDeLinea, type TotalesLinea } from "../lib/totales";

/**
 * Pesos con centavos solo si los hay: el precio sin IVA de la tinta es
 * $25.210,08 y mostrarlo como $25.210 sería decir otro número.
 */
function pesos(valor: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(valor);
}

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
 * sin ese dato, y una cotización no puede quedar trabada por eso.
 *
 * Cada línea muestra su precio sin IVA, el subtotal, el IVA y el total, y al
 * pie van los del documento, calculados igual que el servidor
 * (`lib/totales.ts`). Las retenciones no están: esas las calcula el
 * servidor al emitir.
 */
export function EditorLineasVenta({
  lineas,
  onCambiar,
  precioEditable = false,
  precioSiempreDigitado = false,
  mostrarExistencia = true,
}: {
  lineas: LineaVentaBorrador[];
  onCambiar: (lineas: LineaVentaBorrador[]) => void;
  /** Solo la cotización: deja digitar el precio del producto que no tiene. */
  precioEditable?: boolean;
  /**
   * Solo la nota débito: el precio se digita siempre, tenga o no el producto
   * uno de lista. Lo que se le cobra de más al cliente —un flete, un interés,
   * un mayor valor— es un importe nuevo, y el precio de venta del catálogo no
   * tiene nada que ver con él.
   */
  precioSiempreDigitado?: boolean;
  /**
   * La existencia se muestra donde importa. Una nota débito no mueve el
   * kardex, y ahí el saldo en bodega es ruido.
   */
  mostrarExistencia?: boolean;
}) {
  const actualizar = (clave: number, cambio: Partial<LineaVentaBorrador>) =>
    onCambiar(lineas.map((l) => (l.clave === clave ? { ...l, ...cambio } : l)));

  // El IVA de la línea: el del producto, si la empresa lo liquida. Es lo
  // mismo que decide el servidor, que fuerza 0 a quien no es responsable.
  const responsable = useResponsableIva();
  // Los precios de todas las líneas, con la misma llave que `usePrecioVigente`:
  // comparten el caché, no son consultas de más.
  const consultas = useQueries({
    queries: lineas.map((l) => ({
      queryKey: ["productos", "precios", l.producto?.id],
      queryFn: () => precioApi.historialDe(l.producto!.id),
      enabled: l.producto !== null,
      staleTime: 60_000,
    })),
  });
  const calculos: Array<(TotalesLinea & { tarifa: number }) | null> =
    lineas.map((l, i) => {
      if (l.producto === null) return null;
      const vigente = consultas[i]?.data?.find((p) => p.fecha_fin === null);
      const deLista =
        vigente && Number(vigente.precio_venta) > 0
          ? Number(vigente.precio_venta)
          : null;
      const digitado =
        l.precioUnitario.trim() === "" ? null : Number(l.precioUnitario);
      const precio = precioSiempreDigitado
        ? digitado
        : (deLista ?? (precioEditable ? digitado : null));
      const cantidad = Number(l.cantidad);
      if (precio === null || !(precio > 0) || !(cantidad > 0)) return null;
      const tarifa = responsable ? Number(l.producto.iva_tarifa) : 0;
      return { ...totalesDeLinea(cantidad, precio, tarifa), tarifa };
    });
  const completas = calculos.filter(
    (c): c is TotalesLinea & { tarifa: number } => c !== null,
  );
  const totales = sumarTotales(completas);
  const pendientes = lineas.length - completas.length;

  const agregar = () => onCambiar([...lineas, lineaVentaVacia()]);
  const quitar = (clave: number) =>
    onCambiar(lineas.filter((l) => l.clave !== clave));

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[900px] text-left">
          <thead className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3">
                Producto
              </th>
              <th scope="col" className="px-4 py-3">
                Cantidad
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Precio sin IVA
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Subtotal
              </th>
              {responsable && (
                <th scope="col" className="px-4 py-3 text-right">
                  IVA
                </th>
              )}
              <th scope="col" className="px-4 py-3 text-right">
                Total
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
                    onElegir={(producto) =>
                      actualizar(l.clave, { producto, precioUnitario: "" })
                    }
                  />
                  {mostrarExistencia && l.producto && (
                    <Existencia producto={l.producto} />
                  )}
                </td>
                <td className="px-4 py-3">
                  <CampoCantidad
                    unidad={l.producto?.unidad_medida}
                    value={l.cantidad}
                    onChange={(cantidad) => actualizar(l.clave, { cantidad })}
                    placeholder="0"
                    className="h-11 w-32 rounded-xl px-4 text-right font-mono"
                    aria-label={`Cantidad de la línea ${i + 1}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <PrecioDeLinea
                    producto={l.producto}
                    valor={l.precioUnitario}
                    onCambiar={(precioUnitario) =>
                      actualizar(l.clave, { precioUnitario })
                    }
                    etiqueta={`Precio de la línea ${i + 1}`}
                    editable={precioEditable}
                    siempreDigitado={precioSiempreDigitado}
                  />
                </td>
                <td className="px-4 py-3 pt-6 text-right font-mono text-sm tabular-nums">
                  {calculos[i] === null ? "—" : pesos(calculos[i]!.subtotal)}
                </td>
                {responsable && (
                  <td className="px-4 py-3 pt-6 text-right font-mono text-sm tabular-nums">
                    {calculos[i] === null ? (
                      "—"
                    ) : (
                      <>
                        {pesos(calculos[i]!.iva)}
                        <span className="mt-0.5 block font-sans text-[10px] text-muted-foreground">
                          {calculos[i]!.tarifa} %
                        </span>
                      </>
                    )}
                  </td>
                )}
                <td className="px-4 py-3 pt-6 text-right font-mono text-sm font-semibold tabular-nums">
                  {calculos[i] === null ? "—" : pesos(calculos[i]!.total)}
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

      <div className="flex flex-wrap items-start justify-between gap-4">
        <Button
          type="button"
          variant="ghost"
          className="h-11 rounded-xl px-4 text-brand-text"
          onClick={agregar}
        >
          <Plus className="size-4" />
          Agregar línea
        </Button>

        {completas.length > 0 && (
          <dl className="grid min-w-[260px] grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 rounded-2xl border border-border bg-muted/30 p-4 text-sm">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="text-right font-mono tabular-nums">
              {pesos(totales.subtotal)}
            </dd>
            {responsable && (
              <>
                <dt className="text-muted-foreground">IVA</dt>
                <dd className="text-right font-mono tabular-nums">
                  {pesos(totales.iva)}
                </dd>
              </>
            )}
            <dt className="border-t border-border pt-1.5 font-semibold">
              Total
            </dt>
            <dd className="border-t border-border pt-1.5 text-right font-mono text-base font-semibold tabular-nums">
              {pesos(totales.total)}
            </dd>
            {pendientes > 0 && (
              <dd className="col-span-2 text-xs text-muted-foreground">
                {pendientes === 1
                  ? "Falta completar 1 línea: no está en el total."
                  : `Faltan completar ${pendientes} líneas: no están en el total.`}
              </dd>
            )}
          </dl>
        )}
      </div>
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
  editable = false,
  siempreDigitado = false,
}: {
  producto: ProductoResumen | null;
  valor: string;
  onCambiar: (valor: string) => void;
  etiqueta: string;
  /** La cotización: deja digitar el precio del producto que no tiene. */
  editable?: boolean;
  siempreDigitado?: boolean;
}) {
  const { precio, cargando } = usePrecioVigente(producto);

  if (producto === null) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  if (!siempreDigitado && cargando && precio === null) {
    return <span className="text-sm text-muted-foreground">…</span>;
  }
  if (!siempreDigitado && precio !== null) {
    return (
      <span className="ml-auto block w-32 pt-3 text-right font-mono text-sm">
        {pesos(precio)}
        <span className="mt-1 block text-[10px] font-sans text-muted-foreground">
          de lista
        </span>
      </span>
    );
  }
  // En una factura el precio no se digita: sin precio de lista, el servidor
  // la rechaza. Se dice acá, antes de intentarlo.
  if (!siempreDigitado && !editable) {
    return (
      <span className="ml-auto block w-32 pt-3 text-right text-xs text-warning-foreground">
        Sin precio de lista
      </span>
    );
  }
  return (
    <>
      <CampoPesos
        value={valor}
        onChange={onCambiar}
        placeholder="0"
        className="h-11 w-32 rounded-xl px-4 text-right font-mono"
        aria-label={etiqueta}
      />
      <span className="mt-1 block text-[10px] text-muted-foreground">
        {siempreDigitado ? "lo que se cobra de más" : "sin precio de lista"}
      </span>
      {/* Avisar acá y no solo al facturar: el precio se decide mientras se
          cotiza, con el cliente esperando. El costo sale del catálogo, que ya
          lo trae. No aplica a la nota débito —lo que se cobra de más no tiene
          costo contra el cual compararse—. */}
      {!siempreDigitado &&
        Number(producto.saldo_costo_promedio) > 0 &&
        Number(valor) > 0 &&
        Number(valor) < Number(producto.saldo_costo_promedio) && (
          <span className="mt-1 block text-[10px] font-semibold text-danger">
            cuesta {formatCOP(Number(producto.saldo_costo_promedio))}
          </span>
        )}
    </>
  );
}
