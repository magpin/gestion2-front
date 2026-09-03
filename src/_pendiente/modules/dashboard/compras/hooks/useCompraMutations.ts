"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { aviso } from "@/lib/avisos";
import { mensajeDeError } from "@/core/api/api";
import { comprasService } from "../services/compras.service";
import type { NuevaCompraPayload } from "../types/compras.types";

/**
 * Un 422 es una regla del negocio que el usuario puede resolver —el período
 * está cerrado, el tercero no es proveedor— y por eso se avisa como advertencia
 * y no como error: no se rompió nada, falta un paso. El 409 es la factura
 * repetida.
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

/** Una compra mueve stock y asienta: hay que refrescar los tres módulos. */
function invalidarTodoLoQueTocaUnaCompra(cliente: ReturnType<typeof useQueryClient>) {
  cliente.invalidateQueries({ queryKey: ["compras"] });
  cliente.invalidateQueries({ queryKey: ["productos"] });
  cliente.invalidateQueries({ queryKey: ["asientos"] });
  cliente.invalidateQueries({ queryKey: ["cartera"] });
  cliente.invalidateQueries({ queryKey: ["dashboard"] });
}

export const useCrearCompra = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NuevaCompraPayload) => comprasService.crear(data),
    onSuccess: (compra) => {
      invalidarTodoLoQueTocaUnaCompra(queryClient);
      // La compra al contado también deja saldo: pagar es otro evento y otra
      // pantalla. Si descontara la caja sola, el arqueo del día no cuadraría.
      aviso.exito(
        `Compra ${compra.numeroFactura} registrada`,
        "Queda con saldo por pagar, incluso al contado: el pago se registra en Caja.",
      );
    },
    onError: (error) => notificarError(error, "No se pudo registrar la compra"),
  });
};

export const useAnularCompra = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      comprasService.anular(id, motivo),
    onSuccess: () => {
      invalidarTodoLoQueTocaUnaCompra(queryClient);
      aviso.exito("Compra anulada: el stock salió y el asiento quedó reversado");
    },
    onError: (error) => notificarError(error, "No se pudo anular la compra"),
  });
};
