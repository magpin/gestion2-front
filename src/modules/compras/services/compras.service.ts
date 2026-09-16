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
} from "../types/compras.types";

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

  crear: (datos: CrearCompraInput) =>
    api.post<CompraDocumentoDetalle>("/compras", datos).then((r) => r.data),

  /** No borra: anula el asiento y marca el documento, junto. */
  anular: (id: string, motivo: string) =>
    api.post(`/compras/${id}/anular`, { motivo }).then(() => undefined),

  /** Paga por caja o por banco, total o parcialmente — el concepto lo arma el backend. */
  pagar: (id: string, datos: PagarInput) =>
    api
      .post<CompraDocumentoResumen>(`/compras/${id}/pagar`, datos)
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
