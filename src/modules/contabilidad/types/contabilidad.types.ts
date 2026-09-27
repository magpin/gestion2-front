// Espejo de `/periodos`, `/comprobantes`, `/asientos` y `/libros`.
//
// Los montos llegan como CADENA y no como número: Postgres devuelve `numeric`
// en texto para no perder precisión, y el driver lo respeta. Convertirlos con
// `Number()` justo donde se van a sumar o mostrar, nunca antes.

export type EstadoPeriodo = "ABIERTO" | "CERRADO";
export type EstadoAsiento = "REGISTRADO" | "ANULADO";
export type Naturaleza = "DEBITO" | "CREDITO";

export type NaturalezaComprobante =
  | "DIARIO"
  | "INGRESO"
  | "EGRESO"
  | "APERTURA"
  | "CIERRE";

export interface Periodo {
  id: string;
  anio: number;
  mes: number;
  estado: EstadoPeriodo;
  cerrado_en: string | null;
  cerrado_por: string | null;
  /** Lo cerró el sistema al terminar el mes. */
  cierre_automatico?: boolean;
}

export type Agrupacion = "MENSUAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";

/** Un mes, trimestre, semestre o año del calendario contable, con sus cifras. */
export interface ResumenPeriodo {
  /** 2026-09, 2026-T3, 2026-S2 o 2026. */
  grupo: string;
  /** ABIERTO si alguno de sus meses lo está: es el que está en curso. */
  estado: EstadoPeriodo;
  desde: { anio: number; mes: number };
  hasta: { anio: number; mes: number };
  asientos: number;
  ingresos: number;
  costosGastos: number;
  resultado: number;
  meses: Array<Periodo & { asientos: number }>;
}

export interface ComprobanteTipo {
  id: string;
  codigo: string;
  nombre: string;
  naturaleza: NaturalezaComprobante;
  prefijo: string;
  consecutivo: number;
  activo: boolean;
}

/** Lo que devuelve la lista. Menos de lo que guarda la tabla, a propósito. */
export interface AsientoResumen {
  id: string;
  numero: string;
  fecha: string;
  glosa: string;
  total_debito: string;
  estado: EstadoAsiento;
  comprobante_codigo: string;
  comprobante_nombre: string;
}

export interface LineaAsiento {
  id: string;
  orden: number;
  cuenta_id: string;
  cuenta_codigo: string;
  cuenta_nombre: string;
  tercero_id: string | null;
  tercero_nombre: string | null;
  centro_costo_id: string | null;
  centro_costo_nombre: string | null;
  base_gravable: string | null;
  detalle: string | null;
  debito: string;
  credito: string;
}

/**
 * La ficha completa. Llega con los nombres de columna de la base porque el
 * backend devuelve la fila tal cual.
 */
export interface AsientoDetalle {
  id: string;
  numero: string;
  fecha: string;
  glosa: string;
  total_debito: string;
  total_credito: string;
  estado: EstadoAsiento;
  motivo_anulacion: string | null;
  anulado_en: string | null;
  origen_tipo: string | null;
  origen_id: string | null;
  /**
   * La propuesta de María de la que salió, si salió de una. Nulo cuando lo
   * registró una persona, que es el caso de casi todos.
   */
  propuesta_id: string | null;
  creado_en: string;
  comprobante_codigo: string;
  comprobante_nombre: string;
  periodo_anio: number;
  periodo_mes: number;
  periodo_estado: EstadoPeriodo;
  lineas: LineaAsiento[];
}

export interface PaginaAsientos {
  datos: AsientoResumen[];
  pagina: number;
  tamano: number;
  total: number;
}

export interface FiltroAsientos {
  q?: string;
  desde?: string;
  hasta?: string;
  comprobanteTipoId?: string;
  incluirAnulados?: boolean;
  pagina?: number;
}

/** Una línea tal como la manda el formulario. El `orden` lo pone el servidor. */
export interface LineaNueva {
  cuentaId: string;
  terceroId?: string;
  centroCostoId?: string;
  baseGravable?: number;
  detalle?: string;
  debito: number;
  credito: number;
}

