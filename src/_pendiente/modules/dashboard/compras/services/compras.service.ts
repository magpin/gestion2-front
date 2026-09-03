import { api } from "@/core/api/api";
import type { Paginado } from "@/core/types/pagination.types";
import type {
  Compra,
  CompraDetalle,
  FiltrosCompra,
  NuevaCompraPayload,
} from "../types/compras.types";

/** Los `numeric` de Postgres llegan como string: se normalizan al entrar. */
function normalizarLinea(linea: CompraDetalle): CompraDetalle {
  return {
    ...linea,
    cantidad: Number(linea.cantidad),
    costoUnitario: Number(linea.costoUnitario),
    porcentajeIva: Number(linea.porcentajeIva),
    subtotal: Number(linea.subtotal),
  };
}

function normalizar(compra: Compra): Compra {
  return {
    ...compra,
    subtotal: Number(compra.subtotal),
    iva: Number(compra.iva),
    retefuente: Number(compra.retefuente),
    total: Number(compra.total),
    saldoPendiente: Number(compra.saldoPendiente),
    detalles: compra.detalles?.map(normalizarLinea),
  };
}

export const comprasService = {
  obtenerTodas: (filtros?: FiltrosCompra) =>
    api
      .get<Paginado<Compra>>("/compras", { params: filtros })
      .then((r) => ({ ...r.data, datos: r.data.datos.map(normalizar) })),

  /** Las compras con saldo. Es el mismo listado con `soloPendientes`. */
  obtenerCartera: (filtros?: FiltrosCompra) =>
    api
      .get<Paginado<Compra>>("/compras/cartera", { params: filtros })
      .then((r) => ({ ...r.data, datos: r.data.datos.map(normalizar) })),

  obtenerPorId: (id: string) =>
    api.get<Compra>(`/compras/${id}`).then((r) => normalizar(r.data)),

  saldoProveedor: (terceroId: string) =>
    api
      .get<{ terceroId: string; saldo: number }>(`/compras/proveedor/${terceroId}/saldo`)
      .then((r) => Number(r.data.saldo)),

  /** Evento A1: compra + entrada de kardex + asiento, en una transacción. */
  crear: (data: NuevaCompraPayload) =>
    api.post<Compra>("/compras", data).then((r) => normalizar(r.data)),

  /** Exige motivo de al menos 5 caracteres: lo valida el backend. */
  anular: (id: string, motivo: string) =>
    api.post<Compra>(`/compras/${id}/anular`, { motivo }).then((r) => normalizar(r.data)),
};
