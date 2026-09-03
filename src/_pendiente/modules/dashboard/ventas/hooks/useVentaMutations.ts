"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { aviso } from "@/lib/avisos";
import { mensajeDeError } from "@/core/api/api";
import { ventasService } from "../services/ventas.service";
import type { NuevaVentaPayload } from "../types/ventas.types";

/**
 * Un 422 es una regla del negocio que el usuario puede resolver —el período
 * está cerrado, falta una firma, no alcanza el stock— y por eso se avisa como
 * advertencia y no como error: no se rompió nada, falta un paso.
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

/** Una venta mueve stock y asienta: hay que refrescar los tres módulos. */
function invalidarTodoLoQueTocaUnaVenta(cliente: ReturnType<typeof useQueryClient>) {
  cliente.invalidateQueries({ queryKey: ["ventas"] });
  cliente.invalidateQueries({ queryKey: ["productos"] });
  cliente.invalidateQueries({ queryKey: ["asientos"] });
  cliente.invalidateQueries({ queryKey: ["dashboard"] });
}

export const useCrearVenta = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NuevaVentaPayload) => ventasService.crear(data),
    onSuccess: () => {
      invalidarTodoLoQueTocaUnaVenta(queryClient);
      aviso.exito("Venta registrada");
    },
    onError: (error) => notificarError(error, "No se pudo registrar la venta"),
  });
};

export const useAnularVenta = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      ventasService.anular(id, motivo),
    onSuccess: () => {
      invalidarTodoLoQueTocaUnaVenta(queryClient);
      aviso.exito("Venta anulada: el stock volvió y los asientos quedaron reversados");
    },
    onError: (error) => notificarError(error, "No se pudo anular la venta"),
  });
};

export const useFacturarVenta = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ventaId: string) => ventasService.facturar(ventaId),
    onSuccess: (factura) => {
      queryClient.invalidateQueries({ queryKey: ["ventas"] });
      queryClient.invalidateQueries({ queryKey: ["facturas"] });
      aviso.exito(`Factura ${factura.numero} emitida`);
    },
    onError: (error) => notificarError(error, "No se pudo emitir la factura"),
  });
};

/** Solo DIRECTOR. Es una firma sobre un dato, no un permiso de pantalla. */
export const useAutorizarPrecio = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ventaDetalleId: string) => ventasService.autorizarPrecio(ventaDetalleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ventas"] });
      aviso.exito("Precio autorizado");
    },
    onError: (error) => notificarError(error, "No se pudo autorizar el precio"),
  });
};
