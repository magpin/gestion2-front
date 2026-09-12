import { api } from "@/core/api/api";
import type {
  CompraDocumentoDetalle,
  CompraDocumentoResumen,
  CrearCompraInput,
  FiltroCompras,
  PagarEfectivoInput,
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

  /** Paga en efectivo, total o parcialmente — el concepto lo arma el backend. */
  pagarEfectivo: (id: string, datos: PagarEfectivoInput) =>
    api
      .post<CompraDocumentoResumen>(`/compras/${id}/pagar-efectivo`, datos)
      .then((r) => r.data),
};
