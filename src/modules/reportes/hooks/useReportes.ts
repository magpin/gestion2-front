"use client";

import { useQuery } from "@tanstack/react-query";

import { llaveDe } from "../lib/eleccion";
import { reportesService } from "../services/reportes.service";
import type { ClaveReporte, Eleccion } from "../types/reportes.types";

export const llavesReportes = {
  lista: ["reportes", "lista"] as const,
  atajos: ["reportes", "atajos"] as const,
  miniatura: (reporte: ClaveReporte) => ["reportes", "miniatura", reporte] as const,
  hoja: (reporte: ClaveReporte, eleccion: Eleccion) =>
    ["reportes", "hoja", reporte, eleccion.tipo, llaveDe(eleccion)] as const,
};

export function useListaReportes() {
  return useQuery({ queryKey: llavesReportes.lista, queryFn: reportesService.listar });
}

/**
 * Las fechas de cada atajo. Cambian una vez por día, pero una pantalla abierta
 * de un día para otro tiene que mostrar las de hoy: cinco minutos alcanzan.
 */
export function useAtajos() {
  return useQuery({
    queryKey: llavesReportes.atajos,
    queryFn: reportesService.atajos,
    staleTime: 5 * 60_000,
  });
}

/**
 * La miniatura de la tarjeta: la hoja real con los datos de este mes, o de
 * hoy. No se reintenta: si falla, la tarjeta muestra una hoja en blanco y la
 * lista sigue sirviendo.
 */
export function useMiniatura(reporte: ClaveReporte, eleccion: Eleccion) {
  return useQuery({
    queryKey: llavesReportes.miniatura(reporte),
    queryFn: ({ signal }) => reportesService.hoja(reporte, eleccion, { previa: true, signal }),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

/**
 * La hoja del visor. Sin caché: cada vez que se abre es una corrida nueva, con
 * los datos de ese momento, que es lo que dice el pie de la hoja.
 */
export function useHoja(reporte: ClaveReporte, eleccion: Eleccion) {
  return useQuery({
    queryKey: llavesReportes.hoja(reporte, eleccion),
    queryFn: ({ signal }) => reportesService.hoja(reporte, eleccion, { signal }),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
