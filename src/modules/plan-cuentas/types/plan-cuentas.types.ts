// Espejo de `/plan-cuentas`.
//
// `cuenta_puc` es el Decreto 2650 y no lo edita nadie. Esto es lo que ESTA
// empresa decidió usar: lo que escogió del catálogo más los auxiliares que el
// decreto no alcanza —el banco con nombre propio, la caja de cada sede—.

export type Naturaleza = "DEBITO" | "CREDITO";

export interface CuentaEmpresa {
  id: string;
  codigo: string;
  nombre: string;
  /**
   * Ancestro más profundo que existe en el decreto. No siempre es una subcuenta:
   * cuando el decreto deja el rango libre (2205, 2408, 1435) el ancla es la
   * cuenta de 4 dígitos, y en la clase 7 puede ser el grupo de 2.
   */
  codigo_puc: string;
  naturaleza: Naturaleza;
  codigo_padre: string | null;
  /** false = agrupa y no recibe asientos. */
  es_auxiliar: boolean;
  exige_tercero: boolean;
  exige_centro_costo: boolean;
  exige_base_gravable: boolean;
  activa: boolean;
  puc_nombre: string;
  puc_nivel: number;
  puc_rango_libre: boolean;
}

/**
 * Una cuenta que el sistema propone, con el hecho declarado que la justifica.
 * Nada se propone sin `porque`.
 */
export interface CuentaSugerida {
  codigo: string;
  nombre: string;
  codigo_puc?: string;
  codigoPuc: string;
  esAuxiliar: boolean;
  exigeTercero: boolean;
  exigeCentroCosto: boolean;
  exigeBaseGravable: boolean;
  /** El hecho declarado que hace falta esta cuenta. Se muestra tal cual. */
  porque: string;
  /**
   * true = el decreto deja libre la numeración de este nivel; el código es una
   * propuesta editable, no una norma.
   */
  sugerido: boolean;
  /** El rango que el decreto deja libre, cuando `sugerido`. */
  rango?: string;
  /** true = hay que elegir la subcuenta según la actividad; el sistema no adivina. */
  requiereEleccion?: boolean;
  /** De dónde sale la cuenta. La pantalla agrupa por esto. */
  bloque: Bloque;
}

/**
 * Los cinco orígenes posibles de una cuenta propuesta.
 *
 * `BASE` es lo que toda contabilidad usa sin depender de ningún documento; los
 * otros cuatro salen de un hecho declarado.
 */
export type Bloque = "BASE" | "PATRIMONIO" | "IMPUESTOS" | "GIRO" | "OPERACION";

/** Un dato sin declarar que impide proponer algo. Dice qué falta y dónde cargarlo. */
export interface HechoFaltante {
  hecho: string;
  etiqueta: string;
  impide: string;
  /** La clave del paso del asistente que lo resuelve. */
  paso: string;
}

export interface Sugerencia {
  cuentas: CuentaSugerida[];
  faltantes: HechoFaltante[];
}

export interface CentroCosto {
  id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
}

/**
 * Una cuenta del Decreto 2650 vista desde esta empresa.
 *
 * El backend no filtra: marca. Devuelve el catálogo entero y cada cuenta dice si
 * le sirve. Esconder una cuenta que alguien necesitaba es peor que mostrar de
 * más — termina asentando en la equivocada porque la correcta no aparecía.
 */
export interface CuentaCatalogo {
  codigo: string;
  nivel: 1 | 2 | 4 | 6;
  codigo_padre: string | null;
  nombre: string;
  naturaleza: Naturaleza;
  es_imputable: boolean;
  /** El decreto no numera las hijas de este nodo: las define cada empresa. */
  rango_libre: boolean;
  /** Ya hay una cuenta de la empresa anclada acá. */
  ya_en_el_plan: boolean;
  pertinente: boolean;
  /** Por qué no lo es. Vacío cuando sí. */
  motivo?: string;
}

export interface CatalogoParaEmpresa {
  /** Las actividades de la empresa, para el encabezado. Viajan una sola vez. */
  secciones: Array<{ codigo: string; nombre: string }>;
  cuentas: CuentaCatalogo[];
}
