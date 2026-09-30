"use client";

import { useState } from "react";

import { useResponsableIva } from "@/core/hooks/useResponsableIva";
import { admiteDecimales, esEntero } from "@/lib/numeros";
import { venceConPlazo } from "@/lib/plazo";
import { hoyEnColombia } from "@/lib/utils";
import type { TerceroResumen } from "@/modules/terceros/types/terceros.types";
import {
  aFormaPago,
  aplicadoEn,
  cubiertaPorAnticipo,
  formaPagoVacia,
  problemaFormaPago,
  type AplicadoPago,
} from "@/modules/tesoreria/lib/formaPago";
import {
  lineaVentaCompleta,
  lineaVentaVacia,
  type LineaVentaBorrador,
} from "../components/EditorLineasVenta";
import type { CrearFacturaInput } from "../types/ventas.types";
import { useTotalesBorrador } from "./useTotalesBorrador";


/** Una retención que el cliente nos practica, mientras se edita. */
export interface RetencionBorrador {
  clave: number;
  conceptoId: string;
  /** Se propone con el subtotal de la factura al agregarla; se puede corregir. */
  base: string;
}

/** Con qué arranca la factura cuando viene de un anticipo: pagada con él. */
export interface InicioFactura {
  cliente: TerceroResumen;
  lineas: LineaVentaBorrador[];
  aplicados: AplicadoPago[];
}

/**
 * Todo lo que se llena para emitir una factura desde la página (pantalla 13):
 * cliente, líneas de producto y de concepto, forma de pago con plazo, y lo
 * que el cliente nos retiene. Arma el envío y dice qué lo impide.
 */
export function useBorradorFactura(inicio?: InicioFactura) {
  const fecha = hoyEnColombia();
  const conIva = useResponsableIva();
  const [cliente, setClienteCrudo] = useState<TerceroResumen | null>(inicio?.cliente ?? null);
  const [lineas, setLineas] = useState<LineaVentaBorrador[]>(
    inicio?.lineas.length ? inicio.lineas : [lineaVentaVacia()],
  );
  const [formaPago, setFormaPago] = useState(() =>
    inicio?.aplicados.length
      ? { ...formaPagoVacia(), modo: "ANTICIPO" as const, aplicados: inicio.aplicados }
      : formaPagoVacia(),
  );
  // El plazo sale del cliente (PC25) y se puede cambiar. Texto: "" es sin elegir.
  const [plazo, setPlazo] = useState("30");
  const [retenciones, setRetenciones] = useState<RetencionBorrador[]>([]);

  const setCliente = (t: TerceroResumen) => {
    // Los anticipos son del cliente: al cambiarlo, se sueltan.
    if (t.id !== cliente?.id) {
      setFormaPago((f) => ({
        ...f,
        aplicados: [],
        renglones: f.renglones.filter((r) => r.medio !== "ANTICIPO"),
        modo: f.modo === "ANTICIPO" ? null : f.modo,
      }));
    }
    setClienteCrudo(t);
    if (t.diasPlazoCliente != null) setPlazo(String(t.diasPlazoCliente));
  };

  // Lo que el cliente paga neto: el del previo del servidor (con lo que nos
  // retiene) o, mientras no llega, el total del navegador.
  const [netoServidor, setNeto] = useState<number | null>(null);
  const aplicado = aplicadoEn(formaPago);

  // A crédito, o con anticipo y el resto a crédito: lleva plazo y vence.
  const credito =
    formaPago.modo === "CREDITO" || (formaPago.modo === "ANTICIPO" && formaPago.resto === "CREDITO");
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
  // Subtotal, IVA y total en el navegador (Fase 4 del plan de ventas). Una
  // línea de producto completa que no da total es un producto sin precio de
  // lista y sin precio digitado; mientras cargan los precios no se dice nada.
  const totales = useTotalesBorrador(lineas);
  const productoSinPrecio = totales.cargando
    ? []
    : lineas
        .map((l, i) =>
          l.tipo !== "CONCEPTO" &&
          l.producto !== null &&
          Number(l.cantidad) > 0 &&
          totales.porLinea[i] === null
            ? i + 1
            : null,
        )
        .filter((n): n is number => n !== null);

  const neto = netoServidor ?? (totales.porLinea.some((c) => c !== null) ? totales.totales.total : null);
  // Los anticipos pagan la factura entera: no hay forma de pago que elegir.
  const cubierta = cubiertaPorAnticipo(formaPago, neto);
  const falta = neto === null ? null : Math.max(0, Math.round((neto - aplicado) * 100) / 100);

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
    if (productoSinPrecio.length > 0)
      return `Poné el precio en ${nombrar(productoSinPrecio)}: ese producto no tiene precio de lista.`;
    if (retenciones.some((r) => r.conceptoId === ""))
      return "Elegí el concepto de cada retención, o quitala.";
    if (retenciones.some((r) => !(Number(r.base) > 0)))
      return "La base de la retención tiene que ser mayor que cero.";
    if (neto !== null && aplicado > neto + 0.004)
      return `Lo aplicado con anticipo pasa del valor de la factura (${neto}).`;
    const pago = problemaFormaPago(formaPago, neto);
    if (pago !== null || cubierta) return pago;
    if (credito && plazo === "") return "Elegí el plazo.";
    return null;
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
          : {
              productoId: l.producto!.id,
              cantidad: Number(l.cantidad),
              // Vacío es el de lista: lo pone el servidor.
              ...(l.precioUnitario.trim() !== "" && {
                precioUnitario: Number(l.precioUnitario),
              }),
            },
      ),
      // Si el anticipo la cubre, es de contado sin nada más que cobrar.
      ...(cubierta
        ? { formaPago: "CONTADO" as const, aplicar: aFormaPago(formaPago).aplicar }
        : aFormaPago(formaPago)),
      ...(vence !== null && !cubierta && { vence }),
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
    aplicado,
    cubierta,
    falta,
    setNeto,
    totales,
    setRetenciones,
    problema,
    datos,
  };
}

export type BorradorFactura = ReturnType<typeof useBorradorFactura>;
