/**
 * El contrato de la conversación, copiado del backend
 * (`backend/src/modules/conversacion`). Si un dato no lo devuelve un endpoint,
 * no se dibuja.
 */

export type EstadoTurno = "COMPLETO" | "CORTADO" | "RECHAZADO" | "FALLO";

/** Un turno guardado. El uso de tokens no viaja: queda en la base. */
export interface TurnoConversacion {
  id: string;
  orden: number;
  autor: "PERSONA" | "ASISTENTE";
  texto: string;
  estado: EstadoTurno;
  motivo: string | null;
  creado_en: string;
  /**
   * De dónde salieron las cifras: «Cartera», «Saldos de caja y bancos». Vacío
   * si se contestó sin consultar datos (paso 6).
   */
  fuentes: string[];
}

/** La conversación en la que se escribe. `id` nulo: todavía no hay. */
export interface ConversacionVigente {
  id: string | null;
  turnos: TurnoConversacion[];
  /** Ya pesa el tope: se ofrece empezar otra en vez de dejar escribir. */
  superaTope: boolean;
}

/** Una, vigente o archivada, leída por su id. */
export interface ConversacionCompleta {
  id: string;
  vigente: boolean;
  turnos: TurnoConversacion[];
  superaTope: boolean;
}

/** Una fila de la columna de conversaciones. */
export interface ConversacionEnLista {
  id: string;
  /** La primera pregunta, recortada a 80 caracteres. */
  titulo: string;
  preguntas: number;
  creada_en: string;
  /** `null` en la vigente. */
  archivada_en: string | null;
  ultima_en: string;
}

/** Lo que llega por el flujo de `POST /conversacion/turnos`. */
export type EventoConversacion =
  | { tipo: "PREGUNTA"; turno: TurnoConversacion }
  | { tipo: "CONSULTA"; etiqueta: string }
  | { tipo: "TROZO"; texto: string }
  | { tipo: "FIN"; turno: TurnoConversacion }
  | { tipo: "ERROR"; motivo: string };
