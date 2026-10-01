"use client";

import { useQueries } from "@tanstack/react-query";

import { useResponsableIvaCargado } from "@/core/hooks/useResponsableIva";
import { precioApi } from "@/modules/inventario/services/inventario.service";
import type { LineaVentaBorrador } from "../components/EditorLineasVenta";
import { totalesDelBorrador, type TotalesDelBorrador } from "../lib/totales";

/**
 * Los totales del borrador en el navegador (`totalesDelBorrador`), con el
 * precio de lista de cada producto. Las consultas usan la misma llave que
 * `usePrecioVigente`: comparten el caché, no son consultas de más.
 *
 * `responsable` es `undefined` mientras se sabe si la empresa liquida IVA:
 * así la fila del IVA no aparece y desaparece.
 */
export function useTotalesBorrador(
  lineas: LineaVentaBorrador[],
  { siempreDigitado = false }: { siempreDigitado?: boolean } = {},
): TotalesDelBorrador & { responsable: boolean | undefined; cargando: boolean } {
  const responsable = useResponsableIvaCargado();
  const consultas = useQueries({
    queries: lineas.map((l) => ({
      queryKey: ["productos", "precios", l.producto?.id],
      queryFn: () => precioApi.historialDe(l.producto!.id),
      enabled: l.producto !== null && l.tipo !== "CONCEPTO",
      staleTime: 60_000,
    })),
  });
  const precioDeLista = (i: number) => {
    const vigente = consultas[i]?.data?.find((p) => p.fecha_fin === null);
    return vigente && Number(vigente.precio_venta) > 0 ? Number(vigente.precio_venta) : null;
  };
  return {
    ...totalesDelBorrador(lineas, precioDeLista, responsable ?? true, { siempreDigitado }),
    responsable,
    cargando: consultas.some((c) => c.isFetching),
  };
}
