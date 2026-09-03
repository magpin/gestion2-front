import axios from "axios";

import { env } from "@/core/config/env";
import type { AdminPlataforma, DetalleCuenta, ResumenCuenta } from "../types/plataforma.types";

/**
 * Cliente propio, no el de la aplicación.
 *
 * El interceptor del cliente manda el token de la contabilidad en sesión; este
 * manda el de administración, que se guarda aparte. Los dos vuelven a `/login`
 * ante un 401 —la puerta es una sola—, pero compartir el cliente haría que
 * administrar el producto cierre la sesión de la contabilidad, o al revés.
 */
const CLAVE_TOKEN = "plataforma-token";

export const api = axios.create({
  baseURL: env.apiUrl,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem(CLAVE_TOKEN) : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem(CLAVE_TOKEN);
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export const sesionPlataforma = {
  guardar: (token: string) => localStorage.setItem(CLAVE_TOKEN, token),
  token: () => (typeof window !== "undefined" ? localStorage.getItem(CLAVE_TOKEN) : null),
  cerrar: () => localStorage.removeItem(CLAVE_TOKEN),
};

export const plataformaService = {
  // No hay `login` acá: se entra por `/login` como todo el mundo. El backend
  // responde con `ambito: "PLATAFORMA"` y `useAuth` guarda el token.

  yo: () => api.get<AdminPlataforma>("/plataforma/auth/yo").then((r) => r.data),

  cuentas: (q?: string) =>
    api
      .get<ResumenCuenta[]>("/plataforma/cuentas", { params: q ? { q } : undefined })
      .then((r) => r.data),

  cuenta: (id: string) =>
    api.get<DetalleCuenta>(`/plataforma/cuentas/${id}`).then((r) => r.data),

  crearCuenta: (datos: Record<string, unknown>) =>
    api.post("/plataforma/cuentas", datos).then((r) => r.data),

  editarCuenta: (id: string, datos: Record<string, unknown>) =>
    api.patch(`/plataforma/cuentas/${id}`, datos).then((r) => r.data),

  crearEmpresa: (id: string, datos: Record<string, unknown>) =>
    api.post(`/plataforma/cuentas/${id}/empresas`, datos).then((r) => r.data),

  crearUsuario: (id: string, datos: Record<string, unknown>) =>
    api.post(`/plataforma/cuentas/${id}/usuarios`, datos).then((r) => r.data),
};
