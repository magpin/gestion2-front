import { api } from "@/core/api/api";
import type {
  CiiuClase,
  CiiuNivel,
  CiiuSeccion,
  CuentaPuc,
  CuentaPucDetalle,
  FormaAsociativa,
  HijasPuc,
  ResponsabilidadRut,
  TipoContribuyente,
  TipoDocumento,
} from "../types/catalogos.types";

/**
 * Los catálogos normativos: CIIU, PUC y las casillas del RUT.
 *
 * Todo es `GET`. No hay forma de escribirlos desde la aplicación a propósito.
 *
 * No exigen empresa elegida: el formulario de alta ya necesita el selector de
 * CIIU y el de forma asociativa antes de que la empresa exista.
 */

export const ciiuApi = {
  /** Busca por nombre y por código a la vez: "4741" y "computadores" llegan igual. */
  buscar: (params: { q?: string; seccion?: string; division?: string; grupo?: string; origen?: "DANE" | "DIAN" }) =>
    api.get<CiiuClase[]>("/catalogos/ciiu", { params }).then((r) => r.data),

  clase: (codigo: string) =>
    api.get<CiiuClase>(`/catalogos/ciiu/${codigo}`).then((r) => r.data),

  secciones: () => api.get<CiiuSeccion[]>("/catalogos/ciiu/secciones").then((r) => r.data),

  divisiones: (seccion?: string) =>
    api
      .get<Array<CiiuNivel & { seccion_codigo: string }>>("/catalogos/ciiu/divisiones", {
        params: seccion ? { seccion } : undefined,
      })
      .then((r) => r.data),

  grupos: (division?: string) =>
    api
      .get<Array<CiiuNivel & { division_codigo: string }>>("/catalogos/ciiu/grupos", {
        params: division ? { division } : undefined,
      })
      .then((r) => r.data),
};

export const pucApi = {
  buscar: (params: { q?: string; nivel?: number; padre?: string; soloImputables?: "true" }) =>
    api.get<CuentaPuc[]>("/catalogos/puc", { params }).then((r) => r.data),

  /** Trae la ruta completa hasta la clase, para el breadcrumb sin cuatro consultas. */
  cuenta: (codigo: string) =>
    api.get<CuentaPucDetalle>(`/catalogos/puc/${codigo}`).then((r) => r.data),

  /**
   * Hijas directas. Devuelve `rangoLibre: true` con lista vacía cuando el decreto
   * no numera ese nivel — eso NO es una rama vacía por falta de datos.
   */
  hijas: (codigo: string) =>
    api.get<HijasPuc>(`/catalogos/puc/${codigo}/hijas`).then((r) => r.data),
};

export const rutApi = {
  /**
   * Casilla 53. Busca por número y por descripción a la vez: "48" y "ventas"
   * llegan igual. Por defecto solo las vigentes: las suprimidas existen para
   * leer RUT viejos, no para ofrecerlas al llenar uno nuevo.
   */
  responsabilidades: (params?: { q?: string; incluirNoVigentes?: boolean }) =>
    api
      .get<ResponsabilidadRut[]>("/catalogos/responsabilidades-rut", {
        params: {
          q: params?.q || undefined,
          incluirNoVigentes: params?.incluirNoVigentes ? "true" : undefined,
        },
      })
      .then((r) => r.data),

  tiposDocumento: (aplicaPersona?: "NATURAL" | "JURIDICA") =>
    api
      .get<TipoDocumento[]>("/catalogos/tipos-documento", {
        params: aplicaPersona ? { aplicaPersona } : undefined,
      })
      .then((r) => r.data),

  formasAsociativas: () =>
    api.get<FormaAsociativa[]>("/catalogos/formas-asociativas").then((r) => r.data),

  tiposContribuyente: () =>
    api.get<TipoContribuyente[]>("/catalogos/tipos-contribuyente").then((r) => r.data),
};
