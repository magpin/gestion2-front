"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/core/api/api";
import { useAuthStore } from "@/core/store/authStore";

export const CLAVE_DISPONIBLE = ["asistente", "disponible"] as const;

/**
 * Si el modo IA se puede ofrecer. Lo decide el servidor: sin la clave del
 * modelo o sin bucket, no hay nada que ofrecer.
 *
 * **Vive en `configuracion` y no en `asistente`, aunque lo use más el segundo.**
 * Las dos entradas al modo IA —la tarjeta «Con IA» de la bienvenida y la
 * píldora del encabezado de cada paso— son de esta carpeta, y `asistente` ya
 * importa de acá. Ponerlo del otro lado haría que los dos módulos se importaran
 * entre sí, que es peor que esta línea de más. El endpoint también es de acá:
 * se llama `/configuracion/ia/disponible`.
 *
 * `staleTime: Infinity` porque depende del despliegue, no de la sesión: la
 * clave y el bucket no aparecen mientras alguien llena un formulario.
 */
export const useDisponible = () => {
  const operando = useAuthStore((s) => s.operando);

  return useQuery({
    queryKey: CLAVE_DISPONIBLE,
    queryFn: () =>
      api
        .get<{ disponible: boolean }>("/configuracion/ia/disponible")
        .then((r) => r.data.disponible),
    enabled: operando,
    staleTime: Infinity,
    meta: { silencioso: true },
  });
};
