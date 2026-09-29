/** Espejo de `MovimientoConceptoService` (tesoreria). */

export type Direccion = "ENTRADA" | "SALIDA";
export type OrigenMovimiento = "MANUAL" | "RECIBO_CAJA" | "COMPROBANTE_EGRESO" | "GMF";

export interface MovimientoConcepto {
  id: string;
  direccion: Direccion;
  medio: "CAJA" | "BANCO";
  cajaId: string | null;
  cuentaBancariaId: string | null;
  destino: string;
  fecha: string;
  conceptoId: string;
  conceptoCodigo: string;
  conceptoNombre: string;
  terceroId: string | null;
  terceroNombre: string | null;
  valorConcepto: number;
  valorMovido: number;
  detalle: string;
  origen: OrigenMovimiento;
  origenId: string | null;
  asientoId: string | null;
  estado: "VIGENTE" | "ANULADO";
  motivoAnulacion: string | null;
}

export interface CrearMovimientoConceptoInput {
  direccion: Direccion;
  medio: "CAJA" | "BANCO";
  cajaId?: string;
  cuentaBancariaId?: string;
  fecha: string;
  conceptoId: string;
  terceroId?: string;
  detalle: string;
  valor: number;
}
