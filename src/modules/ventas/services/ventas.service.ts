import { api } from "@/core/api/api";
import type {
  ConvertirCotizacionInput,
  CrearCotizacionInput,
  CrearFacturaInput,
  CrearNotaCreditoInput,
  FiltroVentas,
  PaginaVentas,
  VentaDocumentoDetalle,
} from "../types/ventas.types";

const parametros = (f: FiltroVentas) => ({
  terceroId: f.terceroId || undefined,
  pagina: f.pagina ?? 1,
  tamano: 50,
});

/**
 * Cotizaciones. No asientan ni mueven inventario — el precio de cada línea
 * es siempre el de lista vigente del producto, nunca uno negociado en el
 * documento.
 */
export const cotizacionesApi = {
  listar: (f: FiltroVentas = {}) =>
    api
      .get<PaginaVentas>("/cotizaciones", { params: parametros(f) })
      .then((r) => r.data),

  porId: (id: string) =>
    api.get<VentaDocumentoDetalle>(`/cotizaciones/${id}`).then((r) => r.data),

  crear: (datos: CrearCotizacionInput) =>
    api
      .post<VentaDocumentoDetalle>("/cotizaciones", datos)
      .then((r) => r.data),
};

/**
 * Facturas de venta. Al crearse: numeran contra la resolución DIAN, asientan
 * y descuentan el kardex — todo en el backend, de un solo golpe.
 */
export const facturasApi = {
  listar: (f: FiltroVentas = {}) =>
    api
      .get<PaginaVentas>("/facturas", { params: parametros(f) })
      .then((r) => r.data),

  porId: (id: string) =>
    api.get<VentaDocumentoDetalle>(`/facturas/${id}`).then((r) => r.data),

  crear: (datos: CrearFacturaInput) =>
    api.post<VentaDocumentoDetalle>("/facturas", datos).then((r) => r.data),

  /** El cliente y las líneas salen de la cotización; acá solo va la fecha. */
  convertirCotizacion: (cotizacionId: string, datos: ConvertirCotizacionInput) =>
    api
      .post<VentaDocumentoDetalle>(
        `/facturas/desde-cotizacion/${cotizacionId}`,
        datos,
      )
      .then((r) => r.data),

  /** No borra: anula el asiento y marca el documento, junto. */
  anular: (id: string, motivo: string) =>
    api.post(`/facturas/${id}/anular`, { motivo }).then(() => undefined),
};

/**
 * Notas crédito. Reversan una factura EMITIDA completa — este corte no
 * negocia cantidades parciales. El kardex no se toca: si la mercancía
 * vuelve a bodega, se registra aparte como ajuste de inventario.
 */
export const notasCreditoApi = {
  listar: (f: FiltroVentas = {}) =>
    api
      .get<PaginaVentas>("/notas-credito", { params: parametros(f) })
      .then((r) => r.data),

  porId: (id: string) =>
    api
      .get<VentaDocumentoDetalle>(`/notas-credito/${id}`)
      .then((r) => r.data),

  crear: (datos: CrearNotaCreditoInput) =>
    api
      .post<VentaDocumentoDetalle>("/notas-credito", datos)
      .then((r) => r.data),

  anular: (id: string, motivo: string) =>
    api.post(`/notas-credito/${id}/anular`, { motivo }).then(() => undefined),
};
