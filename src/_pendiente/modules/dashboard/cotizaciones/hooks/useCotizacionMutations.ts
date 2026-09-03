"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { aviso } from "@/lib/avisos";
import { mensajeDeError } from "@/core/api/api";
import { cotizacionesService } from "../services/cotizaciones.service";
import type {
  ActualizarCotizacionPayload,
  ConvertirCotizacionPayload,
  EstadoCotizacion,
  NuevaCotizacionPayload,
} from "../types/cotizaciones.types";

/**
 * 409 y 422 son reglas del negocio que el usuario puede resolver —la cotización
 * ya se convirtió, venció, o una línea no tiene producto del catálogo—, así que
 * se avisan como advertencia: no se rompió nada, falta un paso.
 */
function notificarError(error: unknown, respaldo: string) {
  const status = (error as { response?: { status?: number } })?.response?.status;
  const mensaje = mensajeDeError(error) || respaldo;
  if (status === 422 || status === 409) {
    aviso.advertencia(mensaje);
  } else {
    aviso.error(mensaje);
  }
}

export const useCrearCotizacion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NuevaCotizacionPayload) => cotizacionesService.crear(data),
    onSuccess: (cotizacion) => {
      queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
      aviso.exito(`Cotización ${cotizacion.numero} creada`);
    },
    onError: (error) => notificarError(error, "No se pudo crear la cotización"),
  });
};

export const useActualizarCotizacion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ActualizarCotizacionPayload }) =>
      cotizacionesService.actualizar(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
      aviso.exito("Cotización actualizada");
    },
    onError: (error) => notificarError(error, "No se pudo actualizar la cotización"),
  });
};

export const useCambiarEstadoCotizacion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: EstadoCotizacion }) =>
      cotizacionesService.cambiarEstado(id, estado),
    onSuccess: (cotizacion) => {
      queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
      aviso.exito(`Cotización ${cotizacion.numero}: ${cotizacion.estado.toLowerCase()}`);
    },
    onError: (error) => notificarError(error, "No se pudo cambiar el estado"),
  });
};

/**
 * Convertir nace una venta: mueve kardex y deja dos asientos. Por eso invalida
 * también productos y asientos, no solo cotizaciones.
 */
export const useConvertirCotizacion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: ConvertirCotizacionPayload }) =>
      cotizacionesService.convertir(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
      queryClient.invalidateQueries({ queryKey: ["ventas"] });
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      queryClient.invalidateQueries({ queryKey: ["asientos"] });
      aviso.exito("Cotización convertida en venta");
    },
    onError: (error) => notificarError(error, "No se pudo convertir la cotización"),
  });
};
