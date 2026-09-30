"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/core/api/api";

/**
 * ¿La empresa liquida IVA?
 *
 * Sale del régimen vigente, que se carga en la configuración inicial: no es
 * una preferencia de pantalla ni algo que alguien elija al facturar. El
 * backend ya decide lo mismo por su cuenta —fuerza la tarifa a `0` aunque le
 * manden otra cosa—; esto existe para que la pantalla no muestre una columna
 * de "IVA $0" que no significa nada.
 *
 * Se cachea largo porque cambia una vez cada varios años, y mientras carga se
 * asume que **sí**: mostrar una columna de más por un instante es mejor que
 * esconder el IVA de una empresa que sí lo liquida.
 */
export function useResponsableIva(): boolean {
  return useResponsableIvaCargado() ?? true;
}

/**
 * Lo mismo, pero `undefined` mientras carga: para lo que no debe aparecer y
 * desaparecer, como la fila del IVA en los totales.
 */
export function useResponsableIvaCargado(): boolean | undefined {
  const { data } = useQuery({
    queryKey: ["empresa-legal", "regimen-vigente"],
    queryFn: () =>
      api
        .get<string[]>("/empresa-legal/regimenes/vigente")
        .then((r) => r.data),
    staleTime: 30 * 60_000,
  });
  return data === undefined ? undefined : data.includes("RESPONSABLE_IVA");
}
