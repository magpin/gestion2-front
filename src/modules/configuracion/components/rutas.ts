import type { ClavePaso } from "../types/configuracion.types";

/**
 * Una ruta por paso.
 *
 * Vive en su propio archivo y no dentro del armazón porque lo necesitan los
 * dos: el armazón para decidir a dónde avanza, y el recorrido para enlazar cada
 * fila. Importarlo desde el armazón haría que los dos se importen entre sí.
 */
export const RUTA_PASO: Record<ClavePaso, string> = {
  EMPRESA: "/configuracion/empresa",
  SEDES: "/configuracion/sedes",
  SITUACION_LEGAL: "/configuracion/situacion_legal",
  PLAN_CUENTAS: "/configuracion/plan_cuentas",
  RESOLUCIONES: "/configuracion/resoluciones",
};
