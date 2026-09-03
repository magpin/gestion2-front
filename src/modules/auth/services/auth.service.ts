import { api } from "@/core/api/api";
import type {
  EleccionEmpresaResponse,
  EmpresaAccesible,
  LoginPayload,
  LoginResponse,
  Sesion,
} from "../types/auth.types";

/**
 * Cuatro endpoints. No hay más.
 *
 * El backend no tiene `/auth/refresh` ni `/auth/logout`: el token dura 8 horas y
 * cerrar sesión es borrarlo del navegador.
 */
export const authService = {
  /** Paso 1 — credenciales. Devuelve token de sesión y las empresas accesibles. */
  login: (data: LoginPayload) =>
    api.post<LoginResponse>("/auth/login", data).then((r) => r.data),

  /** Paso 2 — elegir contabilidad. Devuelve el token de trabajo y los roles. */
  elegirEmpresa: (empresaId: string) =>
    api.post<EleccionEmpresaResponse>("/auth/empresa", { empresaId }).then((r) => r.data),

  /** Las empresas a las que puede entrar. Se relee al volver al selector. */
  empresas: () => api.get<EmpresaAccesible[]>("/auth/empresas").then((r) => r.data),

  /** Qué dice el token que se está usando. */
  yo: () => api.get<Sesion>("/auth/yo").then((r) => r.data),
};
