"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { mensajeDeError } from "@/core/api/api";
import { aviso } from "@/lib/avisos";
import { CLAVE_ESTADO } from "./useEstadoConfiguracion";

interface Opciones<T> {
  /** Lo que se manda al backend. */
  fn: (datos: T) => Promise<unknown>;
  /** Qué decir cuando salió bien. */
  exito: string;
  /** Consultas a refrescar además del estado de configuración. */
  invalidar?: readonly unknown[][];
  alTerminar?: () => void;
}

/**
 * Guardar un paso del asistente.
 *
 * Siempre invalida el estado de configuración: guardar cualquier cosa puede
 * cambiar qué falta —completar la tarifa de ICA puede desbloquear terceros—, y
 * dejar el estado viejo haría que la persona termine un paso y lo siga viendo
 * en ámbar.
 *
 * Los errores se muestran tal como los manda el backend. Ahí es donde viven las
 * reglas contables, y traducirlas acá sería mantener dos versiones del mismo
 * mensaje.
 */
export function useGuardar<T>({ fn, exito, invalidar = [], alTerminar }: Opciones<T>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE_ESTADO });
      await Promise.all(
        invalidar.map((clave) => queryClient.invalidateQueries({ queryKey: clave })),
      );
      aviso.exito(exito);
      alTerminar?.();
    },
    onError: (error: unknown) => aviso.error(mensajeDeError(error)),
  });
}
