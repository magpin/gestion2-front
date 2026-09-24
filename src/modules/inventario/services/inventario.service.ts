import { api } from "@/core/api/api";
import type {
  CambiarPrecioInput,
  CrearProductoInput,
  EditarProductoInput,
  PaginaFaltantes,
  ConceptoInventario,
  InventarioConfiguracion,
  TratamientoFaltante,
  PaginaMovimientos,
  PaginaPrecios,
  PaginaProductos,
  PrecioResumen,
  ProductoResumen,
  RegistrarMovimientoInput,
  ValorInventario,
  CategoriaResumen,
} from "../types/inventario.types";

/**
 * El maestro de productos y su historial de precio.
 *
 * Nada se borra: desactivar saca el producto de las listas de digitación pero
 * conserva su kardex. `cuentaInventarioId` no se manda al editar — el backend
 * la rechaza, así que ni se ofrece.
 */
/**
 * Las categorías del catálogo. Sin paginar: una empresa tiene decenas, no
 * miles. No se borran, se desactivan — borrarlas dejaría productos sin
 * clasificar sin que nadie se entere.
 */
export const categoriasApi = {
  listar: (incluirInactivas = false) =>
    api
      .get<CategoriaResumen[]>("/categorias", {
        params: { incluirInactivas: incluirInactivas ? "true" : undefined },
      })
      .then((r) => r.data),

  crear: (nombre: string) =>
    api.post<CategoriaResumen>("/categorias", { nombre }).then((r) => r.data),

  editar: (id: string, datos: { nombre?: string; activa?: boolean }) =>
    api.patch<CategoriaResumen>(`/categorias/${id}`, datos).then((r) => r.data),
};

export const productosApi = {
  /** Cuánta plata hay parada en el inventario. No sale de sumar la página. */
  valorInventario: () =>
    api.get<ValorInventario>("/productos/valor").then((r) => r.data),

  listar: (
    f: {
      q?: string;
      incluirInactivos?: boolean;
      soloInactivos?: boolean;
      /** Una categoría, o `"sin"` para los que nadie clasificó. */
      categoriaId?: string;
      pagina?: number;
    } = {},
  ) =>
    api
      .get<PaginaProductos>("/productos", {
        params: {
          q: f.q || undefined,
          incluirInactivos: f.incluirInactivos ? "true" : undefined,
          soloInactivos: f.soloInactivos ? "true" : undefined,
          categoriaId: f.categoriaId || undefined,
          pagina: f.pagina ?? 1,
          tamano: 50,
        },
      })
      .then((r) => r.data),

  porId: (id: string) => api.get<ProductoResumen>(`/productos/${id}`).then((r) => r.data),

  /**
   * Sube la imagen **directo al bucket**, sin pasar por la API: se pide una
   * URL firmada, se le hace `PUT` el archivo, y recién ahí se confirma la
   * llave. Una foto de tres megas por cada producto del catálogo ocuparía el
   * servidor para nada.
   */
  subirImagen: async (id: string, archivo: File) => {
    const { data } = await api.post<{ url: string; clave: string }>(
      `/productos/${id}/imagen/carga`,
      { tipoMime: archivo.type },
    );
    // `fetch` y no `api`: va al bucket, no a la API, y mandarle el token de
    // sesión a un tercero sería regalarlo.
    const subida = await fetch(data.url, {
      method: "PUT",
      body: archivo,
      headers: { "Content-Type": archivo.type },
    });
    if (!subida.ok) {
      throw new Error("No se pudo subir la imagen al almacenamiento.");
    }
    const { data: producto } = await api.put<ProductoResumen>(
      `/productos/${id}/imagen`,
      { clave: data.clave },
    );
    return producto;
  },

  quitarImagen: (id: string) =>
    api
      .delete<ProductoResumen>(`/productos/${id}/imagen`)
      .then((r) => r.data),

  crear: (datos: CrearProductoInput) =>
    api.post<ProductoResumen>("/productos", datos).then((r) => r.data),

  /**
   * Corrige lo que se puede corregir: nombre, unidad, tarifa de IVA y las dos
   * cuentas de venta. El código y la cuenta de inventario no viajan —el
   * backend los rechaza— y el precio va por su propio endpoint.
   */
  editar: (id: string, datos: EditarProductoInput) =>
    api.patch<ProductoResumen>(`/productos/${id}`, datos).then((r) => r.data),

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

  /**
   * Sin `costoUnitario`: una salida se valora al promedio vigente. Con
   * tratamiento: el faltante lo asume la empresa o lo paga alguien.
   */
  salidaAjuste: (
    productoId: string,
    datos: Omit<RegistrarMovimientoInput, "costoUnitario"> & {
      tratamientoFaltante: TratamientoFaltante;
      responsableTerceroId?: string;
    },
  ) =>
    api
      .post(`/productos/${productoId}/movimientos/salida-ajuste`, datos)
      .then((r) => r.data),
};

/** Las cuentas automáticas de inventario. */
export const configuracionApi = {
  obtener: () => api.get<InventarioConfiguracion>("/inventario/configuracion").then((r) => r.data),

  fijar: (concepto: ConceptoInventario, cuentaId: string) =>
    api
      .put<InventarioConfiguracion>(`/inventario/configuracion/${concepto}`, { cuentaId })
      .then((r) => r.data),

  /** Crea las cuentas que falten y las asigna. Idempotente. */
  preparar: () =>
    api
      .post<{ cuentasCreadas: string[] }>("/inventario/configuracion/preparar")
      .then((r) => r.data),
};

/**
 * Lo que se vendió sin tener. La ruta vive en ventas —es ventas quien lo
 * escribe— pero se consulta desde inventario, que es donde importa: es la
 * lista de qué hay que comprar.
 */
export const faltantesApi = {
  listar: (f: { soloPendientes?: boolean; pagina?: number } = {}) =>
    api
      .get<PaginaFaltantes>("/faltantes", {
        params: {
          soloPendientes: f.soloPendientes ? "true" : undefined,
          pagina: f.pagina ?? 1,
          tamano: 50,
        },
      })
      .then((r) => r.data),
};
