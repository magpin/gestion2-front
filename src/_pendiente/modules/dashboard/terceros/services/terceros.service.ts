import { api } from "@/core/api/api";
import type { Paginado } from "@/core/types/pagination.types";
import type {
  ActualizarTerceroPayload,
  CrearTerceroPayload,
  FiltrosTercero,
  Tercero,
} from "../types/terceros.types";

/**
 * Endpoints de `nucleo` para terceros.
 *
 * Se cayeron dos del contrato viejo:
 *   · `/terceros/por-documento/:doc` — el lookup se hace con `?buscar=`, que
 *     además busca por nombre sin que la tilde decida si aparece.
 *   · `/terceros/:id/equipos` — el equipo ya no es una tabla. Entra en custodia
 *     y se guarda como texto en la orden de trabajo.
 */
export const tercerosService = {
  obtenerTodos: (filtros?: FiltrosTercero) =>
    api.get<Paginado<Tercero>>("/terceros", { params: filtros }).then((r) => r.data),

  obtenerPorId: (id: string) =>
    api.get<Tercero>(`/terceros/${id}`).then((r) => r.data),

  crear: (data: CrearTerceroPayload) =>
    api.post<Tercero>("/terceros", data).then((r) => r.data),

  actualizar: (id: string, data: ActualizarTerceroPayload) =>
    api.patch<Tercero>(`/terceros/${id}`, data).then((r) => r.data),

  /** Desactiva. No borra: hay ventas, compras y órdenes de trabajo apuntando. */
  desactivar: (id: string) =>
    api.delete<void>(`/terceros/${id}`).then((r) => r.data),
};
