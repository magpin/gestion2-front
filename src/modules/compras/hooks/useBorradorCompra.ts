"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useTieneRol } from "@/core/store/authStore";
import { admiteDecimales, esEntero } from "@/lib/numeros";
import { hoyEnColombia } from "@/lib/utils";
import { useSimulacionRenta } from "@/modules/retenciones/hooks/useSimulacionRenta";
import { retencionesApi } from "@/modules/retenciones/services/retenciones.service";
import {
  aEnvioRenta,
  problemaRenta,
  respuestasRentaVacias,
} from "@/modules/retenciones/types/retenciones.types";
import type { TerceroResumen } from "@/modules/terceros/types/terceros.types";
import { aFormaPago, formaPagoVacia, problemaFormaPago } from "@/modules/tesoreria/lib/formaPago";
import { lineaCompleta, lineaCompraVacia, type LineaCompraBorrador } from "../components/EditorLineasCompra";
import { aEnvioProntoPago, problemaProntoPago } from "../lib/prontoPago";
import { venceConPlazo } from "@/lib/plazo";
import { comprasApi } from "../services/compras.service";
import type { CrearCompraInput } from "../types/compras.types";

export type ClaseDocumento = "FACTURA_ELECTRONICA" | "DOCUMENTO_SOPORTE";

/** Hoy en Colombia: la fecha que acepta el backend. */
const hoy = (): string => hoyEnColombia();

/** La línea con la que arranca cada clase: mercancía en la factura, un gasto sin IVA en el soporte. */
const lineaInicial = (clase: ClaseDocumento): LineaCompraBorrador =>
  clase === "DOCUMENTO_SOPORTE" ? { ...lineaCompraVacia("GASTO"), ivaTarifa: "0" } : lineaCompraVacia();

/** Una línea recién puesta, sin nada escrito: se puede reemplazar al cambiar de clase. */
const sinTocar = (l: LineaCompraBorrador) =>
  l.producto === null && l.concepto === null && l.detalle.trim() === "" && l.costoUnitario.trim() === "";

/** Con qué arranca: «Registrar gasto» abre la compra con el proveedor y la línea puestos. */
export interface InicioCompra {
  proveedor: TerceroResumen | null;
  lineas: LineaCompraBorrador[];
}

/**
 * Todo lo que se llena para registrar una compra, y lo que impide guardarla.
 *
 * Lo usan el diálogo (lectura de facturas, Registrar gasto) y la página de
 * compra nueva: los dos tienen que validar y armar el envío igual.
 */
