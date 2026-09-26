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
