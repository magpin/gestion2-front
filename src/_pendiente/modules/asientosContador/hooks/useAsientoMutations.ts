"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { asientosService } from "../services/asientos.service";
import type { CrearAjustePayload } from "../types/asientos.types";
import { aviso } from "@/lib/avisos";

// Reason: 409/422 = conflicto/negocio (no balancea, período cerrado) → advertencia.
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

export const useCrearAjuste = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CrearAjustePayload) => asientosService.crearAjuste(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asientos"] });
      aviso.exito("Asiento de ajuste creado");
    },
    onError: (error) => notificarError(error, "No se pudo crear el asiento"),
  });
};

export const useAnularAsiento = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => asientosService.anular(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asientos"] });
      aviso.exito("Asiento anulado — contra-asiento generado");
    },
    onError: (error) => notificarError(error, "No se pudo anular el asiento"),
  });
};
