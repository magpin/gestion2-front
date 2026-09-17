import type { AxiosError } from "axios";

import type { ApiError } from "@/core/types/api.types";

/**
 * Un error explicado para una persona: qué pasó, y qué hacer ahora.
 *
 * `silencioso` es para los casos que ya tienen su propia salida y no deben
 * aparecer además como aviso: un 401 cierra la sesión y manda al login, y el
 * 403 de "elegir una empresa" manda a elegirla —los dos los resuelve el
 * interceptor de `api.ts`—.
 */
export interface ErrorExplicado {
  titulo: string;
  queHacer: string;
  silencioso: boolean;
}

/** Guardar algo y cargar una pantalla fallan distinto, y piden cosas distintas. */
export type MomentoDelError = "guardar" | "cargar";

/**
 * El texto que mandó el servidor, o `null` si no mandó ninguno.
 *
 * El backend traduce los errores de Postgres a HTTP y manda `constraint` cuando
 * la que se rompió fue una regla de base: eso permite decir «esa factura ya
 * está registrada» en vez de «error inesperado». Esos errores traducidos no
 * traen `message` sino `error` con el texto ya en lenguaje de la persona.
 */
export function mensajeDelServidor(error: unknown): string | null {
  const cuerpo = (error as AxiosError<ApiError>)?.response?.data;
  if (!cuerpo || typeof cuerpo !== "object") return null;
  if (Array.isArray(cuerpo.message)) return cuerpo.message.join(". ");
  if (typeof cuerpo.message === "string") return cuerpo.message;
  if (typeof cuerpo.error === "string") return cuerpo.error;
  return null;
}

/**
 * Qué pasó y qué hacer, según cómo falló.
 *
 * El mensaje del servidor casi siempre dice bien *qué* pasó —"Solo hay 20.000
 * en caja"— pero no dice lo que la persona necesita saber a continuación: si
 * se guardó algo o no, si le conviene volver a intentar, a quién pedírselo.
 * Eso depende del tipo de falla, no del mensaje, y por eso se decide acá y en
 * un solo lugar.
 */
export function explicarError(
  error: unknown,
  momento: MomentoDelError = "guardar",
): ErrorExplicado {
  const respuesta = (error as AxiosError<ApiError>)?.response;
  const mensaje = mensajeDelServidor(error);

  if (!respuesta) {
    return {
      titulo: "No se pudo conectar con el servidor",
      queHacer:
        momento === "guardar"
          ? "No se guardó nada. Revisá la conexión a internet y volvé a intentar; si sigue igual, el servidor puede estar caído y hay que avisarle a quien administra el sistema."
          : "La pantalla puede estar vacía o incompleta. Revisá la conexión a internet y recargá; si sigue igual, avisale a quien administra el sistema.",
      silencioso: false,
    };
  }

  const estado = respuesta.status;

  if (estado === 401) {
    return {
      titulo: "La sesión se cerró",
      queHacer: "Volvé a entrar con tu usuario.",
      silencioso: true,
    };
  }

  if (estado === 403) {
    const eligeEmpresa = mensaje?.includes("Elegir una empresa") ?? false;
    // "Forbidden resource" es el texto por defecto de Nest cuando el guard de
    // roles dice que no: no le dice nada a nadie, y en inglés menos.
    const propio = mensaje !== null && mensaje !== "Forbidden resource";
    return {
      titulo: propio ? mensaje : "Tu usuario no tiene permiso para esto",
      queHacer:
        "Tu rol no alcanza para esta acción. Pedile a alguien con el rol adecuado —normalmente un Director— que la haga, o que te asigne el permiso.",
      silencioso: eligeEmpresa,
    };
  }

  if (estado === 404) {
    return {
      titulo: mensaje ?? "No se encontró lo que se buscaba",
      queHacer:
        "Puede que otra persona lo haya desactivado o cambiado mientras trabajabas. Recargá la pantalla y buscalo de nuevo.",
      silencioso: false,
    };
  }

  if (estado === 409) {
    return {
      titulo: mensaje ?? "Eso ya existe o cambió al mismo tiempo",
      queHacer:
        "No se guardó nada. Recargá la pantalla para ver cómo quedó y revisá antes de volver a intentar.",
      silencioso: false,
    };
  }

  if (estado >= 500) {
    return {
      titulo: "El servidor tuvo un problema",
      queHacer:
        momento === "guardar"
          ? "No se guardó nada. Volvé a intentar en un momento; si se repite, avisale a soporte la hora y lo que estabas haciendo."
          : "La pantalla puede estar vacía o incompleta. Recargá en un momento; si se repite, avisale a soporte la hora y qué pantalla abriste.",
      silencioso: false,
    };
  }

  // 400 y 422: el servidor rechazó lo que se mandó y dice por qué. Casi siempre
  // el mensaje ya trae la corrección; lo que falta decir es que no se guardó.
  return {
    titulo: mensaje ?? "El servidor no aceptó los datos",
    queHacer:
      momento === "guardar"
        ? "No se guardó nada. Corregí lo que dice arriba y volvé a intentar."
        : "Recargá la pantalla; si vuelve a pasar, avisale a soporte qué pantalla abriste.",
    silencioso: false,
  };
}
