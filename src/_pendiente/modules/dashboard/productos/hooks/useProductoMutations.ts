"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { productosService } from "../services/productos.service";
import { mensajeDeError, restriccionRota } from "@/core/api/api";
import type {
  ActualizarProductoPayload,
  AjustePayload,
  CrearProductoPayload,
} from "../types/productos.types";
import { aviso } from "@/lib/avisos";

function notificarError(error: unknown, fallback: string) {
  const status = (error as { response?: { status?: number } })?.response?.status;

  if (restriccionRota(error) === "uk_producto_codigo") {
    aviso.advertencia("Ya existe un producto con ese código.");
    return;
  }
  const mensaje = mensajeDeError(error) || fallback;
  if (status === 409 || status === 422 || status === 400) {
    aviso.advertencia(mensaje);
  } else {
    aviso.error(mensaje);
  }
}

export const useCreateProducto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CrearProductoPayload) => productosService.crear(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      aviso.exito("Producto creado");
    },
    onError: (error) => notificarError(error, "No se pudo crear el producto"),
  });
};

export const useUpdateProducto = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ActualizarProductoPayload) => productosService.actualizar(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      aviso.exito("Producto actualizado");
    },
    onError: (error) => notificarError(error, "No se pudo actualizar el producto"),
  });
};

/** Desactiva: hay compras, ventas y órdenes de trabajo apuntando. */
export const useDesactivarProducto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productosService.desactivar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      aviso.exito("Producto desactivado");
    },
    onError: (error) => notificarError(error, "No se pudo desactivar el producto"),
  });
};

/**
 * Evento A5 · ajuste por conteo físico.
 *
 * Es el único movimiento de stock sin documento que lo respalde, y por eso el
 * motivo es obligatorio: un ajuste sin explicación es un faltante escondido.
 */
export const useAjustarInventario = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AjustePayload) => productosService.ajustar(data),
    onSuccess: (resultado) => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      const signo = resultado.diferencia > 0 ? "sobrante" : "faltante";
      aviso.exito(
        `Ajuste registrado: ${signo} de ${Math.abs(resultado.diferencia)}. ` +
          `Stock ${resultado.stockAnterior} → ${resultado.stockNuevo}.`,
      );
    },
    onError: (error) => notificarError(error, "No se pudo registrar el ajuste"),
  });
};

/**
 * El margen mínimo: cuánto hay que ganar sobre el costo de REPOSICIÓN.
 *
 * No es un precio mínimo fijo. El piso se mueve con lo que cuesta reponer, que
 * es justo el número que hace que vender a 115.000 lo que se repone a 120.000
 * sea una pérdida aunque el promedio diga que hay ganancia.
 */
export const useActualizarMargenMinimo = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (margenMinimoPct: number) =>
      productosService.actualizar(id, { margenMinimoPct }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      aviso.exito("Margen mínimo actualizado");
    },
    onError: (error) => notificarError(error, "No se pudo actualizar el margen"),
  });
};
