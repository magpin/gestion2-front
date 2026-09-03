import { api } from "@/core/api/api";
import type { Paginado } from "@/core/types/pagination.types";
import type { Venta } from "@/modules/dashboard/ventas/types/ventas.types";
import type {
  ActualizarCotizacionPayload,
  ConvertirCotizacionPayload,
  Cotizacion,
  CotizacionDetalle,
  EstadoCotizacion,
  FiltrosCotizacion,
  NuevaCotizacionPayload,
} from "../types/cotizaciones.types";

/** Los `numeric` de Postgres llegan como string: se normalizan al entrar. */
function normalizarLinea(linea: CotizacionDetalle): CotizacionDetalle {
  return {
    ...linea,
    cantidad: Number(linea.cantidad),
    precioUnitario: Number(linea.precioUnitario),
    porcentajeIva: Number(linea.porcentajeIva),
    subtotal: Number(linea.subtotal),
  };
}

function normalizar(cotizacion: Cotizacion): Cotizacion {
  return {
    ...cotizacion,
    subtotal: Number(cotizacion.subtotal),
    iva: Number(cotizacion.iva),
    total: Number(cotizacion.total),
    detalles: cotizacion.detalles?.map(normalizarLinea),
  };
}

export const cotizacionesService = {
  obtenerTodas: (filtros?: FiltrosCotizacion) =>
    api
      .get<Paginado<Cotizacion>>("/cotizaciones", { params: filtros })
      .then((r) => ({ ...r.data, datos: r.data.datos.map(normalizar) })),

  obtenerPorId: (id: string) =>
    api.get<Cotizacion>(`/cotizaciones/${id}`).then((r) => normalizar(r.data)),

  crear: (data: NuevaCotizacionPayload) =>
    api.post<Cotizacion>("/cotizaciones", data).then((r) => normalizar(r.data)),

  /** Reemplaza las líneas enteras. Convertida, el backend lo rechaza. */
  actualizar: (id: string, data: ActualizarCotizacionPayload) =>
    api.patch<Cotizacion>(`/cotizaciones/${id}`, data).then((r) => normalizar(r.data)),

  /** ENVIADA · ACEPTADA · RECHAZADA. `VENCIDA` no se empuja: se deriva. */
  cambiarEstado: (id: string, estado: EstadoCotizacion) =>
    api
      .post<Cotizacion>(`/cotizaciones/${id}/estado`, { estado })
      .then((r) => normalizar(r.data)),

  /** Devuelve la VENTA que nació: la cotización queda con su `ventaId`. */
  convertir: (id: string, data: ConvertirCotizacionPayload = {}) =>
    api.post<Venta>(`/cotizaciones/${id}/convertir`, data).then((r) => r.data),
};
