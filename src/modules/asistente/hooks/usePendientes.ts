"use client";

import {
  useIsMutating,
  useMutationState,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { api } from "@/core/api/api";
import type { RolCodigo } from "@/modules/auth/types/auth.types";

/**
 * Quién ve a María —en la barra y en el tablero—: los mismos de «Configurar
 * empresa», que son los que el backend exige para escribir. El asistente no
 * amplía permisos.
 */
export const ROLES_MARIA: RolCodigo[] = ["ADMIN_TENANT", "DIRECTOR", "CONTADOR"];

/**
 * Todo lo que confirma algo que María propuso: los datos de un documento leído
 * y los cobros o pagos del chat. Llevan esta llave para que la cara del
 * encabezado sepa cuándo está trabajando y cuándo terminó, sin que cada
 * tarjeta tenga que avisarle.
 */
export const LLAVE_APROBAR = ["maria", "aprobar"] as const;

export const CLAVE_PENDIENTES = ["maria", "pendientes"] as const;

/** Lo que espera una decisión de quien mira (`GET /conversacion/pendientes`). */
export interface Pendientes {
  total: number;
  propuestas: number;
  facturas: number;
  pedidos: number;
}

/**
 * Los pendientes de María: el número de la barra lateral y la píldora del
 * encabezado del chat.
 *
 * Se vuelve a pedir cada minuto y al terminar cualquier aprobación: es un
 * número chico, y uno viejo —«2 pendientes» cuando ya no queda nada— enseña a
 * no creerle.
 */
export function usePendientes(activo = true) {
  const queryClient = useQueryClient();
  const aprobaciones = useIsMutating({ mutationKey: LLAVE_APROBAR });
  // Cuando termina de aprobarse algo, el número cambió: se vuelve a pedir.
  useEffect(() => {
    if (aprobaciones === 0) void queryClient.invalidateQueries({ queryKey: CLAVE_PENDIENTES });
  }, [aprobaciones, queryClient]);
  const consulta = useQuery({
    queryKey: CLAVE_PENDIENTES,
    queryFn: () => api.get<Pendientes>("/conversacion/pendientes").then((r) => r.data),
    enabled: activo,
    refetchInterval: 60_000,
    // Mientras se vuelve a pedir, se sigue mostrando el anterior: que el
    // número parpadee a cero y vuelva no es información.
    placeholderData: (previo) => previo,
  });
  return consulta.data;
}

/** Cuánto dura la cara de «aprobado» después de confirmar. */
const DURA_APROBADO_MS = 2_400;

/**
 * Qué está haciendo María con lo que la persona aprueba: `trabajando`
 * mientras se registra, `aprobado` durante un momento después de que salió
 * bien, o nada.
 *
 * Es un **momento**, no un estado: la cara de aprobado dura lo que dura el
 * gesto y vuelve sola a lo que corresponda.
 */
export function useMomentoDeAprobar(): "trabajando" | "aprobado" | null {
  const trabajando = useIsMutating({ mutationKey: LLAVE_APROBAR }) > 0;
  const ultimoExito = useMutationState({
    filters: { mutationKey: LLAVE_APROBAR, status: "success" },
    select: (m) => m.state.submittedAt,
  }).reduce((max, t) => Math.max(max, t), 0);

  /** La última aprobación cuyo momento ya pasó. */
  const [vencida, setVencida] = useState(0);
  useEffect(() => {
    if (ultimoExito === 0) return;
    // Un solo temporizador, que marca el momento como pasado cuando termina
    // el gesto. Un reloj que corra todo el tiempo sería gastar por nada.
    const falta = Math.max(0, ultimoExito + DURA_APROBADO_MS - Date.now());
    const reloj = setTimeout(() => setVencida(ultimoExito), falta);
    return () => clearTimeout(reloj);
  }, [ultimoExito]);

  if (trabajando) return "trabajando";
  if (ultimoExito > 0 && vencida !== ultimoExito) return "aprobado";
  return null;
}

/** «María esta semana» (`GET /conversacion/semana`). */
export interface SemanaDeMaria {
  leidos: number;
  aprobados: number;
  esperan: number;
}

/**
 * Los números de la tarjeta del tablero. Se piden al entrar y cada cinco
 * minutos: es un resumen de la semana, no un contador en vivo —ese es el de
 * la barra lateral—.
 */
export function useSemanaDeMaria(activo = true) {
  return useQuery({
    queryKey: ["maria", "semana"],
    queryFn: () => api.get<SemanaDeMaria>("/conversacion/semana").then((r) => r.data),
    enabled: activo,
    refetchInterval: 5 * 60_000,
  }).data;
}
