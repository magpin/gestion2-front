/**
 * La autonomía del asistente (paso 8), copiada del backend
 * (`conversacion/servicios/autonomia.service.ts`).
 */

export type AccionAutonoma = "COBRO" | "PAGO";
export type ModoRegla = "SOLO_PROPONER" | "CONFIRMAR_SI_PASA";

export interface ReglaAutonoma {
  accion: AccionAutonoma;
  modo: ModoRegla;
  limite: number | null;
  /** Quién la activó, o `null` si nunca se tocó. */
  activadaPor: string | null;
  desde: string | null;
  aciertos: {
    /** Confirmadas por una persona. */
    confirmadas: number;
    /** De esas, sin corregir nada. */
    sinCorregir: number;
    /** Las que confirmó la regla. */
    automaticas: number;
  };
  /** Ya hay historia para soltarla. */
  hayHistoria: boolean;
}

export interface EstadoAutonomia {
  pausada: boolean;
  reglas: ReglaAutonoma[];
  guardas: string[];
  historiaMinima: number;
  /** Solo DIRECTOR cambia las reglas; todos las ven. */
  puedeEditar: boolean;
}

export interface ResumenDelDia {
  fecha: string;
  registradas: { accion: AccionAutonoma; numero: string; tercero: string; valor: number; hora: string }[];
  apartadas: { accion: AccionAutonoma; numero: string; tercero: string; motivo: string }[];
}
