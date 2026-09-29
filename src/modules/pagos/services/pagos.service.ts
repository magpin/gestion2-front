import { api } from "@/core/api/api";
import type { PropuestaRenta } from "@/modules/retenciones/types/retenciones.types";
import type {
  AnticipoProveedor,
  ComprobanteEgreso,
  CompraPorPagar,
  CrearComprobanteEgresoInput,
  CrearCrucePagoInput,
  CrearPagoProgramadoInput,
  CrucePago,
  PagoProgramado,
  PorPagar,
} from "../types/pagos.types";

export const pagosApi = {
  porPagar: () => api.get<PorPagar>("/pagos/por-pagar").then((r) => r.data),

  comprasDe: (terceroId: string) =>
    api.get<CompraPorPagar[]>(`/pagos/proveedores/${terceroId}/compras`).then((r) => r.data),

  anticiposDe: (terceroId: string) =>
    api.get<AnticipoProveedor[]>(`/pagos/proveedores/${terceroId}/anticipos`).then((r) => r.data),

  comprobantes: () => api.get<ComprobanteEgreso[]>("/comprobantes-egreso").then((r) => r.data),

  /** Lo que el motor retendría al anticipo, sin guardar nada. */
  retencionAnticipo: (datos: { terceroId: string; fecha: string; base: number; conceptoCodigo?: string }) =>
    api
      .get<PropuestaRenta>("/comprobantes-egreso/retencion-anticipo", { params: datos })
      .then((r) => r.data),

  crearComprobante: (datos: CrearComprobanteEgresoInput) =>
    api.post<ComprobanteEgreso>("/comprobantes-egreso", datos).then((r) => r.data),

  anularComprobante: (id: string, motivo: string) =>
    api.post<ComprobanteEgreso>(`/comprobantes-egreso/${id}/anular`, { motivo }).then((r) => r.data),

  cruces: () => api.get<CrucePago[]>("/pagos/cruces").then((r) => r.data),

  crearCruce: (datos: CrearCrucePagoInput) =>
    api.post<CrucePago>("/pagos/cruces", datos).then((r) => r.data),

  anularCruce: (id: string, motivo: string) =>
    api.post<CrucePago>(`/pagos/cruces/${id}/anular`, { motivo }).then((r) => r.data),

  programados: (todos = false) =>
    api
      .get<PagoProgramado[]>("/pagos/programados", { params: todos ? { todos: "true" } : {} })
      .then((r) => r.data),

  crearProgramado: (datos: CrearPagoProgramadoInput) =>
    api.post<PagoProgramado>("/pagos/programados", datos).then((r) => r.data),

  marcarPagado: (id: string) =>
    api.post<PagoProgramado>(`/pagos/programados/${id}/pagado`, {}).then((r) => r.data),

  cancelarProgramado: (id: string) =>
    api.post<PagoProgramado>(`/pagos/programados/${id}/cancelar`, {}).then((r) => r.data),
};
