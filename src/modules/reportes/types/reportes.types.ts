import type { RolCodigo } from "@/modules/auth/types/auth.types";

/** Espejo de `reglas/reportes.ts` del backend. */
export type ClaveReporte = "VENTAS_POR_CLIENTE" | "ANTIGUEDAD_CARTERA";

export type Area =
  | "VENTAS"
  | "CARTERA"
  | "COMPRAS"
  | "INVENTARIO"
  | "TESORERIA"
  | "CONTABILIDAD";

/** Qué le pide el reporte a quien lo corre: un rango de fechas o un día de corte. */
export type Parametro = "RANGO" | "CORTE";

export interface Reporte {
  clave: ClaveReporte;
  area: Area;
  etiqueta: string;
  /** La pregunta que contesta, en palabras de quien la haría. */
  pregunta: string;
  trae: string;
  parametro: Parametro;
  roles: RolCodigo[];
  formato: {
    orientacion: "VERTICAL" | "HORIZONTAL";
    paginas: string;
    firmas: boolean;
  };
  /** ISO. `null` si nunca se corrió en esta empresa. */
  ultimaVez: string | null;
}

export interface AreaConReportes {
  area: Area;
  etiqueta: string;
  reportes: Reporte[];
}

export type AtajoRango = "ESTE_MES" | "MES_PASADO" | "ESTE_ANIO" | "PERIODO";
export type AtajoCorte = "HOY" | "CIERRE_MES_PASADO" | "CIERRE_PERIODO_ANTERIOR";

export interface OpcionRango {
  atajo: AtajoRango;
  desde: string;
  hasta: string;
  etiqueta: string;
  relativo: boolean;
  /** Solo `PERIODO`: si el período contable que contiene hoy está abierto o cerrado. */
  estado?: "ABIERTO" | "CERRADO" | null;
}

export interface OpcionCorte {
  atajo: AtajoCorte;
  corte: string;
  etiqueta: string;
  relativo: boolean;
}

export interface Atajos {
  hoy: string;
  rango: OpcionRango[];
  corte: OpcionCorte[];
}

/**
 * Con qué se corre un reporte.
 *
 * Un atajo **se guarda como atajo** y no como las fechas que da hoy: es lo que
 * hace que «este mes» abierto en octubre muestre octubre.
 */
export type Eleccion =
  | { tipo: "ATAJO_RANGO"; atajo: AtajoRango }
  | { tipo: "RANGO"; desde: string; hasta: string }
  | { tipo: "ATAJO_CORTE"; atajo: AtajoCorte }
  | { tipo: "CORTE"; corte: string };

export type Formato = "PDF" | "XLSX";

/** La hoja HTML y lo que el servidor dice de ella en las cabeceras. */
export interface HojaEnPantalla {
  html: string;
  desde: string;
  hasta: string;
  etiqueta: string;
  relativo: boolean;
  /** El reporte corrió bien y no encontró nada en esas fechas. */
  vacio: boolean;
  graficasFallidas: number;
}
