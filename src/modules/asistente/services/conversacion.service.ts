import { api } from "@/core/api/api";
import { env } from "@/core/config/env";
import { partirEventos } from "../lib/conversacion";
import type {
  ConversacionCompleta,
  ConversacionEnLista,
  ConversacionVigente,
  CuerpoDePago,
  EventoConversacion,
  PropuestaConversacion,
} from "../types/conversacion.types";

/** Un turno que el backend no aceptó: el límite, el tope, otra respuesta en curso. */
export class TurnoRechazado extends Error {
  constructor(
    readonly estado: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

/**
 * Los endpoints de `/conversacion` (módulo `conversacion` del backend).
 *
 * Escribir es siempre en la vigente de quien pregunta; ninguna llamada que
 * escribe manda un id. Las archivadas se leen, no se retoman.
 */
export const conversacionService = {
  disponible: () =>
    api
      .get<{ disponible: boolean }>("/conversacion/disponible")
      .then((r) => r.data.disponible),

  vigente: () =>
    api.get<ConversacionVigente>("/conversacion").then((r) => r.data),

  lista: () =>
    api.get<ConversacionEnLista[]>("/conversacion/lista").then((r) => r.data),

  una: (id: string) =>
    api.get<ConversacionCompleta>(`/conversacion/${id}`).then((r) => r.data),

  /**
   * Confirmar lo que propuso el asistente. El backend mira los roles del
   * cobro o el pago y lo registra con el mismo código que la pantalla.
   * `correccion`: lo que la persona cambió en la tarjeta.
   */
  confirmarPropuesta: (id: string, correccion?: CuerpoDePago) =>
    api
      .post<PropuestaConversacion>(
        `/conversacion/propuestas/${id}/confirmar`,
        correccion === undefined ? {} : { correccion },
      )
      .then((r) => r.data),

  descartarPropuesta: (id: string) =>
    api
      .post<PropuestaConversacion>(`/conversacion/propuestas/${id}/descartar`)
      .then((r) => r.data),

  /** «Nueva conversación»: archiva la vigente. */
  nueva: () => api.post<void>("/conversacion/nueva").then(() => undefined),

  /**
   * Una pregunta y su respuesta, en vivo.
   *
   * Con `fetch` y no con axios: axios no entrega el cuerpo por partes en el
   * navegador, y la respuesta tiene que aparecer mientras se escribe. El token
   * va en `Authorization`, como en `useProgreso`.
   *
   * Lo que el backend rechaza antes de abrir el flujo llega como
   * `TurnoRechazado`, con su mensaje tal cual. Cortar con `corte` equivale a
   * cerrar la pestaña: el backend guarda el turno como CORTADO.
   */
  preguntar: async (
    texto: string,
    {
      token,
      corte,
      alEvento,
    }: {
      token: string;
      corte: AbortSignal;
      alEvento: (evento: EventoConversacion) => void;
    },
  ): Promise<void> => {
    const respuesta = await fetch(`${env.apiUrl}/conversacion/turnos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ texto }),
      signal: corte,
    });
    if (!respuesta.ok || respuesta.body === null) {
      throw new TurnoRechazado(respuesta.status, await mensajeDe(respuesta));
    }

    const lector = respuesta.body.getReader();
    const decodificador = new TextDecoder();
    let pendiente = "";
    for (;;) {
      const { done, value } = await lector.read();
      if (done) break;
      pendiente += decodificador.decode(value, { stream: true });
      const { eventos, resto } = partirEventos(pendiente);
      pendiente = resto;
      eventos.forEach(alEvento);
    }
  },
};

/** El mensaje del backend, sea `message` (texto o lista) o `error`. */
async function mensajeDe(respuesta: Response): Promise<string> {
  try {
    const cuerpo = (await respuesta.json()) as {
      message?: string | string[];
      error?: string;
    };
    const mensaje = Array.isArray(cuerpo.message)
      ? cuerpo.message[0]
      : cuerpo.message;
    return mensaje ?? cuerpo.error ?? "No pude mandar la pregunta.";
  } catch {
    return "No pude mandar la pregunta.";
  }
}
