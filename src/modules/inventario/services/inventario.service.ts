import { api } from "@/core/api/api";
import type {
  CambiarPrecioInput,
  CrearProductoInput,
  InventarioConfiguracion,
  PaginaMovimientos,
  PaginaPrecios,
  PaginaProductos,
  PrecioResumen,
  ProductoResumen,
  RegistrarMovimientoInput,
} from "../types/inventario.types";

/**
 * El maestro de productos y su historial de precio.
 *
 * Nada se borra: desactivar saca el producto de las listas de digitación pero
 * conserva su kardex. `cuentaInventarioId` no se manda al editar — el backend
 * la rechaza, así que ni se ofrece.
 */
export const productosApi = {
  listar: (f: { q?: string; incluirInactivos?: boolean; soloInactivos?: boolean; pagina?: number } = {}) =>
    api
      .get<PaginaProductos>("/productos", {
        params: {
          q: f.q || undefined,
          incluirInactivos: f.incluirInactivos ? "true" : undefined,
          soloInactivos: f.soloInactivos ? "true" : undefined,
          pagina: f.pagina ?? 1,
          tamano: 50,
        },
      })
      .then((r) => r.data),

  porId: (id: string) => api.get<ProductoResumen>(`/productos/${id}`).then((r) => r.data),

  crear: (datos: CrearProductoInput) =>
    api.post<ProductoResumen>("/productos", datos).then((r) => r.data),

  desactivar: (id: string) => api.post(`/productos/${id}/desactivar`).then(() => undefined),

  activar: (id: string) => api.post(`/productos/${id}/activar`).then(() => undefined),
};

export const precioApi = {
  /** El historial de UN producto, para su ficha. */
  historialDe: (productoId: string) =>
    api.get<PrecioResumen[]>(`/productos/${productoId}/precios`).then((r) => r.data),

  /** La bitácora completa: todos los productos, todos los cambios. */
  listarTodos: (f: { desde?: string; hasta?: string; pagina?: number } = {}) =>
    api
      .get<PaginaPrecios>("/productos/precios", {
        params: { desde: f.desde || undefined, hasta: f.hasta || undefined, pagina: f.pagina ?? 1, tamano: 50 },
      })
      .then((r) => r.data),

  /** Nunca un PATCH: cambiar de precio cierra la fila vigente y abre una nueva. */
  cambiar: (productoId: string, datos: CambiarPrecioInput) =>
    api.post<PrecioResumen>(`/productos/${productoId}/precio`, datos).then((r) => r.data),
};

/**
 * El kardex. Sin `PATCH` ni `DELETE`: un movimiento no se edita ni se anula,
 * se corrige con el contrario.
 *
 * La ruta es siempre `productos/:id/movimientos` — no existe un listado
 * global de todos los productos a la vez, así que `listar` exige un producto.
 */
export const kardexApi = {
  listar: (productoId: string, pagina = 1) =>
    api
      .get<PaginaMovimientos>(`/productos/${productoId}/movimientos`, {
        params: { pagina, tamano: 50 },
      })
      .then((r) => r.data),

  cargaInicial: (productoId: string, datos: RegistrarMovimientoInput) =>
    api
      .post(`/productos/${productoId}/movimientos/carga-inicial`, datos)
      .then((r) => r.data),

  entradaAjuste: (productoId: string, datos: RegistrarMovimientoInput) =>
    api
      .post(`/productos/${productoId}/movimientos/entrada-ajuste`, datos)
      .then((r) => r.data),

  /** Sin `costoUnitario`: una salida se valora al promedio vigente. */
  salidaAjuste: (productoId: string, datos: Omit<RegistrarMovimientoInput, "costoUnitario">) =>
    api
      .post(`/productos/${productoId}/movimientos/salida-ajuste`, datos)
      .then((r) => r.data),
};

/** La cuenta contable contra la que se asientan los ajustes de inventario. */
export const configuracionApi = {
  obtener: () => api.get<InventarioConfiguracion>("/inventario/configuracion").then((r) => r.data),

  fijarCuentaAjuste: (cuentaAjusteId: string) =>
    api
      .put<InventarioConfiguracion>("/inventario/configuracion", { cuentaAjusteId })
      .then((r) => r.data),
};
