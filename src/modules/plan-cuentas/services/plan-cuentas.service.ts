import { api } from "@/core/api/api";
import type {
  CatalogoParaEmpresa,
  CentroCosto,
  CuentaEmpresa,
  Sugerencia,
} from "../types/plan-cuentas.types";

/**
 * El plan de cuentas de la empresa en sesión.
 *
 * Leerlo lo puede cualquiera con acceso a la contabilidad; cambiarlo es del
 * director y del contador. Nada se borra: una cuenta con movimiento no se puede
 * quitar sin descuadrar el libro, así que se desactiva.
 */
export const planCuentasApi = {
  listar: (params?: { q?: string; soloAuxiliares?: "true"; incluirInactivas?: "true" }) =>
    api.get<CuentaEmpresa[]>("/plan-cuentas", { params }).then((r) => r.data),

  /**
   * Qué cuentas necesita esta empresa según lo que ya declaró, y qué no se puede
   * proponer porque falta un dato. No crea nada.
   */
  sugerencia: () => api.get<Sugerencia>("/plan-cuentas/sugerencia").then((r) => r.data),

  /** Crea solo lo confirmado. El backend rechaza códigos fuera de la sugerencia vigente. */
  aplicar: (codigos: string[]) =>
    api
      .post<{ creadas: number }>("/plan-cuentas/aplicar-sugerencia", { codigos })
      .then((r) => r.data),

  /**
   * El catálogo del decreto marcado según le sirva o no a la empresa. Mismos
   * filtros de navegación que `/catalogos/puc`, más la pertinencia.
   */
  catalogo: (params?: { q?: string; nivel?: number; padre?: string; soloImputables?: "true" }) =>
    api.get<CatalogoParaEmpresa>("/plan-cuentas/catalogo", { params }).then((r) => r.data),

  crear: (datos: Record<string, unknown>) =>
    api.post<CuentaEmpresa>("/plan-cuentas", datos).then((r) => r.data),

  editar: (id: string, datos: Record<string, unknown>) =>
    api.patch<CuentaEmpresa>(`/plan-cuentas/${id}`, datos).then((r) => r.data),

  /**
   * «+ Crear cuenta auxiliar» desde un formulario: la madre y el nombre; el
   * código lo pone el servidor. Devuelve la cuenta como `listar`.
   */
  crearAuxiliar: (datos: { madre: string; nombre: string; contexto?: string }) =>
    api.post<CuentaEmpresa>("/plan-cuentas/auxiliar", datos).then((r) => r.data),

  /** El código que saldría bajo una madre, antes de guardar. */
  siguiente: (madre: string) =>
    api
      .get<{ codigo: string }>("/plan-cuentas/siguiente", { params: { madre } })
      .then((r) => r.data.codigo),

  /** La vuelve a ofrecer. Si la madre está inactiva, el servidor lo dice. */
  activar: (id: string) => api.post(`/plan-cuentas/${id}/activar`).then(() => undefined),

  desactivar: (id: string) =>
    api.post(`/plan-cuentas/${id}/desactivar`).then(() => undefined),

  centros: () => api.get<CentroCosto[]>("/plan-cuentas/centros-costo").then((r) => r.data),

  crearCentro: (datos: { codigo: string; nombre: string }) =>
    api.post<CentroCosto>("/plan-cuentas/centros-costo", datos).then((r) => r.data),

  editarCentro: (id: string, datos: { nombre: string }) =>
    api.patch<CentroCosto>(`/plan-cuentas/centros-costo/${id}`, datos).then((r) => r.data),

  desactivarCentro: (id: string) =>
    api.post(`/plan-cuentas/centros-costo/${id}/desactivar`).then(() => undefined),
};
