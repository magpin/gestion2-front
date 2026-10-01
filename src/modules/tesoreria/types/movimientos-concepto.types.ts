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
  /** Las líneas, cuando son varias (PC14); vacío si es una sola. */
  lineas: Array<{ conceptoId: string; concepto: string; valor: number }>;
}

export interface CrearMovimientoConceptoInput {
  direccion: Direccion;
  medio: "CAJA" | "BANCO";
  cajaId?: string;
  cuentaBancariaId?: string;
  fecha: string;
  /** Con una sola línea; con varias, `lineas`. */
  conceptoId?: string;
  terceroId?: string;
  detalle: string;
  valor?: number;
  /** Varios conceptos en un solo comprobante (PC14). */
  lineas?: Array<{ conceptoId: string; valor: number; centroCostoId?: string; repartoId?: string }>;
  /** Dónde se gastó o se ganó; sin él, el que proponga el servidor. */
  centroCostoId?: string;
  /** Lo que nos retuvieron, solo en una entrada (PC17). */
  retencion?: { tipo: "RENTA" | "IVA" | "ICA"; valor: number };
}
