/**
 * El lote de documentos del chat (`GET /lotes`, migración 0067). La forma es la
 * de `backend/src/modules/lectura-documentos/reglas/lote.reglas.ts`.
 */

export type SituacionArchivo =
  | "EN_COLA"
  | "MIRANDO"
  | "LEYENDO"
  | "LISTA"
  | "APARTADA"
  | "REGISTRADA"
  | "DESCARTADA"
  | "CONFIGURACION"
  | "NO_SE_LEE"
  | "FALLO"
  | "DETENIDO";

export type ClaveMotivo =
  | "DUPLICADO"
  | "REPETIDO_EN_LOTE"
  | "SIN_TERCERO"
  | "NO_CUADRA"
  | "PREGUNTAS";

export interface ArchivoDelLote {
  id: string;
  orden: number;
  nombre: string;
  situacion: SituacionArchivo;
  tipo: string | null;
  titulo: string;
  descripcion: string;
  valor: number | null;
  motivos: Array<{ clave: ClaveMotivo; texto: string }>;
  nota: string | null;
  documentoId: string | null;
  registrado: { id: string; numero: string } | null;
  duplicadoDe: { id: string; numero: string; fecha: string; total: number } | null;
}

export interface Lote {
  id: string;
  creadoEn: string;
  terminadoEn: string | null;
  detenido: boolean;
  total: number;
  hechos: number;
  listas: number;
  apartadas: number;
  actual: string | null;
  archivos: ArchivoDelLote[];
}

/** El avance de un lote, por el mismo flujo que las lecturas sueltas. */
export interface EventoLote {
  etapa: "LOTE";
  loteId: string;
  total: number;
  hechos: number;
  actual: string | null;
  terminado: boolean;
}
