// Espejo de `GET /empresas/actual/estado-configuracion`.
//
// Las reglas de completitud viven en el backend, no acá: son contables —si la
// empresa cobra IVA, si necesita representante legal— y duplicarlas en el cliente
// garantiza que las dos copias se separen.

export type ClavePaso =
  | "EMPRESA"
  | "SEDES"
  | "SITUACION_LEGAL"
  | "IMPUESTOS"
  | "PLAN_CUENTAS"
  | "RESOLUCIONES";

/**
 * `PENDIENTE` es que nunca se tocó; `FALTA` es que se empezó y quedaron datos.
 * La diferencia decide a dónde llevar al usuario.
 */
export type EstadoPaso = "LISTO" | "FALTA" | "PENDIENTE" | "BLOQUEADO";

export interface Faltante {
  campo: string;
  etiqueta: string;
  /** Una línea de contexto, cuando la etiqueta sola no alcanza para actuar. */
  detalle?: string;
}

export interface Paso {
  clave: ClavePaso;
  nombre: string;
  orden: number;
  obligatorio: boolean;
  estado: EstadoPaso;
  resumen: string;
  faltantes: Faltante[];
  opcionales: Faltante[];
  bloqueadoPor?: ClavePaso;
}

export interface EstadoConfiguracion {
  pasos: Paso[];
  completados: number;
  totalObligatorios: number;
  porcentaje: number;
  completa: boolean;
  siguiente: ClavePaso | null;
  /** Con qué modo se configura (0068). IA se mantiene hasta terminar. */
  modo: "IA" | "MANUAL" | null;
  /** Si ya se mostró la bienvenida de María al terminar (0072). Una vez por empresa. */
  bienvenidaVista: boolean;
}

// Espejo de `GET /empresa-impuestos` (paso «Impuestos», plan motor de
// retenciones, Fase 0, §0.7).

export type ClavePreguntaImpuesto =
  | "IVA"
  | "SIMPLE"
  | "GRAN_CONTRIBUYENTE"
  | "AGENTE_RETENCION"
  | "AUTORRETENEDOR";

export interface RespuestaImpuesto {
  clave: ClavePreguntaImpuesto;
  pregunta: string;
  ayuda: string;
  /** `null`: nadie contestó todavía. */
  respuesta: boolean | null;
  /** El código del RUT vigente que la sostiene, y desde cuándo. */
  fuente: { codigo: number; desde: string } | null;
}

export interface MunicipioIca {
  codigo: string;
  nombre: string;
  esPrincipal: boolean;
  respuesta: {
    esAgenteRetenedor: boolean;
    esAutorretenedor: boolean;
    /** Por mil. Provisional hasta que esté la ley de ICA del municipio. */
    tarifaProvisionalPorMil: number | null;
    fuente: "MANUAL" | "IA" | "MIGRACION";
    desde: string;
  } | null;
}

export interface EstadoImpuestos {
  preguntas: RespuestaImpuesto[];
  agenteIva: { es: boolean; porque: string | null };
  municipios: MunicipioIca[];
  resumen: { vasARetener: string[]; teVanARetener: string[] };
  confirmadoEn: string | null;
}
