import { api } from "@/core/api/api";
import type {
  DetalleAnticipo,
  AnticipoCliente,
  CrearCruceInput,
  CruceCartera,
  SaldoAFavor,
  Cartera,
  CrearReciboCajaInput,
  FacturaPorCobrar,
  ReciboCaja,
} from "../types/cobros.types";
import type { AnticiposDeClientes, DatosDevolucion, SaldosAFavor } from "@/modules/tesoreria/types/anticipos.types";
import type { ResumenDelMes } from "@/modules/tesoreria/types/resumen.types";

export const cobrosApi = {
  porCobrar: () => api.get<Cartera>("/cartera/por-cobrar").then((r) => r.data),

  facturasDe: (terceroId: string) =>
    api
      .get<FacturaPorCobrar[]>(`/cartera/clientes/${terceroId}/facturas`)
      .then((r) => r.data),

  /** Con mes («2026-09»), los del mes completos; sin mes, los últimos 200. */
  recibos: (mes?: string) => api.get<ReciboCaja[]>("/recibos-caja", { params: { mes } }).then((r) => r.data),

  /** Lo cobrado en el mes por cada caja y cuenta. */
  resumenRecibos: (mes: string) =>
    api.get<ResumenDelMes>("/recibos-caja/resumen", { params: { mes } }).then((r) => r.data),

  crearRecibo: (datos: CrearReciboCajaInput) =>
    api.post<ReciboCaja>("/recibos-caja", datos).then((r) => r.data),

  anularRecibo: (id: string, motivo: string) =>
    api.post<ReciboCaja>(`/recibos-caja/${id}/anular`, { motivo }).then((r) => r.data),

  /** Lo que el cliente tiene para aplicar: anticipos con saldo y saldos a favor. */
  disponibles: (terceroId: string) =>
    api
      .get<{ anticipos: AnticipoCliente[]; saldosAFavor: SaldoAFavor[] }>(
        `/cartera/clientes/${terceroId}/disponibles`,
      )
      .then((r) => r.data),

  cruces: () => api.get<CruceCartera[]>("/cartera/cruces").then((r) => r.data),

  /** Lo que les quedó a favor a los clientes (E1). */
  saldosAFavor: () => api.get<SaldosAFavor>("/cartera/saldos-a-favor").then((r) => r.data),

  /** Un anticipo con sus productos, para facturarlo. */
  anticipo: (id: string) => api.get<DetalleAnticipo>(`/cartera/anticipos/${id}`).then((r) => r.data),

  /** Los anticipos de todos los clientes con algo por aplicar (PC19). */
  anticipos: () => api.get<AnticiposDeClientes>("/cartera/anticipos").then((r) => r.data),

  devolverAnticipo: (id: string, datos: DatosDevolucion) =>
    api.post(`/cartera/anticipos/${id}/devolver`, datos).then((r) => r.data),

  anularDevolucion: (id: string, motivo: string) =>
    api.post(`/cartera/anticipos/devoluciones/${id}/anular`, { motivo }).then((r) => r.data),

  crearCruce: (datos: CrearCruceInput) =>
    api.post<CruceCartera>("/cartera/cruces", datos).then((r) => r.data),

  anularCruce: (id: string, motivo: string) =>
    api.post<CruceCartera>(`/cartera/cruces/${id}/anular`, { motivo }).then((r) => r.data),
};
