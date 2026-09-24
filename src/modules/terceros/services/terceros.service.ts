import { api } from "@/core/api/api";
import type {
  FiltroTerceros,
  PaginaTerceros,
  TerceroDetalle,
  TerceroResumen,
} from "../types/terceros.types";

/**
 * Clientes y proveedores.
 *
 * Nada se borra: desactivar deja el tercero fuera de las listas de digitación
 * pero conserva su historia. Un tercero con facturas emitidas no se puede
 * quitar sin dejar esos documentos sin a quién apuntar.
 */
export const tercerosApi = {
  listar: (f: FiltroTerceros = {}) =>
    api
      .get<PaginaTerceros>("/terceros", {
        params: {
          q: f.q || undefined,
          // Los filtros viajan solo cuando están encendidos: mandar `false`
          // significaría "solo los que NO son clientes", que no es lo que la
          // pantalla ofrece.
          esCliente: f.esCliente ? "true" : undefined,
          esProveedor: f.esProveedor ? "true" : undefined,
          esEmpleado: f.esEmpleado ? "true" : undefined,
          incluirInactivos: f.incluirInactivos ? "true" : undefined,
          soloInactivos: f.soloInactivos ? "true" : undefined,
          pagina: f.pagina ?? 1,
          tamano: 50,
        },
      })
      .then((r) => r.data),

  porId: (id: string) =>
    api.get<TerceroDetalle>(`/terceros/${id}`).then((r) => r.data),

  crear: (datos: Record<string, unknown>) =>
    api.post<TerceroResumen>("/terceros", datos).then((r) => r.data),

  editar: (id: string, datos: Record<string, unknown>) =>
    api.patch<TerceroResumen>(`/terceros/${id}`, datos).then((r) => r.data),

  /** No borra: desactiva. El tercero sale de las listas y conserva su historia. */
  desactivar: (id: string) =>
    api.post(`/terceros/${id}/desactivar`).then(() => undefined),

  /** Lo devuelve a las listas. Desactivar no destruye nada, así que se deshace. */
  activar: (id: string) =>
    api.post(`/terceros/${id}/activar`).then(() => undefined),
};
