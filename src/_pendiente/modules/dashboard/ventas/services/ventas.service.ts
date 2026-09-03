import { api } from "@/core/api/api";
import type { Paginado } from "@/core/types/pagination.types";
import type {
  FiltrosVenta,
  LineaPendienteAutorizacion,
  NuevaVentaPayload,
  Venta,
  VentaDetalle,
} from "../types/ventas.types";

/** Los `numeric` de Postgres llegan como string: se normalizan al entrar. */
function normalizarLinea(linea: VentaDetalle): VentaDetalle {
  return {
    ...linea,
    cantidad: Number(linea.cantidad),
    precioUnitario: Number(linea.precioUnitario),
    costoUnitario: Number(linea.costoUnitario),
    precioPiso: Number(linea.precioPiso),
    porcentajeIva: Number(linea.porcentajeIva),
    subtotal: Number(linea.subtotal),
  };
}

function normalizar(venta: Venta): Venta {
  return {
    ...venta,
    subtotal: Number(venta.subtotal),
    iva: Number(venta.iva),
    retefuenteFavor: Number(venta.retefuenteFavor),
    costoTotal: Number(venta.costoTotal),
    total: Number(venta.total),
    saldoPendiente: Number(venta.saldoPendiente),
    detalles: venta.detalles?.map(normalizarLinea),
  };
}

export const ventasService = {
  obtenerTodas: (filtros?: FiltrosVenta) =>
    api
      .get<Paginado<Venta>>("/ventas", { params: filtros })
      .then((r) => ({ ...r.data, datos: r.data.datos.map(normalizar) })),

  /** Las ventas con saldo. Es el mismo listado con `soloPendientes`. */
  obtenerCartera: (filtros?: FiltrosVenta) =>
    api
      .get<Paginado<Venta>>("/ventas/cartera", { params: filtros })
      .then((r) => ({ ...r.data, datos: r.data.datos.map(normalizar) })),

  obtenerPorId: (id: string) =>
    api.get<Venta>(`/ventas/${id}`).then((r) => normalizar(r.data)),

  saldoCliente: (terceroId: string) =>
    api
      .get<{ terceroId: string; saldo: number }>(`/ventas/cliente/${terceroId}/saldo`)
      .then((r) => Number(r.data.saldo)),

  /** Evento A3: venta + salida de kardex + dos asientos, en una transacción. */
  crear: (data: NuevaVentaPayload) =>
    api.post<Venta>("/ventas", data).then((r) => normalizar(r.data)),

  anular: (id: string, motivo: string) =>
    api.post<Venta>(`/ventas/${id}/anular`, { motivo }).then((r) => normalizar(r.data)),

  /**
   * Emitir la factura. Es de `facturacion`, no de `ventas`: el número fiscal es
   * uno solo para el mostrador y para el taller. Congela la venta.
   */
  facturar: (ventaId: string) =>
    api
      .post<{ facturaId: string; numero: string; consecutivo: number }>("/facturas", {
        origenTipo: "VENTA",
        origenId: ventaId,
      })
      .then((r) => r.data),

  /**
   * Las facturas emitidas sobre ventas, para saber cuáles ya salieron.
   *
   * La venta no guarda su factura: la relación vive del lado de `facturacion`,
   * que es polimórfico y sirve también al taller. Se trae el conjunto y se
   * cruza en el navegador.
   */
  facturadas: () =>
    api
      .get<Paginado<{ id: string; origenId: string; numero: string }>>("/facturas", {
        params: { origenTipo: "VENTA", limite: 200 },
      })
      .then((r) => new Map(r.data.datos.map((f) => [f.origenId, f.numero]))),

  /** La bandeja de precios bajo el piso sin firmar. Leerla no es autorizarla. */
  pendientesDeAutorizacion: () =>
    api
      .get<LineaPendienteAutorizacion[]>("/autorizaciones/precios")
      .then((r) => r.data),

  /** Solo DIRECTOR. Escribe la firma; no cambia el precio ni los montos. */
  autorizarPrecio: (ventaDetalleId: string) =>
    api
      .post<VentaDetalle>(`/ventas/detalle/${ventaDetalleId}/autorizar`)
      .then((r) => normalizarLinea(r.data)),
};
