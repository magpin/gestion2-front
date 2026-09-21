import type { AtajoRango } from "./reportes.types";

/** Espejo de `reglas/catalogo.ts` del backend, sin el SQL. */
export type ClaveOrigen =
  | "VENTAS"
  | "COMPRAS"
  | "CARTERA"
  | "INVENTARIO"
  | "TESORERIA"
  | "CONTABILIDAD";

export type TipoColumna = "TEXTO" | "FECHA" | "DINERO" | "CANTIDAD";
export type FormaFiltro = "LISTA" | "RANGO" | "SI_NO";

export interface ColumnaArmador {
  clave: string;
  etiqueta: string;
  tipo: TipoColumna;
  filtro: FormaFiltro | null;
  /** Una lista cerrada del producto. Si es `null` y `conCatalogo`, los valores salen de la base. */
  valores: string[] | null;
  conCatalogo: boolean;
  agrupable: boolean;
  inicial: boolean;
  /** Si lleva subtotal y total. */
  suma: boolean;
}

export interface OrigenArmador {
  clave: ClaveOrigen;
  etiqueta: string;
  pregunta: string;
  columnas: ColumnaArmador[];
}

export type FechasDefinicion = { atajo: AtajoRango } | { desde: string; hasta: string };

export type Filtro =
  | { columna: string; forma: "LISTA"; valores: string[] }
  | { columna: string; forma: "RANGO"; minimo?: number | null; maximo?: number | null }
  | { columna: string; forma: "SI_NO"; valor: boolean };

/** Lo que se arma y lo que se guarda. Claves del catálogo, nunca SQL. */
export interface Definicion {
  origen: ClaveOrigen;
  columnas: string[];
  fechas: FechasDefinicion;
  filtros: Filtro[];
  agrupar: string[];
  orden?: { columna: string; direccion: "ASC" | "DESC" } | null;
}

export interface Subtotal {
  nivel: number;
  grupo: (string | null)[];
  filas: number;
  sumas: Record<number, string | null>;
}

export interface Resultado {
  columnas: { clave: string; etiqueta: string; tipo: TipoColumna; suma: boolean }[];
  filas: (string | null)[][];
  totalFilas: number;
  truncado: boolean;
  limite: number;
  total: Subtotal | null;
  subtotales: Subtotal[];
  rango: { desde: string; hasta: string; etiqueta: string; relativo: boolean };
}

export interface Guardado {
  id: string;
  nombre: string;
  origen: ClaveOrigen;
  definicion: Definicion;
  creadoPor: string;
  creadoEn: string;
  actualizadoEn: string;
  ultimaVez?: string | null;
  puedeCorrer?: boolean;
}