export function useBorradorCompra(inicial?: InicioCompra, activo = true) {
  const [proveedor, setProveedorCrudo] = useState<TerceroResumen | null>(inicial?.proveedor ?? null);
  // El plazo sale del proveedor (PC25) y se puede cambiar: el vence lo calcula
  // el sistema con él (plan 7.2).
  const [plazo, setPlazo] = useState(inicial?.proveedor?.diasPlazoProveedor != null ? String(inicial.proveedor.diasPlazoProveedor) : "30");
  const setProveedor = (t: TerceroResumen | null) => {
    setProveedorCrudo(t);
    if (t?.diasPlazoProveedor != null) setPlazo(String(t.diasPlazoProveedor));
  };
  const [fecha, setFecha] = useState(hoy());
  const [numeroFactura, setNumeroFactura] = useState("");
  const [clase, setClaseCruda] = useState<ClaseDocumento>("FACTURA_ELECTRONICA");
  const [cufe, setCufe] = useState("");
  const [lineas, setLineas] = useState<LineaCompraBorrador[]>(inicial?.lineas ?? [lineaCompraVacia()]);
  // Dónde se recibe la compra: decide dónde se causa la ReteICA. Solo se
  // pregunta si la empresa tiene sedes en más de un municipio.
  const [municipio, setMunicipio] = useState("");
  // El centro de costo de la compra. `null`: el que proponga el servidor.
  const [centro, setCentro] = useState<string | null>(null);
  const { data: municipiosIca = [] } = useQuery({
    queryKey: ["retenciones", "ica"],
    queryFn: retencionesApi.ica,
    enabled: activo,
  });
  const [renta, setRenta] = useState(respuestasRentaVacias);
  const [conTarjeta, setConTarjeta] = useState(false);
  const [formaPago, setFormaPago] = useState(formaPagoVacia);
  const [conPronto, setConPronto] = useState(false);
  const [prontoPct, setProntoPct] = useState("");
  const [prontoHasta, setProntoHasta] = useState("");
  // Pagar de contado saca plata de una caja o un banco: el backend lo rechaza
  // de quien no tenga CAJA o DIRECTOR, así que acá ni se ofrece.
  const puedePagar = useTieneRol("CAJA", "DIRECTOR");
  const soporte = clase === "DOCUMENTO_SOPORTE";

  const vence = formaPago.modo === "CREDITO" ? venceConPlazo(fecha, Number(plazo)) : null;
  const plazoHabitual = proveedor?.diasPlazoProveedor ?? null;

  // Cambiar de clase cambia la línea con la que se arranca, si nadie la tocó:
  // el soporte es un gasto sin IVA; la factura, mercancía (pantallas 09 y 10).
  const setClase = (c: ClaseDocumento) => {
    setClaseCruda(c);
    setLineas((ls) => (ls.length === 1 && sinTocar(ls[0]) ? [lineaInicial(c)] : ls));
  };

  const limpiar = () => {
    setProveedor(null);
    setFecha(hoy());
    setNumeroFactura("");
    setClaseCruda("FACTURA_ELECTRONICA");
    setPlazo("30");
    setConPronto(false);
    setCufe("");
    setLineas([lineaCompraVacia()]);
    setMunicipio("");
    setCentro(null);
    setRenta(respuestasRentaVacias());
    setConTarjeta(false);
    setFormaPago(formaPagoVacia());
    setProntoPct("");
    setProntoHasta("");
  };

  // Una línea está incompleta por razones distintas según lo que sea: a la
  // de producto le falta el producto; a la de gasto, la cuenta o el detalle.
  const renglones = (malo: (l: LineaCompraBorrador) => boolean) =>
    lineas.map((l, i) => (malo(l) ? i + 1 : null)).filter((n): n is number => n !== null);
  const incompletas = renglones((l) => !lineaCompleta(l));
  const sinCantidad = renglones((l) => l.cantidad.trim() === "" || Number(l.cantidad) <= 0);
  // Una cantidad con decimales en un producto que va por unidades: pasa si se
  // cambió un producto en kilos por uno en unidades sin corregir la cantidad.
  const sinEntero = renglones(
    (l) => l.producto !== null && !admiteDecimales(l.producto.unidad_medida) && !esEntero(l.cantidad),
  );
  const sinCosto = renglones((l) => l.costoUnitario.trim() === "" || Number(l.costoUnitario) < 0);

  const nombrar = (r: number[]) => (r.length === 1 ? `el renglón ${r[0]}` : `los renglones ${r.join(", ")}`);

  const impedimento = (): string | null => {
    if (proveedor === null) return "Elija el proveedor.";
    if (fecha === "") return "Elija la fecha.";
    if (!soporte && numeroFactura.trim() === "") return "Escriba el número de la factura del proveedor.";
    // Lo mismo que exige el backend: un CUFE a medias no sirve para encontrarla.
    const largoCufe = cufe.trim().length;
    if (!soporte && largoCufe > 0 && (largoCufe < 20 || largoCufe > 200))
      return "El CUFE tiene entre 20 y 200 caracteres: cópielo completo o déjelo vacío.";
    if (lineas.length === 0) return "Agregue al menos una línea.";
    if (incompletas.length > 0)
      return `Falta decir qué se compró en ${nombrar(incompletas)}: el producto, o la cuenta y el detalle del gasto.`;
    if (sinCantidad.length > 0) return `La cantidad tiene que ser mayor a cero en ${nombrar(sinCantidad)}.`;
    if (sinEntero.length > 0)
      return `La cantidad va en números enteros en ${nombrar(sinEntero)}: ese producto no se fracciona.`;
    if (sinCosto.length > 0) return `El costo unitario tiene que ser válido en ${nombrar(sinCosto)}.`;
    return (
      problemaFormaPago(formaPago) ??
      (formaPago.modo === "CREDITO" && conPronto ? problemaProntoPago(prontoPct, prontoHasta, fecha) : null)
    );
  };

  const lineasParaEnviar = () =>
    lineas.map((l) =>
      l.tipo === "PRODUCTO"
        ? {
            productoId: l.producto!.id,
            cantidad: Number(l.cantidad),
            costoUnitario: Number(l.costoUnitario),
            sinIva: l.sinIva || undefined,
          }
        : {
            conceptoId: l.concepto!.id,
            detalle: l.detalle.trim(),
            ivaTarifa: Number(l.ivaTarifa),
            cantidad: Number(l.cantidad),
            costoUnitario: Number(l.costoUnitario),
            ...(l.centro && { centroCostoId: l.centro }),
            ...(l.reparto && { repartoId: l.reparto }),
          },
    );

  // La retención de renta la propone el servidor —el mismo motor que corre al
  // registrar—. Se pide cuando hay proveedor y todas las líneas completas.
  const lineasListas =
    lineas.length > 0 && incompletas.length === 0 && sinCantidad.length === 0 && sinCosto.length === 0;
  const simulacion = useSimulacionRenta(
    "compra",
    proveedor !== null && fecha !== "" && lineasListas && !renta.sinRetencion
      ? {
          terceroId: proveedor.id,
          fecha,
          lineas: lineasParaEnviar(),
          ...aEnvioRenta(renta),
          ...(conTarjeta && { pagadaConTarjeta: true }),
          ...(municipio !== "" && { municipioCodigo: municipio }),
        }
      : null,
    comprasApi.simularRetencion,
  );

  const problema = impedimento() ?? problemaRenta(simulacion.propuesta, renta);

  /** Lo que viaja al servidor, o `null` mientras algo lo impida. */
  const datos = (): CrearCompraInput | null => {
    if (problema !== null || proveedor === null) return null;
    return {
      terceroId: proveedor.id,
      fecha,
      numeroFacturaProveedor: soporte ? "" : numeroFactura.trim(),
      ...(centro !== null && { centroCostoId: centro }),
      ...(soporte && { claseDocumento: "DOCUMENTO_SOPORTE" as const }),
      ...(!soporte && cufe.trim() !== "" && { cufe: cufe.trim() }),
      lineas: lineasParaEnviar(),
      ...aEnvioRenta(renta),
      ...(conTarjeta && { pagadaConTarjeta: true }),
      ...(municipio !== "" && { municipioCodigo: municipio }),
      ...aFormaPago(formaPago),
      ...(vence !== null && { vence }),
      ...(formaPago.modo === "CREDITO" && conPronto && aEnvioProntoPago(prontoPct, prontoHasta)),
    };
  };

  return {
    proveedor, setProveedor,
    fecha, setFecha,
    numeroFactura, setNumeroFactura,
    clase, setClase, soporte,
    cufe, setCufe,
    lineas, setLineas,
    municipio, setMunicipio, municipiosIca,
    centro, setCentro,
    renta, setRenta,
    conTarjeta, setConTarjeta,
    formaPago, setFormaPago,
    conPronto, setConPronto,
    prontoPct, setProntoPct,
    plazo, setPlazo, plazoHabitual, vence,
    prontoHasta, setProntoHasta,
    puedePagar,
    simulacion,
    problema,
    datos,
    limpiar,
  };
}

export type BorradorCompra = ReturnType<typeof useBorradorCompra>;
