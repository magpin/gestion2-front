"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/core/api/api";

/**
 * ¿La empresa maneja caja menor?
 *
 * Lo contesta la persona en el asistente («¿Maneja caja menor?»), y es lo único
 * que lo dice: ningún documento trae el fondo fijo. Mismo patrón que
 * `useResponsableIva`: si la respuesta es no, la pantalla no ofrece nada de caja
 * menor, igual que no muestra columnas de IVA a quien no lo liquida.
 *
 * Misma clave que `HechosOperativos`, que la invalida al guardar: marcar la
 * casilla en el asistente se ve de inmediato en tesorería. Mientras carga se
 * asume que **no**: ofrecer una opción que después desaparece confunde más que
 * mostrarla un instante tarde.
 */
export function useManejaCajaMenor(): boolean {
  const { data } = useQuery({
    queryKey: ["hechos-operativos"],
    queryFn: () =>
      api.get<string[]>("/empresa-legal/hechos-operativos").then((r) => r.data),
    staleTime: 30 * 60_000,
  });

  return data?.includes("MANEJA_CAJA_MENOR") ?? false;
}
