"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { aviso } from "@/lib/avisos";
import { mensajeDeError } from "@/core/api/api";
import { formatCOP } from "@/lib/utils";
import { cajaService } from "../services/caja.service";
import { clasificarArqueo } from "../lib/ciclo-caja";
import type { NuevoArqueoPayload, NuevoCobroPayload, NuevoPagoPayload } from "../types/caja.types";

/**
 * Un 422 es una regla del negocio que el usuario puede resolver —el período
 * está cerrado, el importe supera el saldo— y por eso se avisa como
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

/**
 * Un abono toca cuatro cosas: el saldo del documento, el asiento, la cartera y
 * —si fue efectivo— el cajón. Hay que refrescar las cuatro.
 */
function invalidarTodoLoQueTocaUnAbono(cliente: ReturnType<typeof useQueryClient>) {
  cliente.invalidateQueries({ queryKey: ["caja"] });
  cliente.invalidateQueries({ queryKey: ["abonos"] });
  cliente.invalidateQueries({ queryKey: ["cartera"] });
  cliente.invalidateQueries({ queryKey: ["ventas"] });
  cliente.invalidateQueries({ queryKey: ["compras"] });
  cliente.invalidateQueries({ queryKey: ["asientos"] });
  cliente.invalidateQueries({ queryKey: ["dashboard"] });
}

/** Evento A4. Rol CAJA. */
export const useCobrar = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NuevoCobroPayload) => cajaService.cobrar(data),
    onSuccess: (abono) => {
      invalidarTodoLoQueTocaUnAbono(queryClient);
      // El aviso dice si la plata entró al cajón o no: es lo que el cajero
      // necesita saber para que el arqueo de la tarde no lo sorprenda.
      aviso.exito(
        `Cobro de ${formatCOP(abono.importe)} registrado`,
        abono.medioPago === "EFECTIVO"
          ? "Entró al cajón: cuenta para el arqueo del día."
          : "No pasó por el cajón: quedó contra Bancos.",
      );
    },
    onError: (error) => notificarError(error, "No se pudo registrar el cobro"),
  });
};

/** Evento A2. Misma tabla, mismo camino, sentido contrario. */
export const usePagar = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NuevoPagoPayload) => cajaService.pagar(data),
    onSuccess: (abono) => {
      invalidarTodoLoQueTocaUnAbono(queryClient);
      aviso.exito(
        `Pago de ${formatCOP(abono.importe)} registrado`,
        abono.medioPago === "EFECTIVO"
          ? "Salió del cajón: cuenta para el arqueo del día."
          : "No pasó por el cajón: salió contra Bancos.",
      );
    },
    onError: (error) => notificarError(error, "No se pudo registrar el pago"),
  });
};

export const useAnularAbono = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      cajaService.anularAbono(id, motivo),
    onSuccess: () => {
      invalidarTodoLoQueTocaUnAbono(queryClient);
      aviso.exito(
        "Abono anulado",
        "El saldo volvió al documento y el asiento quedó reversado. La fila no se borra.",
      );
    },
    onError: (error) => notificarError(error, "No se pudo anular el abono"),
  });
};

/** Evento A6. Un arqueo por día: el segundo del mismo día devuelve 409. */
export const useArquear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NuevoArqueoPayload) => cajaService.arquear(data),
    onSuccess: (arqueo) => {
      queryClient.invalidateQueries({ queryKey: ["caja"] });
      queryClient.invalidateQueries({ queryKey: ["arqueos"] });
      queryClient.invalidateQueries({ queryKey: ["asientos"] });

      const { resultado } = clasificarArqueo(arqueo.saldoSistema, arqueo.saldoContado);
      if (resultado === "CUADRA") {
        aviso.exito("Caja cuadrada", "Sin diferencia: este arqueo no deja asiento.");
      } else {
        aviso.exito(
          `Caja cerrada con ${resultado === "FALTANTE" ? "faltante" : "sobrante"} de ${formatCOP(Math.abs(arqueo.diferencia))}`,
          "Quedó el asiento del ajuste y el movimiento de caja: el descuadre no se arrastra a mañana.",
        );
      }
    },
    onError: (error) => notificarError(error, "No se pudo cerrar la caja"),
  });
};
