"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useTieneRol } from "@/core/store/authStore";
import { admiteDecimales, esEntero } from "@/lib/numeros";
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

const hoy = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

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
  const [proveedor, setProveedor] = useState<TerceroResumen | null>(inicial?.proveedor ?? null);
  const [fecha, setFecha] = useState(hoy());
  const [numeroFactura, setNumeroFactura] = useState("");
  const [clase, setClase] = useState<ClaseDocumento>("FACTURA_ELECTRONICA");
  const [cufe, setCufe] = useState("");
  const [lineas, setLineas] = useState<LineaCompraBorrador[]>(inicial?.lineas ?? [lineaCompraVacia()]);
  // Dónde se recibe la compra: decide dónde se causa la ReteICA. Solo se
  // pregunta si la empresa tiene sedes en más de un municipio.
  const [municipio, setMunicipio] = useState("");
  const { data: municipiosIca = [] } = useQuery({
    queryKey: ["retenciones", "ica"],
    queryFn: retencionesApi.ica,
    enabled: activo,
  });
  const [renta, setRenta] = useState(respuestasRentaVacias);
  const [conTarjeta, setConTarjeta] = useState(false);
  const [formaPago, setFormaPago] = useState(formaPagoVacia);
  const [prontoPct, setProntoPct] = useState("");
  const [prontoHasta, setProntoHasta] = useState("");
  // Pagar de contado saca plata de una caja o un banco: el backend lo rechaza
  // de quien no tenga CAJA o DIRECTOR, así que acá ni se ofrece.
  const puedePagar = useTieneRol("CAJA", "DIRECTOR");
  const soporte = clase === "DOCUMENTO_SOPORTE";

  // El plazo del proveedor propone el vence (PC25). Si la persona lo cambió a
  // mano, se respeta: solo se reemplaza el que puso la propuesta anterior.
  const venceSugerido = venceConPlazo(fecha, proveedor?.diasPlazoProveedor);
  const ultimoSugerido = useRef<string | null>(null);
  useEffect(() => {
    if (formaPago.modo !== "CREDITO" || venceSugerido === null) return;
    setFormaPago((f) =>
      f.vence === "" || f.vence === ultimoSugerido.current ? { ...f, vence: venceSugerido } : f,
    );
    ultimoSugerido.current = venceSugerido;
  }, [venceSugerido, formaPago.modo]);

  const limpiar = () => {
    setProveedor(null);
    setFecha(hoy());
    setNumeroFactura("");
    setClase("FACTURA_ELECTRONICA");
    setCufe("");
    setLineas([lineaCompraVacia()]);
    setMunicipio("");
    setRenta(respuestasRentaVacias());
    setConTarjeta(false);
    setFormaPago(formaPagoVacia());
    setProntoPct("");
    setProntoHasta("");
    ultimoSugerido.current = null;
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
    if (proveedor === null) return "Elegí el proveedor.";
    if (fecha === "") return "Elegí la fecha.";
    if (!soporte && numeroFactura.trim() === "") return "Escribí el número de la factura del proveedor.";
    if (lineas.length === 0) return "Agregá al menos una línea.";
    if (incompletas.length > 0)
      return `Falta decir qué se compró en ${nombrar(incompletas)}: el producto, o la cuenta y el detalle del gasto.`;
    if (sinCantidad.length > 0) return `La cantidad tiene que ser mayor a cero en ${nombrar(sinCantidad)}.`;
    if (sinEntero.length > 0)
      return `La cantidad va en números enteros en ${nombrar(sinEntero)}: ese producto no se fracciona.`;
    if (sinCosto.length > 0) return `El costo unitario tiene que ser válido en ${nombrar(sinCosto)}.`;
    return (
      problemaFormaPago(formaPago) ??
      (formaPago.modo === "CREDITO" ? problemaProntoPago(prontoPct, prontoHasta, fecha) : null)
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
      ...(soporte && { claseDocumento: "DOCUMENTO_SOPORTE" as const }),
      ...(!soporte && cufe.trim() !== "" && { cufe: cufe.trim() }),
      lineas: lineasParaEnviar(),
      ...aEnvioRenta(renta),
      ...(conTarjeta && { pagadaConTarjeta: true }),
      ...(municipio !== "" && { municipioCodigo: municipio }),
      ...aFormaPago(formaPago),
      ...(formaPago.modo === "CREDITO" && aEnvioProntoPago(prontoPct, prontoHasta)),
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
    renta, setRenta,
    conTarjeta, setConTarjeta,
    formaPago, setFormaPago,
    prontoPct, setProntoPct,
    prontoHasta, setProntoHasta,
    puedePagar,
    venceSugerido,
    simulacion,
    problema,
    datos,
    limpiar,
  };
}

export type BorradorCompra = ReturnType<typeof useBorradorCompra>;
