/**
 * La condición de pronto pago que trae la factura del proveedor: «2 % pagando
 * antes del 30». Van juntos o ninguno, y el plazo no puede ser anterior a la
 * factura; el comprobante de egreso la propone sola mientras está en plazo.
 */
export function problemaProntoPago(pct: string, hasta: string, fecha: string): string | null {
  if (pct === "" && hasta === "") return null;
  if (pct === "" || hasta === "") return "El pronto pago lleva el porcentaje y hasta cuándo, o ninguno.";
  const n = Number(pct);
  if (!(n > 0 && n < 100)) return "El descuento por pronto pago va entre 0 y 100 %.";
  if (fecha !== "" && hasta < fecha) return "El plazo del pronto pago no puede ser anterior a la factura.";
  return null;
}

/** Lo que se manda al backend: nada si no hay condición. */
export function aEnvioProntoPago(
  pct: string,
  hasta: string,
): { descuentoProntoPagoPct?: number; descuentoProntoPagoHasta?: string } {
  return pct === "" || hasta === ""
    ? {}
    : { descuentoProntoPagoPct: Number(pct), descuentoProntoPagoHasta: hasta };
}
