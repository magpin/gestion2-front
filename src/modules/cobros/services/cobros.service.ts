import { api } from "@/core/api/api";
import type {
  AnticipoCliente,
  CrearCruceInput,
  CruceCartera,
  SaldoAFavor,
  Cartera,
  CrearReciboCajaInput,
  FacturaPorCobrar,
  ReciboCaja,
} from "../types/cobros.types";

export const cobrosApi = {
  porCobrar: () => api.get<Cartera>("/cartera/por-cobrar").then((r) => r.data),

  facturasDe: (terceroId: string) =>
    api
      .get<FacturaPorCobrar[]>(`/cartera/clientes/${terceroId}/facturas`)
      .then((r) => r.data),

  recibos: () => api.get<ReciboCaja[]>("/recibos-caja").then((r) => r.data),

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

  crearCruce: (datos: CrearCruceInput) =>
    api.post<CruceCartera>("/cartera/cruces", datos).then((r) => r.data),

  anularCruce: (id: string, motivo: string) =>
    api.post<CruceCartera>(`/cartera/cruces/${id}/anular`, { motivo }).then((r) => r.data),
};
