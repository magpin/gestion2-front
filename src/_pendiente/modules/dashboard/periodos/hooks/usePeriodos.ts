"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { periodosService } from "../services/periodos.service";
import type { CreatePeriodoPayload } from "../types/periodos.types";
import { aviso } from "@/lib/avisos";

// Reason: 409/422 = conflicto/negocio (período con asientos, ya cerrado) → advertencia.
function notificarError(error: unknown, fallback: string) {
  const status = (error as { response?: { status?: number } })?.response?.status;
  const mensaje =
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
  if (status === 409 || status === 422) {
    aviso.advertencia(mensaje);
  } else {
    aviso.error(mensaje);
  }
}

export const useGetPeriodos = () => {
  return useQuery({
    queryKey: ["periodos"],
    queryFn: () => periodosService.obtenerTodos(),
  });
};

export const useCreatePeriodo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePeriodoPayload) => periodosService.crear(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periodos"] });
      aviso.exito("Período contable creado");
    },
    onError: (error) => notificarError(error, "No se pudo crear el período"),
  });
};

export const useCerrarPeriodo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => periodosService.cerrar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periodos"] });
      aviso.exito("Período cerrado");
    },
    onError: (error) => notificarError(error, "No se pudo cerrar el período"),
  });
};

export const useReabrirPeriodo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => periodosService.reabrir(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periodos"] });
      aviso.exito("Período reabierto");
    },
    onError: (error) => notificarError(error, "No se pudo reabrir el período"),
  });
};
