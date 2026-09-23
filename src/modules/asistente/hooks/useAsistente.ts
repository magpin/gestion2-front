"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { mensajeDeError } from "@/core/api/api";
import { useAuthStore } from "@/core/store/authStore";
import { CLAVE_ESTADO } from "@/modules/configuracion/hooks/useEstadoConfiguracion";
import { LLAVE_APROBAR } from "./usePendientes";
import { asistenteService } from "../services/asistente.service";
import {
  tipoMimeDe,
  type ResultadoAnalisis,
  type ResultadoConfirmacion,
  type TipoDocumento,
} from "../types/asistente.types";

// `useDisponible` vive en `configuracion`: las dos entradas al modo IA son de
// esa carpeta y el endpoint se llama `/configuracion/ia/disponible`. Se
// reexporta acá porque esta pantalla también lo necesita y así no hay dos
// caminos para importar lo mismo.
export {
  CLAVE_DISPONIBLE,
  useDisponible,
  useDisponibilidadIa,
} from "@/modules/configuracion/hooks/useModoIa";

export const CLAVE_DOCUMENTOS = ["asistente", "documentos"] as const;

/**
 * El estado de cada documento. `staleTime` en cero: el progreso en vivo llega
 * por el flujo de eventos, y cada evento invalida esto para que la tarjeta y los
 * mensajes cuenten lo mismo.
 */
export const useDocumentos = () => {
  const operando = useAuthStore((s) => s.operando);

  return useQuery({
    queryKey: CLAVE_DOCUMENTOS,
    queryFn: asistenteService.documentos,
    enabled: operando,
    staleTime: 0,
    meta: { silencioso: true },
  });
};

/**
 * Subir un documento: firma, sube al bucket, registra.
 *
 * Tres pasos y un solo botón, porque para quien lo usa es una sola cosa. Si el
 * bucket rechaza el archivo no se registra nada: una fila apuntando a un objeto
 * que no existe sería una lectura que falla sin razón visible.
 */
export const useSubirDocumento = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tipo,
      archivo,
    }: {
      /** Sin tipo, lo reconoce el servidor. */
      tipo?: TipoDocumento;
      archivo: File;
    }): Promise<ResultadoAnalisis> => {
      const tipoMime = tipo === undefined ? tipoMimeDe(archivo) : archivo.type;
      const { url, clave } = await asistenteService.urlDeCarga(tipo, tipoMime);
      await asistenteService.subirAlBucket(url, archivo, tipoMime);
      // Sin tipo, el servidor mira el archivo y dice qué es.
      if (tipo === undefined) return asistenteService.analizar(clave);
      const documento = await asistenteService.registrar(tipo, clave);
      return { documento, clase: "", resumen: "" };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE_DOCUMENTOS });
    },
  });
};

/**
 * Aplicar lo confirmado.
 *
 * Invalida el estado de configuración además de lo propio: aplicar la razón
 * social o una responsabilidad del RUT cambia qué le falta a la empresa, y el
 * riel del asistente manual tiene que enterarse.
 */
export const useConfirmar = () => {
  const queryClient = useQueryClient();

  return useMutation<
    ResultadoConfirmacion,
    unknown,
    { id: string; campos?: string[]; correcciones?: Record<string, string> }
  >({
    mutationKey: LLAVE_APROBAR,
    mutationFn: ({ id, campos, correcciones }) =>
      asistenteService.confirmar(id, campos, correcciones),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CLAVE_ESTADO }),
        queryClient.invalidateQueries({ queryKey: CLAVE_DOCUMENTOS }),
      ]);
    },
  });
};

/** Cortar una lectura en curso. */
export const useDetener = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => asistenteService.detener(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE_DOCUMENTOS });
    },
  });
};

/** El mensaje del backend, tal cual. Las reglas viven allá. */
export { mensajeDeError };
