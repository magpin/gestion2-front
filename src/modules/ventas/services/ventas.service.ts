import { api } from "@/core/api/api";
import type {
  CobrarInput,
  ConvertirCotizacionInput,
  CrearCotizacionInput,
  CrearFacturaInput,
  CrearNotaCreditoInput,
  CrearNotaDebitoInput,
  FiltroVentas,
  PaginaVentas,
  VentaDocumentoDetalle,
  VentaDocumentoResumen,
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

  /**
   * Corrige una cotización vigente. Se manda completa —cliente, fecha y
   * líneas—, no un parche: el backend reemplaza lo que había.
   */
  editar: (id: string, datos: CrearCotizacionInput) =>
    api
      .put<VentaDocumentoDetalle>(`/cotizaciones/${id}`, datos)
      .then((r) => r.data),

  /** La descarta con motivo. No borra: el número queda con su explicación. */
  descartar: (id: string, motivo: string) =>
    api.post(`/cotizaciones/${id}/anular`, { motivo }).then(() => undefined),
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

  /** Cobra por caja o por banco, total o parcialmente — el concepto lo arma el backend. */
  cobrar: (id: string, datos: CobrarInput) =>
    api
      .post<VentaDocumentoResumen>(`/facturas/${id}/cobrar`, datos)
      .then((r) => r.data),
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

/**
 * Notas débito: le cobran más al cliente sobre una factura que ya existe —un
 * flete, un interés de mora, un mayor valor facturado de menos—. No copian
 * las líneas de la factura: cada línea es un concepto nuevo con su precio
 * digitado. Tampoco tocan el kardex: no sale ni entra mercancía.
 */
export const notasDebitoApi = {
  listar: (f: FiltroVentas = {}) =>
    api
      .get<PaginaVentas>("/notas-debito", { params: parametros(f) })
      .then((r) => r.data),

  porId: (id: string) =>
    api.get<VentaDocumentoDetalle>(`/notas-debito/${id}`).then((r) => r.data),

  crear: (datos: CrearNotaDebitoInput) =>
    api.post<VentaDocumentoDetalle>("/notas-debito", datos).then((r) => r.data),

  anular: (id: string, motivo: string) =>
    api.post(`/notas-debito/${id}/anular`, { motivo }).then(() => undefined),
};
