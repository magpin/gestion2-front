"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/core/api/api";

/**
 * ¿La empresa vende sin existencia? Lo contesta en el asistente (el hecho
 * operativo `VENDE_SIN_EXISTENCIA`), y sin eso confirmar «emitir igual» no
 * sirve: el kardex rechaza la salida. Misma clave que `HechosOperativos`, que
 * la invalida al guardar. `undefined` mientras carga.
 */
export function useVendeSinExistencia(): boolean | undefined {
  const { data } = useQuery({
    queryKey: ["hechos-operativos"],
    queryFn: () =>
      api.get<string[]>("/empresa-legal/hechos-operativos").then((r) => r.data),
    staleTime: 30 * 60_000,
  });
  return data === undefined ? undefined : data.includes("VENDE_SIN_EXISTENCIA");
}
