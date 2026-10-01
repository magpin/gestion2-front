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
          ? "No se guardó nada. Revise la conexión a internet e intente de nuevo; si sigue igual, el servidor puede estar caído y hay que avisar a quien administra el sistema."
          : "La pantalla puede estar vacía o incompleta. Revise la conexión a internet y recargue la página; si sigue igual, avise a quien administra el sistema.",
      silencioso: false,
    };
  }

  const estado = respuesta.status;

  if (estado === 401) {
    return {
      titulo: "La sesión se cerró",
      queHacer: "Vuelva a entrar con su usuario.",
      silencioso: true,
    };
  }

  if (estado === 403) {
    const eligeEmpresa = mensaje?.includes("Elegir una empresa") ?? false;
    // "Forbidden resource" es el texto por defecto de Nest cuando el guard de
    // roles dice que no: no le dice nada a nadie, y en inglés menos.
    const propio = mensaje !== null && mensaje !== "Forbidden resource";
    return {
      titulo: propio ? mensaje : "Su usuario no tiene permiso para esto",
      queHacer:
        "Su rol no alcanza para esta acción. Solicite a alguien con el rol adecuado —normalmente un Director— que la haga o que le asigne el permiso.",
      silencioso: eligeEmpresa,
    };
  }

  if (estado === 404) {
    return {
      titulo: mensaje ?? "No se encontró lo que se buscaba",
      queHacer:
        "Puede que otra persona lo haya desactivado o cambiado mientras usted trabajaba. Recargue la pantalla y búsquelo de nuevo.",
      silencioso: false,
    };
  }

  if (estado === 409) {
    return {
      titulo: mensaje ?? "Eso ya existe o cambió al mismo tiempo",
      queHacer:
        "No se guardó nada. Recargue la pantalla para ver cómo quedó y revise antes de intentar de nuevo.",
      silencioso: false,
    };
  }

  if (estado >= 500) {
    return {
      titulo: "El servidor tuvo un problema",
      queHacer:
        momento === "guardar"
          ? "No se guardó nada. Intente de nuevo en un momento; si se repite, informe a soporte la hora y lo que estaba haciendo."
          : "La pantalla puede estar vacía o incompleta. Recargue la página en un momento; si se repite, informe a soporte la hora y qué pantalla abrió.",
      silencioso: false,
    };
  }

  // 400 y 422: el servidor rechazó lo que se mandó y dice por qué. Casi siempre
  // el mensaje ya trae la corrección; lo que falta decir es que no se guardó.
  return {
    titulo: mensaje ?? "El servidor no aceptó los datos",
    queHacer:
      momento === "guardar"
        ? "No se guardó nada. Corrija lo que se indica arriba e intente de nuevo."
        : "Recargue la pantalla; si vuelve a pasar, informe a soporte qué pantalla abrió.",
    silencioso: false,
  };
}
