import { api } from "@/core/api/api";
import type {
  AlertaDashboard,
  DashboardResumen,
  PeriodoDashboard,
} from "../types/dashboard.types";

export const dashboardService = {
  obtenerResumen: (periodo: PeriodoDashboard) =>
    api
      .get<DashboardResumen>("/dashboard", { params: { periodo } })
      .then((r) => r.data),

  obtenerAlertas: () =>
    api.get<AlertaDashboard[]>("/dashboard/alertas").then((r) => r.data),
};
