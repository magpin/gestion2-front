// Subtotal, IVA y total de una línea de venta, calculados **igual que el
// servidor** (`calcularLinea` en backend/src/modules/ventas/servicios/
// venta.reglas.ts): en centavos, con el IVA redondeado. Si no fuera igual, la
// pantalla diría un total y la factura otro.
//
// Es para mostrar mientras se digita. El documento lo sigue calculando el
// servidor, que es el que decide: esto no viaja.

export interface TotalesLinea {
  subtotal: number;
  iva: number;
  total: number;
}

export function totalesDeLinea(
  cantidad: number,
  precioSinIva: number,
  ivaTarifa: number,
): TotalesLinea {
  const subtotal = Math.round(cantidad * precioSinIva * 100);
  const iva = Math.round((subtotal * ivaTarifa) / 100);
  return {
    subtotal: subtotal / 100,
    iva: iva / 100,
    total: (subtotal + iva) / 100,
  };
}

/** La suma de varias líneas, en centavos para no arrastrar decimales. */
export function sumarTotales(lineas: TotalesLinea[]): TotalesLinea {
  const c = (n: number) => Math.round(n * 100);
  const subtotal = lineas.reduce((s, l) => s + c(l.subtotal), 0);
  const iva = lineas.reduce((s, l) => s + c(l.iva), 0);
  return { subtotal: subtotal / 100, iva: iva / 100, total: (subtotal + iva) / 100 };
}

/** Lo mínimo de una línea en edición que hace falta para calcularla. */
export interface LineaParaTotales {
  tipo?: "PRODUCTO" | "CONCEPTO";
  producto: { iva_tarifa: string | number } | null;
  cantidad: string;
  precioUnitario: string;
  ivaTarifa?: string;
}

export type TotalesDeLineaConTarifa = TotalesLinea & { tarifa: number };

export interface TotalesDelBorrador {
  /** Una por línea, en el mismo orden; `null` si la línea está incompleta. */
  porLinea: Array<TotalesDeLineaConTarifa | null>;
  /** La suma de las líneas completas. */
  totales: TotalesLinea;
  /** Las que faltan completar: no están en `totales`. */
  pendientes: number;
}

/**
 * Subtotal, IVA y total de un documento mientras se digita, línea por línea.
 *
 * El precio de una línea de producto es el digitado si lo hay y, si no, el de
 * lista (`precioDeLista(i)`). Con `siempreDigitado` —la nota débito— solo
 * cuenta el digitado. La de concepto siempre lleva el suyo, con su tarifa.
 * Quien no es responsable de IVA no lo liquida: tarifa 0, igual que el
 * servidor.
 */
export function totalesDelBorrador(
  lineas: LineaParaTotales[],
  precioDeLista: (indice: number) => number | null,
  responsable: boolean,
  { siempreDigitado = false }: { siempreDigitado?: boolean } = {},
): TotalesDelBorrador {
  const porLinea = lineas.map((l, i): TotalesDeLineaConTarifa | null => {
    const cantidad = Number(l.cantidad);
    const digitado = l.precioUnitario.trim() === "" ? null : Number(l.precioUnitario);
    if (l.tipo === "CONCEPTO") {
      if (digitado === null || !(digitado > 0) || !(cantidad > 0)) return null;
      const tarifa = responsable ? Number(l.ivaTarifa ?? 0) : 0;
      return { ...totalesDeLinea(cantidad, digitado, tarifa), tarifa };
    }
    if (l.producto === null) return null;
    const deLista = precioDeLista(i);
    const precio = siempreDigitado ? digitado : (digitado ?? deLista);
    if (precio === null || !(precio > 0) || !(cantidad > 0)) return null;
    const tarifa = responsable ? Number(l.producto.iva_tarifa) : 0;
    return { ...totalesDeLinea(cantidad, precio, tarifa), tarifa };
  });
  const completas = porLinea.filter((c): c is TotalesDeLineaConTarifa => c !== null);
  return {
    porLinea,
    totales: sumarTotales(completas),
    pendientes: lineas.length - completas.length,
  };
}
