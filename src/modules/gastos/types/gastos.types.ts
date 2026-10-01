/** Espejo de `GastosService` en el backend (`gastos`). */

export interface GrupoGasto {
  grupo: string;
  total: number;
  /** Del total del mes, con un decimal. */
  porcentaje: number;
  conceptos: Array<{ id: string; nombre: string; total: number }>;
}

export type OrigenGasto =
  | "COMPRA"
  | "NOTA_COMPRA"
  | "SIN_FACTURA"
  | "GMF"
  | "COMPROBANTE_EGRESO"
  | "RECIBO_CAJA"
  | "OTRO";

export const NOMBRE_ORIGEN: Record<OrigenGasto, string> = {
  COMPRA: "Factura · Compras",
  NOTA_COMPRA: "Nota · Compras",
  SIN_FACTURA: "Sin factura · Pagos",
  GMF: "4×1000",
  COMPROBANTE_EGRESO: "Comprobante de egreso",
  RECIBO_CAJA: "Recibo de caja",
  OTRO: "Asiento",
};

export interface GastoReciente {
  asientoId: string;
  fecha: string;
  concepto: string;
  tercero: string | null;
  documento: string;
  origen: OrigenGasto;
  valor: number;
}

export interface ResumenGastos {
  mes: string;
  total: number;
  registros: number;
  anterior: { mes: string; total: number };
  variacion: number | null;
  grupos: GrupoGasto[];
  ultimos: GastoReciente[];
  /** Cuánto en cada centro de costo; `id` en `null` es «Sin centro». Vacío sin centros. */
  porCentro?: Array<{ id: string | null; nombre: string; total: number }>;
}

export type Certeza = "CLARA" | "DEDUCIDA" | "NO_SE";

/** La certeza en palabras, como la dice María. */
export const PALABRAS_CERTEZA: Record<Certeza, string> = {
  CLARA: "la vi clara",
  DEDUCIDA: "la deduje",
  NO_SE: "no sé",
};

export interface Sugerencia {
  conceptoId: string | null;
  certeza: Certeza;
  motivo: string;
}
