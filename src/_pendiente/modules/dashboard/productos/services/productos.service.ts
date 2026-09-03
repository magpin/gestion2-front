import { api } from "@/core/api/api";
import type { Paginado } from "@/core/types/pagination.types";
import type {
  ActualizarProductoPayload,
  AjustePayload,
  CrearProductoPayload,
  FiltrosProducto,
  MovimientoKardex,
  Producto,
  ResultadoAjuste,
} from "../types/productos.types";

/**
 * Endpoints de `inventario`.
 *
 * No hay `POST /kardex` y no es un olvido: si existiera, el promedio ponderado
 * se rompería y no habría a quién reclamarle. El kardex se mueve dentro de la
 * transacción del documento que lo justifica —una compra, una venta— y la única
 * excepción con endpoint propio es el ajuste por conteo.
 */
export const productosService = {
  obtenerTodos: (filtros?: FiltrosProducto) =>
    api.get<Paginado<Producto>>("/productos", { params: filtros }).then((r) => r.data),

  obtenerPorId: (id: string) =>
    api.get<Producto>(`/productos/${id}`).then((r) => r.data),

  /** El stock y su historia. La columna de existencias no existe: esto es la verdad. */
  obtenerKardex: (id: string, limite = 100) =>
    api
      .get<MovimientoKardex[]>(`/productos/${id}/kardex`, { params: { limite } })
      .then((r) => r.data),

  /** Lo que el bloque de INVENTARIO muestra en la pantalla de inicio. */
  alertasStock: (minimo = 0) =>
    api.get<Producto[]>("/productos/alertas-stock", { params: { minimo } }).then((r) => r.data),

  crear: (data: CrearProductoPayload) =>
    api.post<Producto>("/productos", data).then((r) => r.data),

  actualizar: (id: string, data: ActualizarProductoPayload) =>
    api.patch<Producto>(`/productos/${id}`, data).then((r) => r.data),

  /** Desactiva: hay documentos apuntando. */
  desactivar: (id: string) => api.delete<void>(`/productos/${id}`).then((r) => r.data),

  /** Evento A5 · conteo físico. Rol INVENTARIO, aparte de COMPRAS a propósito. */
  ajustar: (data: AjustePayload) =>
    api.post<ResultadoAjuste>("/inventario/ajustes", data).then((r) => r.data),
};
