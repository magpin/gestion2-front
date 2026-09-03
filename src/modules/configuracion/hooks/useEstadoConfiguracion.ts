"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuthStore } from "@/core/store/authStore";
import { configuracionService } from "../services/configuracion.service";

export const CLAVE_ESTADO = ["configuracion", "estado"] as const;

/**
 * El estado de configuración de la empresa en sesión.
 *
 * `staleTime` en cero a propósito: cada paso que se guarda cambia este estado, y
 * mostrar el anterior haría que el usuario complete algo y siga viéndolo en rojo.
 */
export const useEstadoConfiguracion = () => {
  const operando = useAuthStore((s) => s.operando);

  return useQuery({
    queryKey: CLAVE_ESTADO,
    queryFn: configuracionService.estado,
    enabled: operando,
    staleTime: 0,
  });
};
