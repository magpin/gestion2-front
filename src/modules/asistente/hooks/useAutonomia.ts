"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/core/api/api";
import { useAuthStore } from "@/core/store/authStore";
import type {
  AccionAutonoma,
  EstadoAutonomia,
  ModoRegla,
  ResumenDelDia,
} from "../types/autonomia.types";

const CLAVE = ["conversacion", "autonomia"] as const;

/** Los endpoints de `/conversacion/autonomia` (paso 8). */
export const autonomiaService = {
  estado: () => api.get<EstadoAutonomia>("/conversacion/autonomia").then((r) => r.data),
  resumen: () =>
    api.get<ResumenDelDia>("/conversacion/autonomia/resumen").then((r) => r.data),
  cambiarRegla: (accion: AccionAutonoma, modo: ModoRegla, limite?: number) =>
    api
      .post<EstadoAutonomia>("/conversacion/autonomia/reglas", {
        accion,
        modo,
        ...(modo === "CONFIRMAR_SI_PASA" ? { limite } : {}),
      })
      .then((r) => r.data),
  pausar: (pausada: boolean) =>
    api
      .post<EstadoAutonomia>("/conversacion/autonomia/pausa", { pausada })
      .then((r) => r.data),
};

export const useEstadoAutonomia = () => {
  const operando = useAuthStore((s) => s.operando);
  return useQuery({ queryKey: CLAVE, queryFn: autonomiaService.estado, enabled: operando });
};

/** Lo que el asistente hizo solo hoy. Se relee con cada conversación que cambia. */
export const useResumenDelDia = (activo = true) => {
  const operando = useAuthStore((s) => s.operando);
  return useQuery({
    queryKey: [...CLAVE, "resumen"],
    queryFn: autonomiaService.resumen,
    enabled: operando && activo,
    meta: { silencioso: true },
  });
};

/** Cambiar una regla o pausar: el backend devuelve el estado nuevo. */
export const useCambiarAutonomia = () => {
  const queryClient = useQueryClient();
  const guardar = (estado: EstadoAutonomia) => queryClient.setQueryData(CLAVE, estado);
  const regla = useMutation({
    mutationFn: (e: { accion: AccionAutonoma; modo: ModoRegla; limite?: number }) =>
      autonomiaService.cambiarRegla(e.accion, e.modo, e.limite),
    onSuccess: guardar,
  });
  const pausa = useMutation({
    mutationFn: (pausada: boolean) => autonomiaService.pausar(pausada),
    onSuccess: guardar,
  });
  return { regla, pausa };
};
