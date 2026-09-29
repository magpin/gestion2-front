"use client";

import { useState } from "react";

import { useResponsableIva } from "@/core/hooks/useResponsableIva";
import { admiteDecimales, esEntero } from "@/lib/numeros";
import { venceConPlazo } from "@/lib/plazo";
import { hoyEnColombia } from "@/lib/utils";
import type { TerceroResumen } from "@/modules/terceros/types/terceros.types";
import {
  aFormaPago,
  formaPagoVacia,
  problemaFormaPago,
} from "@/modules/tesoreria/lib/formaPago";
import {
  lineaVentaCompleta,
  lineaVentaVacia,
  type LineaVentaBorrador,
} from "../components/EditorLineasVenta";
import type { CrearFacturaInput } from "../types/ventas.types";

/** Los plazos que se ofrecen, en días. El del cliente se suma si no está. */
export const PLAZOS = [0, 8, 15, 30, 45, 60, 90];

/** Una retención que el cliente nos practica, mientras se edita. */
export interface RetencionBorrador {
  clave: number;
  conceptoId: string;
  /** Se propone con el subtotal de la factura al agregarla; se puede corregir. */
  base: string;
}

/**
 * Todo lo que se llena para emitir una factura desde la página (pantalla 13):
 * cliente, líneas de producto y de concepto, forma de pago con plazo, y lo
 * que el cliente nos retiene. Arma el envío y dice qué lo impide.
 */
export function useBorradorFactura() {
  const fecha = hoyEnColombia();
  const conIva = useResponsableIva();
  const [cliente, setClienteCrudo] = useState<TerceroResumen | null>(null);
  const [lineas, setLineas] = useState<LineaVentaBorrador[]>([
    lineaVentaVacia(),
  ]);
  const [formaPago, setFormaPago] = useState(formaPagoVacia);
  // El plazo sale del cliente (PC25) y se puede cambiar. Texto: "" es sin elegir.
  const [plazo, setPlazo] = useState("30");
  const [retenciones, setRetenciones] = useState<RetencionBorrador[]>([]);

  const setCliente = (t: TerceroResumen) => {
    setClienteCrudo(t);
    if (t.diasPlazoCliente != null) setPlazo(String(t.diasPlazoCliente));
  };

  const credito = formaPago.modo === "CREDITO";
  const vence = credito ? venceConPlazo(fecha, Number(plazo)) : null;
  const plazoDelCliente = cliente?.diasPlazoCliente ?? null;

  const renglones = (malo: (l: LineaVentaBorrador) => boolean) =>
    lineas
      .map((l, i) => (malo(l) ? i + 1 : null))
      .filter((n): n is number => n !== null);
  const nombrar = (r: number[]) =>
    r.length === 1 ? `el renglón ${r[0]}` : `los renglones ${r.join(", ")}`;
  const incompletas = renglones((l) => !lineaVentaCompleta(l));
  const sinCantidad = renglones(
    (l) => l.cantidad.trim() === "" || Number(l.cantidad) <= 0,
  );
  const sinEntero = renglones(
    (l) =>
      l.tipo !== "CONCEPTO" &&
      l.producto !== null &&
      !admiteDecimales(l.producto.unidad_medida) &&
      !esEntero(l.cantidad),
  );
  const sinPrecio = renglones(
    (l) => l.tipo === "CONCEPTO" && !(Number(l.precioUnitario) > 0),
  );

  const problema = ((): string | null => {
    if (cliente === null) return "Elegí el cliente.";
    if (lineas.length === 0) return "Agregá al menos una línea.";
    if (incompletas.length > 0)
      return `Falta decir qué se vende en ${nombrar(incompletas)}: el producto, o el concepto y qué se cobró.`;
    if (sinCantidad.length > 0)
      return `La cantidad tiene que ser mayor a cero en ${nombrar(sinCantidad)}.`;
    if (sinEntero.length > 0)
      return `La cantidad va en números enteros en ${nombrar(sinEntero)}: ese producto no se fracciona.`;
    if (sinPrecio.length > 0) return `Poné el precio en ${nombrar(sinPrecio)}.`;
    if (retenciones.some((r) => r.conceptoId === ""))
      return "Elegí el concepto de cada retención, o quitala.";
    if (retenciones.some((r) => !(Number(r.base) > 0)))
      return "La base de la retención tiene que ser mayor que cero.";
    if (credito && plazo === "") return "Elegí el plazo.";
    return problemaFormaPago(formaPago);
  })();

  /** Lo que viaja al servidor, o `null` mientras algo lo impida. */
  const datos = (): CrearFacturaInput | null => {
    if (problema !== null || cliente === null) return null;
    const retenidas = retenciones.map((r) => ({
      conceptoId: r.conceptoId,
      base: Number(r.base),
    }));
    return {
      terceroId: cliente.id,
      fecha,
      lineas: lineas.map((l) =>
        l.tipo === "CONCEPTO"
          ? {
              conceptoId: l.concepto!.id,
              detalle: (l.detalle ?? "").trim(),
              cantidad: Number(l.cantidad),
              precioUnitario: Number(l.precioUnitario),
              ivaTarifa: conIva ? Number(l.ivaTarifa ?? 0) : 0,
            }
          : { productoId: l.producto!.id, cantidad: Number(l.cantidad) },
      ),
      ...aFormaPago(formaPago),
      ...(vence !== null && { vence }),
      ...(retenidas.length > 0 && { retenciones: retenidas }),
    };
  };

  return {
    fecha,
    cliente,
    setCliente,
    lineas,
    setLineas,
    formaPago,
    setFormaPago,
    plazo,
    setPlazo,
    plazoDelCliente,
    vence,
    retenciones,
    setRetenciones,
    problema,
    datos,
  };
}

export type BorradorFactura = ReturnType<typeof useBorradorFactura>;
