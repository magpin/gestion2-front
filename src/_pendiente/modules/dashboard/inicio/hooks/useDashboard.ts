"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "../services/dashboard.service";
import type { PeriodoDashboard } from "../types/dashboard.types";

export const useGetDashboard = (periodo: PeriodoDashboard) => {
  return useQuery({
    queryKey: ["dashboard", periodo],
    queryFn: () => dashboardService.obtenerResumen(periodo),
    // Reason: el backend envuelve en { status, message, data } → exponemos solo data.
  });
};

export const useGetAlertas = () => {
  return useQuery({
    queryKey: ["dashboard", "alertas"],
    queryFn: () => dashboardService.obtenerAlertas(),
  });
};
