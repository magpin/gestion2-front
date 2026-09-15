import axios, { type AxiosError } from "axios";
import { env } from "@/core/config/env";
import { useAuthStore } from "@/core/store/authStore";
import type { ApiError } from "@/core/types/api.types";

export const api = axios.create({
  baseURL: env.apiUrl,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  // getState() funciona fuera de componentes React.
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function cerrarSesion() {
  useAuthStore.getState().cerrarSesion();
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
  }
}

/**
 * Un 401 cierra la sesión y punto.
 *
 * Antes había un refresco silencioso: access token de 15 minutos, refresh de 7
 * días. El backend nuevo emite **un** token de 8 horas y no tiene
 * `/auth/refresh`, así que ese baile ya no existe.
 *
 * El 401 ahora significa dos cosas y las dos terminan igual: el token venció, o
 * la cuenta se desactivó mientras la persona trabajaba —el guard relee la base
 * en cada petición—. En ambos casos hay que volver a entrar.
 */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      cerrarSesion();
    }

    // 403 "Elegir una empresa antes de operar": el token es valido pero es el de
    // sesion. Cerrar sesion aca seria castigar a la persona por un estado
    // intermedio legitimo; lo que corresponde es mandarla a elegir.
    const mensaje = error.response?.data?.message;
    if (
      error.response?.status === 403 &&
      typeof mensaje === "string" &&
      mensaje.includes("Elegir una empresa") &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/empresa")
    ) {
      window.location.href = "/empresa";
    }
    return Promise.reject(error);
  },
);

/**
 * El mensaje que se le muestra a la persona.
 *
 * El backend traduce los errores de Postgres a HTTP y manda `constraint` cuando
 * la que se rompió fue una regla de base: eso permite decir «esa factura ya
 * está registrada» en vez de «error inesperado».
 */
export function mensajeDeError(error: unknown): string {
  const e = error as AxiosError<ApiError>;
  const cuerpo = e?.response?.data;
  if (!cuerpo) return "No se pudo conectar con el servidor.";

  if (Array.isArray(cuerpo.message)) return cuerpo.message.join(". ");
  // Los errores traducidos de Postgres —duplicados, reglas de la base— no
  // traen `message`: traen `error` con el texto ya en lenguaje de la persona.
  // Sin esta línea, "esa factura ya está registrada" salía como "Ocurrió un
  // error", que es justo lo que el filtro del backend existe para evitar.
  const texto = cuerpo.message ?? (typeof cuerpo.error === "string" ? cuerpo.error : undefined);
  return texto ?? "Ocurrió un error.";
}

/** La restricción de base que se rompió, para señalar el campo exacto. */
export function restriccionRota(error: unknown): string | undefined {
  const cuerpo = (error as AxiosError<ApiError>)?.response?.data;
  return cuerpo?.constraint ?? cuerpo?.restriccion;
}
