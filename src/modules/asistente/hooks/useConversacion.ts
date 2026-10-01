"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuthStore } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import { conversacionService, TurnoRechazado } from "../services/conversacion.service";
import type { CuerpoDePago } from "../types/conversacion.types";
import { LLAVE_APROBAR } from "./usePendientes";

export const CLAVE_CONVERSACION = ["conversacion"] as const;
const CLAVE_VIGENTE = [...CLAVE_CONVERSACION, "vigente"] as const;
const CLAVE_LISTA = [...CLAVE_CONVERSACION, "lista"] as const;

/** Si se puede conversar. Depende solo de la clave del modelo, no del bucket. */
export const useConversacionDisponible = () => {
  const operando = useAuthStore((s) => s.operando);
  return useQuery({
    queryKey: [...CLAVE_CONVERSACION, "disponible"],
    queryFn: conversacionService.disponible,
    enabled: operando,
    staleTime: 5 * 60_000,
    meta: { silencioso: true },
  });
};

export const useConversacionVigente = (activa: boolean) => {
  const operando = useAuthStore((s) => s.operando);
  return useQuery({
    queryKey: CLAVE_VIGENTE,
    queryFn: conversacionService.vigente,
    enabled: operando && activa,
    meta: { silencioso: true },
  });
};

export const useListaConversaciones = (activa: boolean) => {
  const operando = useAuthStore((s) => s.operando);
  return useQuery({
    queryKey: CLAVE_LISTA,
    queryFn: conversacionService.lista,
    enabled: operando && activa,
    meta: { silencioso: true },
  });
};

/** Una archivada, para leerla. `null`: se está mirando la vigente. */
export const useConversacionArchivada = (id: string | null) => {
  const operando = useAuthStore((s) => s.operando);
  return useQuery({
    queryKey: [...CLAVE_CONVERSACION, "una", id],
    queryFn: () => conversacionService.una(id ?? ""),
    enabled: operando && id !== null,
    // Una archivada no cambia nunca: no hay nada que volver a pedir.
    staleTime: Infinity,
  });
};

/** «Nueva conversación»: archiva la vigente y relee la lista. */
export const useNuevaConversacion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: conversacionService.nueva,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLAVE_CONVERSACION });
    },
  });
};

/**
 * Confirmar o descartar una propuesta del asistente. Pase lo que pase se
 * relee la conversación: la propuesta cambia de estado —o guarda por qué no se
 * pudo— y la tarjeta tiene que decirlo.
 */
export const useResolverPropuesta = () => {
  const queryClient = useQueryClient();
  const releer = () => queryClient.invalidateQueries({ queryKey: CLAVE_CONVERSACION });
  const confirmar = useMutation({
    mutationKey: LLAVE_APROBAR,
    mutationFn: ({ id, correccion }: { id: string; correccion?: CuerpoDePago }) =>
      conversacionService.confirmarPropuesta(id, correccion),
    onSettled: releer,
  });
  const descartar = useMutation({
    mutationFn: (id: string) => conversacionService.descartarPropuesta(id),
    onSettled: releer,
  });
  return { confirmar, descartar };
};

/** El turno que se está contestando, mientras llega. */
export interface TurnoEnVivo {
  /** Lo que la persona escribió, desde el primer instante. */
  pregunta: string;
  /** La respuesta hasta acá. Vacía mientras el modelo piensa. */
  texto: string;
  /**
   * Lo que se está consultando ahora —«Cartera»—, o `null`. Se va cuando
   * vuelve a llegar texto: la consulta terminó.
   */
  consultando: string | null;
}

/**
 * Mandar una pregunta y mirar la respuesta mientras se escribe.
 *
 * `enviar` devuelve si el backend aceptó la pregunta: si la rechazó —el límite
 * por minuto, el tope, otra respuesta en curso— se avisa con su mensaje y el
 * campo recupera lo escrito.
 *
 * El turno en vivo se queda en pantalla hasta que la vigente se relee con los
 * dos turnos ya guardados: si se borrara antes, la respuesta parpadearía.
 *
 * Salir de la pantalla a mitad corta el flujo, y el backend guarda el turno
 * como CORTADO con lo que alcanzó: es lo mismo que cerrar la pestaña.
 */
export function usePreguntar() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const [enVivo, setEnVivo] = useState<TurnoEnVivo | null>(null);
  const corte = useRef<AbortController | null>(null);

  useEffect(() => () => corte.current?.abort(), []);

  const enviar = useCallback(
    async (texto: string): Promise<boolean> => {
      if (token === null || corte.current !== null) return false;
      const controlador = new AbortController();
      corte.current = controlador;
      setEnVivo({ pregunta: texto, texto: "", consultando: null });

      let aceptada = true;
      try {
        await conversacionService.preguntar(texto, {
          token,
          corte: controlador.signal,
          alEvento: (evento) => {
            if (evento.tipo === "TROZO") {
              setEnVivo((v) =>
                v === null ? v : { ...v, texto: v.texto + evento.texto, consultando: null },
              );
            } else if (evento.tipo === "CONSULTA") {
              setEnVivo((v) => (v === null ? v : { ...v, consultando: evento.etiqueta }));
            } else if (evento.tipo === "ERROR") {
              aviso.error("No se guardó la respuesta", evento.motivo);
            }
          },
        });
      } catch (error) {
        if (controlador.signal.aborted) return false;
        if (error instanceof TurnoRechazado) {
          aceptada = false;
          aviso.error("No pude mandar la pregunta", error.message);
        } else {
          aviso.error(
            "Se cortó la conexión",
            "Lo que alcanzó a llegar quedó guardado. Recargue la página si falta algo.",
          );
        }
      } finally {
        if (!controlador.signal.aborted) corte.current = null;
      }

      await queryClient.invalidateQueries({ queryKey: CLAVE_CONVERSACION });
      setEnVivo(null);
      return aceptada;
    },
    [queryClient, token],
  );

  return { enviar, enVivo, respondiendo: enVivo !== null };
}

