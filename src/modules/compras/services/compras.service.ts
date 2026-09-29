import { api } from "@/core/api/api";
import type {
  CompraDocumentoDetalle,
  CompraDocumentoResumen,
  CrearCompraInput,
  CrearNotaCreditoCompraInput,
  CrearNotaDebitoCompraInput,
  FiltroCompras,
  PagarInput,
  PaginaCompras,
  CompraPrevia,
  NumeracionSoporte,
} from "../types/compras.types";
import type { PropuestaRenta } from "@/modules/retenciones/types/retenciones.types";

/**
 * Facturas de compra. Al crearse: asientan y aumentan el kardex, todo en el
 * backend de un solo golpe — el costo de cada línea es el que dice la
 * factura del proveedor, no un precio de catálogo.
 */
export const comprasApi = {
  listar: (f: FiltroCompras = {}) =>
    api
      .get<PaginaCompras>("/compras", {
        params: {
          terceroId: f.terceroId || undefined,
          pagina: f.pagina ?? 1,
          tamano: 50,
        },
      })
      .then((r) => r.data),

  porId: (id: string) =>
    api.get<CompraDocumentoDetalle>(`/compras/${id}`).then((r) => r.data),

  /** Cómo quedaría en el libro, sin guardar nada. */
  previo: (datos: CrearCompraInput) => api.post<CompraPrevia>("/compras/previo", datos).then((r) => r.data),

  /** El siguiente número del documento soporte; `null` si no hay resolución. */
  numeracionSoporte: () => api.get<NumeracionSoporte | null>("/compras/soporte/numeracion").then((r) => r.data),

  crear: (datos: CrearCompraInput) =>
    api.post<CompraDocumentoDetalle>("/compras", datos).then((r) => r.data),

  /** La retención de renta que llevaría la compra, sin registrar nada. */
  simularRetencion: (
    datos: Pick<CrearCompraInput, "terceroId" | "fecha" | "lineas" | "conceptosRenta" | "pagadaConTarjeta" | "municipioCodigo">,
  ) =>
    api
      .post<PropuestaRenta>("/compras/simular-retencion", datos)
      .then((r) => r.data),

  /** No borra: anula el asiento y marca el documento, junto. */
  anular: (id: string, motivo: string) =>
    api.post(`/compras/${id}/anular`, { motivo }).then(() => undefined),

  /** Paga por caja o por banco, total o parcialmente — el concepto lo arma el backend. */
  pagar: (id: string, datos: PagarInput) =>
    api
      .post<CompraDocumentoResumen>(`/compras/${id}/pagar`, datos)
      .then((r) => r.data),

  /**
   * El proveedor nos devuelve plata sobre una compra que sigue valiendo lo
   * mismo: entra a la caja o al banco. Espejo de `facturasApi.devolverCobro`.
   */
  devolverPago: (id: string, datos: PagarInput) =>
    api
      .post<CompraDocumentoResumen>(`/compras/${id}/devolver-pago`, datos)
      .then((r) => r.data),
};

/**
 * Las notas del proveedor. Viven en la misma tabla que las facturas de compra
 * —de ahí que el detalle salga por `comprasApi.porId`, que no filtra por
 * tipo—, pero se listan y se crean por rutas propias: `/compras` sin más
 * devuelve solo facturas, para que la lista siga respondiendo "cuánto le debo
 * a este proveedor" de un vistazo.
 *
 * Ninguna de las dos toca el kardex: si la mercancía vuelve al proveedor, eso
 * se registra aparte como ajuste de inventario.
 */
export const notasCompraApi = {
  listarCredito: (f: FiltroCompras = {}) =>
    api
      .get<PaginaCompras>("/compras/notas/credito", {
        params: {
          terceroId: f.terceroId || undefined,
          pagina: f.pagina ?? 1,
          tamano: 50,
        },
      })
      .then((r) => r.data),

  listarDebito: (f: FiltroCompras = {}) =>
    api
      .get<PaginaCompras>("/compras/notas/debito", {
        params: {
          terceroId: f.terceroId || undefined,
          pagina: f.pagina ?? 1,
          tamano: 50,
        },
      })
      .then((r) => r.data),

  crearCredito: (datos: CrearNotaCreditoCompraInput) =>
    api
      .post<CompraDocumentoDetalle>("/compras/notas/credito", datos)
      .then((r) => r.data),

  crearDebito: (datos: CrearNotaDebitoCompraInput) =>
    api
      .post<CompraDocumentoDetalle>("/compras/notas/debito", datos)
      .then((r) => r.data),

  anular: (id: string, motivo: string) =>
    api.post(`/compras/notas/${id}/anular`, { motivo }).then(() => undefined),
};
