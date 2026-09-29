/** Espejo de `ComprobanteEgresoService`, `CrucePagoService` y `PagoProgramadoService` (`compras`). */

export type TramoPago = "VENCIDO" | "ESTA_SEMANA" | "PROXIMA_SEMANA" | "RESTO_MES" | "DESPUES";

export const TRAMOS: TramoPago[] = ["VENCIDO", "ESTA_SEMANA", "PROXIMA_SEMANA", "RESTO_MES", "DESPUES"];

export const NOMBRE_TRAMO: Record<TramoPago, string> = {
  VENCIDO: "Vencido",
  ESTA_SEMANA: "Esta semana",
  PROXIMA_SEMANA: "Próxima semana",
  RESTO_MES: "Resto del mes",
  DESPUES: "Después",
};

export interface CompraPorPagar {
  id: string;
  numero: string;
  fecha: string;
  vence: string | null;
  venceEfectivo: string;
  tramo: TramoPago;
  pendiente: number;
  /** Si todavía está en plazo, el descuento que el proveedor concede hoy. */
  descuentoSugerido: number;
  descuentoPct: number | null;
  descuentoHasta: string | null;
}

export interface ProveedorPorPagar {
  terceroId: string;
  nombre: string;
  identificacion: string;
  compras: CompraPorPagar[];
  total: number;
}

export interface PorPagar {
  hoy: string;
  total: number;
  compras: number;
  tramos: Record<TramoPago, number>;
  proveedores: ProveedorPorPagar[];
}

export interface ComprobanteEgreso {
  id: string;
  numero: string;
  fecha: string;
  terceroId: string;
  terceroNombre: string;
  medio: "CAJA" | "BANCO";
  destino: string;
  /** Lo que se le pagó en plata al proveedor. */
  total: number;
  /** El anticipo bruto que se le entregó. */
  anticipo: number;
  /** Lo que se le retuvo al anticipo. */
  retencionAnticipo: number;
  gmf: number;
  estado: "VIGENTE" | "ANULADO";
  motivoAnulacion: string | null;
  aplicaciones: Array<{ compraId: string; compra: string; valor: number; descuento: number }>;
}

export interface CrearComprobanteEgresoInput {
  terceroId: string;
  fecha: string;
  medio: "CAJA" | "BANCO";
  cajaId?: string;
  cuentaBancariaId?: string;
  aplicaciones: Array<{ compraId: string; valor: number; descuento?: number }>;
  anticipo?: number;
  conceptoRetencionAnticipo?: string;
}

export interface AnticipoProveedor {
  movimientoId: string;
  fecha: string;
  detalle: string;
  /** El bruto: lo que bajó al anticipo (133005). */
  valor: number;
  /** Lo que se le retuvo al entregarlo. */
  retenido: number;
  cruzado: number;
  saldo: number;
}

export interface CrucePago {
  id: string;
  terceroId: string;
  terceroNombre: string;
  origen: string;
  destinoCompraId: string;
  destino: string;
  valor: number;
  retencionReversada: number;
  fecha: string;
  estado: "VIGENTE" | "ANULADO";
  motivoAnulacion: string | null;
}

export interface CrearCrucePagoInput {
  origenId: string;
  destinoCompraId: string;
  valor: number;
  fecha: string;
}

export type Recurrencia = "UNA_VEZ" | "QUINCENAL" | "MENSUAL";

export interface PagoProgramado {
  id: string;
  descripcion: string;
  terceroId: string | null;
  terceroNombre: string | null;
  compraId: string | null;
  conceptoId: string | null;
  conceptoNombre: string | null;
  valor: number;
  fecha: string;
  recurrencia: Recurrencia;
  estado: "PENDIENTE" | "PAGADO" | "CANCELADO";
  /** De qué banco va a salir; `null` si no se dijo. */
  cuentaBancariaId: string | null;
  cuentaBancaria: string | null;
}

export interface CrearPagoProgramadoInput {
  descripcion: string;
  terceroId?: string;
  conceptoId?: string;
  valor: number;
  fecha: string;
  recurrencia: Recurrencia;
  cuentaBancariaId?: string;
}

// ─── Todo lo que salió en el mes (PC12) ─────────────────────────────────────

export type TipoEgreso = "PROVEEDOR" | "SIN_FACTURA" | "NO_GASTO" | "IMPUESTO";

export const NOMBRE_TIPO_EGRESO: Record<TipoEgreso, string> = {
  PROVEEDOR: "Proveedor",
  SIN_FACTURA: "Gasto sin factura",
  NO_GASTO: "No es gasto",
  IMPUESTO: "Impuesto",
};

export interface Egreso {
  id: string;
  origen: "COMPROBANTE" | "CONCEPTO" | "DECLARACION" | "CUOTA";
  /** «EG-000074», o el número del asiento cuando no hay comprobante de egreso. */
  numero: string;
  fecha: string;
  tercero: string | null;
  detalle: string;
  tipo: TipoEgreso;
  medio: "CAJA" | "BANCO";
  medioId: string;
  destino: string;
  /** Lo que salió, sin el 4×1000. */
  valor: number;
  gmf: number;
  estado: "VIGENTE" | "ANULADO";
}

export interface EgresosDelMes {
  resumen: import("@/modules/tesoreria/types/resumen.types").ResumenDelMes;
  egresos: Egreso[];
}
