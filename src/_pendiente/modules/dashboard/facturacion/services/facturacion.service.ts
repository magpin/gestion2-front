import { api } from "@/core/api/api";
import type { Paginado } from "@/core/types/pagination.types";
import type {
  EmitirFacturaPayload,
  Factura,
  FacturaImpresa,
  FiltrosFactura,
  FiltrosNotaCredito,
  NotaCredito,
  NotaCreditoDetalle,
  NuevaNotaCreditoPayload,
} from "../types/facturacion.types";

/** Los `numeric` de Postgres llegan como string: se normalizan al entrar. */
function normalizarRenglon(linea: NotaCreditoDetalle): NotaCreditoDetalle {
  return {
    ...linea,
    cantidad: Number(linea.cantidad),
    precioUnitario: Number(linea.precioUnitario),
    costoUnitario: Number(linea.costoUnitario),
    porcentajeIva: Number(linea.porcentajeIva),
    subtotal: Number(linea.subtotal),
  };
}

function normalizarNota(nota: NotaCredito): NotaCredito {
  return {
    ...nota,
    subtotal: Number(nota.subtotal),
    iva: Number(nota.iva),
    total: Number(nota.total),
    detalles: nota.detalles?.map(normalizarRenglon),
  };
}

function normalizarImpresa(impresa: FacturaImpresa): FacturaImpresa {
  return {
    ...impresa,
    subtotal: Number(impresa.subtotal),
    iva: Number(impresa.iva),
    total: Number(impresa.total),
    renglones: impresa.renglones.map((renglon) => ({
      ...renglon,
      cantidad: Number(renglon.cantidad),
      precioUnitario: Number(renglon.precioUnitario),
      porcentajeIva: Number(renglon.porcentajeIva),
      subtotal: Number(renglon.subtotal),
      costoUnitario:
        renglon.costoUnitario === undefined ? undefined : Number(renglon.costoUnitario),
    })),
  };
}

export const facturacionService = {
  facturas: (filtros?: FiltrosFactura) =>
    api.get<Paginado<Factura>>("/facturas", { params: filtros }).then((r) => r.data),

  factura: (id: string) => api.get<Factura>(`/facturas/${id}`).then((r) => r.data),

  /** El impreso: encabezado de la factura y renglones leídos del origen. */
  impresion: (id: string) =>
    api
      .get<FacturaImpresa>(`/facturas/${id}/impresion`)
      .then((r) => normalizarImpresa(r.data)),

  /** Toma el consecutivo y congela el origen: desde ahí deja de editarse. */
  emitir: (data: EmitirFacturaPayload) =>
    api.post<Factura>("/facturas", data).then((r) => r.data),

  notas: (filtros?: FiltrosNotaCredito) =>
    api
      .get<Paginado<NotaCredito>>("/notas-credito", { params: filtros })
      .then((r) => ({ ...r.data, datos: r.data.datos.map(normalizarNota) })),

  nota: (id: string) =>
    api.get<NotaCredito>(`/notas-credito/${id}`).then((r) => normalizarNota(r.data)),

  /** Evento A7. La única forma de corregir una factura ya entregada. */
  emitirNota: (data: NuevaNotaCreditoPayload) =>
    api.post<NotaCredito>("/notas-credito", data).then((r) => normalizarNota(r.data)),
};
