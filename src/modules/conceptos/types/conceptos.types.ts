/** Espejo de `ConceptosService` en el backend (`nucleo`). */

export type TipoConcepto = "INGRESO" | "COSTO" | "GASTO" | "NO_GASTO";
export type TipoFlujo = "OPERACION" | "INVERSION" | "FINANCIACION";

export interface Concepto {
  id: string;
  codigo: string;
  nombre: string;
  grupo: string;
  tipo: TipoConcepto;
  tipoFlujo: TipoFlujo;
  /** `null` si falta elegir el auxiliar: así no se puede usar. */
  cuenta: { id: string; codigo: string; nombre: string } | null;
  /** Leído de la cuenta. `null` si no va al resultado. */
  operacional: boolean | null;
  afectaResultado: boolean;
  /** Lo usa el sistema por su cuenta (GMF, pronto pago, anticipos). */
  automatico: boolean;
  esSistema: boolean;
  pistas: string[];
  activo: boolean;
  usos: number;
  /** Las líneas de asiento del mes en curso. */
  usosMes: number;
  /** Sugerencias para el motor (PC23). */
  ivaCompra: IvaCompra | null;
  retencionSugerida: string | null;
  aplicaReteica: boolean;
  deducible: boolean;
}

export type IvaCompra = "DESCONTABLE" | "NO_DESCONTABLE" | "SIN_IVA";

export const NOMBRE_IVA_COMPRA: Record<IvaCompra, string> = {
  DESCONTABLE: "Descontable",
  NO_DESCONTABLE: "No descontable (va al gasto)",
  SIN_IVA: "No lleva IVA",
};

export interface ResultadoPrepararConceptos {
  creados: number;
  cuentasCreadas: string[];
  sinCuenta: string[];
}

export interface CrearConceptoInput {
  nombre: string;
  grupo: string;
  tipo: TipoConcepto;
  cuentaId: string;
  tipoFlujo?: TipoFlujo;
  /** Sugerencias para el motor (PC23): el motor sigue decidiendo por renglón. */
  ivaCompra?: IvaCompra | null;
  retencionSugerida?: string | null;
  aplicaReteica?: boolean;
  deducible?: boolean;
  pistas?: string[];
}

export interface EditarConceptoInput {
  nombre?: string;
  grupo?: string;
  cuentaId?: string;
  tipoFlujo?: TipoFlujo;
  activo?: boolean;
  /** Sugerencias para el motor (PC23): el motor sigue decidiendo por renglón. */
  ivaCompra?: IvaCompra | null;
  retencionSugerida?: string | null;
  aplicaReteica?: boolean;
  deducible?: boolean;
  pistas?: string[];
}

export const NOMBRE_TIPO: Record<TipoConcepto, string> = {
  INGRESO: "Ingresos",
  COSTO: "Costos",
  GASTO: "Gastos",
  NO_GASTO: "No gasto",
};

export const NOMBRE_FLUJO: Record<TipoFlujo, string> = {
  OPERACION: "Operación",
  INVERSION: "Inversión",
  FINANCIACION: "Financiación",
};

/** A qué clases del PUC puede ir cada tipo. La misma regla que el backend. */
export const CLASES_TIPO: Record<TipoConcepto, string[]> = {
  INGRESO: ["4"],
  GASTO: ["5"],
  COSTO: ["6", "7"],
  NO_GASTO: ["1", "2", "3"],
};
