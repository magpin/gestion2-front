"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { aviso } from "@/lib/avisos";
import { mensajeDeError } from "@/core/api/api";
import { formatCOP } from "@/lib/utils";
import { facturacionService } from "../services/facturacion.service";
import type { NuevaNotaCreditoPayload } from "../types/facturacion.types";

/**
 * Un 422 es una regla del negocio que el usuario puede resolver —falta una
 * firma, el período está cerrado— y por eso se avisa como advertencia. El 409
 * es el documento ya facturado o la factura ya anulada.
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

/**
 * Una nota crédito toca la factura, la cartera del origen, el kardex si vuelve
 * mercancía y la contabilidad. Hay que refrescarlo todo.
 */
function invalidarTodoLoQueTocaUnaNota(cliente: ReturnType<typeof useQueryClient>) {
  cliente.invalidateQueries({ queryKey: ["facturas"] });
  cliente.invalidateQueries({ queryKey: ["notas-credito"] });
  cliente.invalidateQueries({ queryKey: ["ventas"] });
  cliente.invalidateQueries({ queryKey: ["productos"] });
  cliente.invalidateQueries({ queryKey: ["asientos"] });
  cliente.invalidateQueries({ queryKey: ["cartera"] });
  cliente.invalidateQueries({ queryKey: ["dashboard"] });
}

/**
 * Evento A7 · la única forma de corregir una factura entregada.
 *
 * No hay «editar factura» ni lo habrá: emitir congeló el origen y un trigger lo
 * impide desde la base.
 */
export const useEmitirNotaCredito = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NuevaNotaCreditoPayload) => facturacionService.emitirNota(data),
    onSuccess: (nota) => {
      invalidarTodoLoQueTocaUnaNota(queryClient);
      aviso.exito(
        `Nota crédito ${nota.numero} por ${formatCOP(nota.total)}`,
        nota.alcance === "TOTAL"
          ? "La factura quedó anulada y el documento de origen volvió a ser editable."
          : "La factura sigue viva: se devolvieron solo los renglones elegidos.",
      );
    },
    onError: (error) => notificarError(error, "No se pudo emitir la nota crédito"),
  });
};