export interface AsientoNuevo {
  comprobanteTipoId: string;
  fecha: string;
  glosa: string;
  lineas: LineaNueva[];
}

// ---------------------------------------------------------------------------
// Libros
// ---------------------------------------------------------------------------

export interface LineaDiario {
  asiento_id: string;
  orden: number;
  debito: string;
  credito: string;
  detalle: string | null;
  cuenta_codigo: string;
  cuenta_nombre: string;
  tercero_nombre: string | null;
}

export interface AsientoDiario {
  id: string;
  numero: string;
  fecha: string;
  glosa: string;
  total_debito: string;
  total_credito: string;
  comprobante_codigo: string;
  lineas: LineaDiario[];
}

export interface MovimientoMayor {
  fecha: string;
  numero: string;
  glosa: string;
  detalle: string | null;
  tercero_nombre: string | null;
  debito: string;
  credito: string;
  /** Saldo acumulado hasta esta línea, incluida. Lo calcula la base. */
  saldo: string;
}

export interface Mayor {
  cuenta: { id: string; codigo: string; nombre: string; naturaleza: Naturaleza };
  movimientos: MovimientoMayor[];
}

export interface MovimientoAuxiliar {
  fecha: string;
  numero: string;
  glosa: string;
  detalle: string | null;
  debito: string;
  credito: string;
  cuenta_codigo: string;
  cuenta_nombre: string;
}

export interface FilaBalance {
  cuenta_id: string;
  codigo: string;
  nombre: string;
  naturaleza: Naturaleza;
  saldo_inicial: string;
  debitos: string;
  creditos: string;
  saldo_final: string;
}

export interface BalancePrueba {
  periodo: { id: string; anio: number; mes: number; estado: EstadoPeriodo };
  filas: FilaBalance[];
}

// ── Revisión (`GET /revision`) ──────────────────────────────────────────────
// Espejo de `revision.reglas.ts` y `criterio.reglas.ts`. Un hallazgo es un hecho
// comprobado —fase 7— o algo que pide criterio —fase 9—, y `certeza` dice cuál.

export type GrupoHallazgo =
  | "DESCUADRE"
  | "DUPLICADO"
  | "FECHAS"
  | "FALTANTE"
  | "CLASIFICACION";

/**
 * Qué tan seguro es. `AFIRMADO` es una comparación exacta; `VISTA` es un hecho
 * claro que pide criterio para saber si es un error; `DEDUCIDA` es una
 * inferencia. Los dos últimos se dicen con «me parece», nunca «está mal».
 */
export type Certeza = "AFIRMADO" | "VISTA" | "DEDUCIDA";

export interface Hallazgo {
  tipo: string;
  grupo: GrupoHallazgo;
  certeza: Certeza;
  titulo: string;
  detalle: string;
  /** Cuando es una diferencia: lo que dice cada lado. */
  cifras?: { uno: number; otro: number; diferencia: number };
  referencias: Array<{ tipo: string; id: string; etiqueta: string }>;
}

/** Un paso del historial de un asiento (`GET /asientos/:id/trazabilidad`). */
export interface PasoTrazabilidad {
  clave:
    | "RECIBIDO"
    | "LEIDO"
    | "VERIFICADO"
    | "PROPUESTO"
    | "APROBADO"
    | "REGISTRADO"
    | "RETENCION"
    | "CONTABILIZADO"
    | "ANULADO";
  cuando: string;
  /** Lo hizo María: la fila lleva su cara. */
  deMaria: boolean;
  persona: { nombre: string; iniciales: string } | null;
  titulo: string;
  detalle: string;
  /** Una comprobación no dio y una persona igual siguió. */
  aviso?: true;
}

export interface Trazabilidad {
  pasos: PasoTrazabilidad[];
  /** El archivo que María leyó. `null` si el asiento no salió de un documento. */
  documento: {
    id: string;
    nombre: string;
    /** sha256 en hexadecimal; `null` si el archivo ya no está. */
    huella: string | null;
    /** Firmada y con vencimiento: se pide de nuevo al abrir el detalle. */
    url: string | null;
  } | null;
}
