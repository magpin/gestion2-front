"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useTieneRol } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import { configuracionCajaApi } from "../services/tesoreria.service";

/**
 * Deja tesorería lista para operar: las cuentas de arqueo, la caja de cada
 * sede y la caja menor si la empresa la maneja. Lo mismo corre al crear el
 * plan de cuentas; acá llega también a las empresas que ya lo tenían.
 *
 * Lo llaman las dos pantallas en que se partió Tesorería —Caja y bancos, y
 * Control—: se puede entrar por cualquiera. Es idempotente, pero basta una vez
 * por visita.
 */
export function usePrepararTesoreria() {
  const queryClient = useQueryClient();
  const puedePreparar = useTieneRol("CONTADOR", "DIRECTOR");

  const preparado = useRef(false);
  const preparar = useMutation({
    mutationFn: configuracionCajaApi.preparar,
    onSuccess: async (r) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["cajas"] }),
        queryClient.invalidateQueries({ queryKey: ["tesoreria", "configuracion"] }),
      ]);
      const creado = [...r.cuentasCreadas, ...r.cajasCreadas];
      if (creado.length > 0) {
        aviso.exito(`Tesorería lista para operar. Se creó: ${creado.join(", ")}`);
      }
    },
    // Sin aviso de error: si falla, cada pantalla sigue funcionando y
    // Configuración muestra lo que falta.
  });

  useEffect(() => {
    if (!puedePreparar || preparado.current) return;
    preparado.current = true;
    preparar.mutate();
  }, [puedePreparar, preparar]);
}
