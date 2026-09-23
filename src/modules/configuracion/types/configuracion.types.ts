// Espejo de `GET /empresas/actual/estado-configuracion`.
//
// Las reglas de completitud viven en el backend, no acá: son contables —si la
// empresa cobra IVA, si necesita representante legal— y duplicarlas en el cliente
// garantiza que las dos copias se separen.

export type ClavePaso =
  "EMPRESA" | "SEDES" | "SITUACION_LEGAL" | "PLAN_CUENTAS" | "RESOLUCIONES";

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
}
