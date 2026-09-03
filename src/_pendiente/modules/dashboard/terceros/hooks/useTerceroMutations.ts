"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tercerosService } from "../services/terceros.service";
import { mensajeDeError, restriccionRota } from "@/core/api/api";
import type {
  ActualizarTerceroPayload,
  CrearTerceroPayload,
} from "../types/terceros.types";
import { aviso } from "@/lib/avisos";

/**
 * El backend manda `constraint` cuando la que se rompió fue una regla de base.
 * Eso permite decir qué pasó en vez de «error inesperado».
 */
function notificarError(error: unknown, fallback: string) {
  const status = (error as { response?: { status?: number } })?.response?.status;

  if (restriccionRota(error) === "uk_tercero_documento") {
    aviso.advertencia("Ya existe un tercero con ese tipo y número de documento.");
    return;
  }
  const mensaje = mensajeDeError(error) || fallback;
  if (status === 409 || status === 422 || status === 400) {
    aviso.advertencia(mensaje);
  } else {
    aviso.error(mensaje);
  }
}

export const useCreateTercero = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CrearTerceroPayload) => tercerosService.crear(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["terceros"] });
      aviso.exito("Tercero creado");
    },
    onError: (error) => notificarError(error, "No se pudo crear el tercero"),
  });
};

export const useUpdateTercero = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ActualizarTerceroPayload) => tercerosService.actualizar(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["terceros"] });
      aviso.exito("Tercero actualizado");
    },
    onError: (error) => notificarError(error, "No se pudo actualizar el tercero"),
  });
};

/**
 * Desactiva, no borra: hay ventas, compras y órdenes de trabajo apuntando.
 * Solo el DIRECTOR puede hacerlo — el backend responde 403 a los demás.
 */
export const useDesactivarTercero = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tercerosService.desactivar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["terceros"] });
      aviso.exito("Tercero desactivado");
    },
    onError: (error) => notificarError(error, "No se pudo desactivar el tercero"),
  });
};
