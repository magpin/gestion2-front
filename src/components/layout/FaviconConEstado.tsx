"use client";

import { useEffect, useSyncExternalStore } from "react";

import { useAuthStore } from "@/core/store/authStore";
import { ROLES_MARIA, usePendientes } from "@/modules/asistente/hooks/usePendientes";
import { MARIA_PROXIMAMENTE } from "@/modules/asistente/proximamente";

/**
 * El punto naranja en la pestaña cuando algo espera una decisión de quien mira
 * (lámina `Fuera` de `mocks/maria-identidad/`). Así se nota desde otra pestaña, sin
 * volver.
 *
 * La cara de María ya es el ícono de toda la aplicación (`app/icon.png`); esto
 * solo le pone encima la versión con el punto mientras haya pendientes, y la
 * saca cuando no queda ninguno. Solo para quien ve a María: a los demás el
 * número no les toca.
 *
 * No pide nada propio: usa la misma consulta que el número de la barra
 * lateral, que react-query comparte.
 */
export function FaviconConEstado() {
  const roles = useAuthStore((s) => s.roles);
  const montado = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const veMaria = !MARIA_PROXIMAMENTE && montado && ROLES_MARIA.some((r) => roles.includes(r));
  const pendientes = usePendientes(veMaria);
  const espera = veMaria && (pendientes?.total ?? 0) > 0;

  useEffect(() => {
    if (!espera) return;
    const enlace = document.createElement("link");
    enlace.rel = "icon";
    enlace.type = "image/svg+xml";
    enlace.href = "/maria-favicon-espera.svg";
    // El último `<link rel="icon">` del head es el que usa el navegador.
    document.head.appendChild(enlace);
    return () => enlace.remove();
  }, [espera]);

  return null;
}
