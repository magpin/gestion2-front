"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { asistenteService } from "../services/asistente.service";
import { lotesApi } from "../services/lote.service";
import { tipoMimeDe } from "../types/asistente.types";
import type { Lote } from "../types/lote.types";
import { CLAVE_PENDIENTES } from "./usePendientes";

export const CLAVE_LOTES = ["maria", "lotes"] as const;

/** Mientras un lote sigue, se vuelve a pedir por si el flujo de progreso se cortó. */
const REFRESCO_MS = 3000;

/**
 * Los últimos lotes de quien mira. El avance llega por el flujo de progreso
 * (evento `LOTE`), que invalida esta consulta; el intervalo es la red de
 * seguridad y **se apaga cuando no queda ninguno en marcha**.
 */
export function useLotes(activo = true) {
  return useQuery({
    queryKey: CLAVE_LOTES,
    queryFn: lotesApi.listar,
    enabled: activo,
    refetchInterval: (q) =>
      (q.state.data ?? []).some((l) => l.terminadoEn === null) ? REFRESCO_MS : false,
  });
}

/**
 * Sube los archivos al bucket —de a uno, en el orden en que llegaron— y arma
 * el lote. Contesta apenas el lote existe: leer es trabajo del servidor.
 */
export function useCrearLote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (archivos: File[]): Promise<Lote> => {
      const subidos: Array<{ clave: string; nombre: string }> = [];
      for (const archivo of archivos) {
        const tipoMime = tipoMimeDe(archivo);
        const { url, clave } = await asistenteService.urlDeCarga(undefined, tipoMime);
        await asistenteService.subirAlBucket(url, archivo, tipoMime);
        subidos.push({ clave, nombre: archivo.name });
      }
      return lotesApi.crear(subidos);
    },
    onSuccess: (lote) => {
      queryClient.setQueryData<Lote[]>(CLAVE_LOTES, (previos = []) => [lote, ...previos]);
    },
  });
}

export function useDetenerLote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: lotesApi.detener,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE_LOTES }),
  });
}

/**
 * «Es la misma, descartala». Cambia lo que espera una decisión: el número de
 * la barra y la píldora del encabezado también.
 */
export function useDescartar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: { tipo: string; documentoId: string; motivo: string }) =>
      lotesApi.descartar(v.tipo, v.documentoId, v.motivo),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CLAVE_LOTES }),
        queryClient.invalidateQueries({ queryKey: CLAVE_PENDIENTES }),
      ]);
    },
  });
}
