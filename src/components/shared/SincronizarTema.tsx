"use client";

import { useEffect } from "react";

import { aplicarTema, temaActual } from "@/lib/tema";
import { COOKIE_EFECTIVO } from "@/lib/tema.constantes";

/**
 * La primera visita de quien tiene el sistema operativo en oscuro.
 *
 * El servidor arma el HTML con la cookie del tema; la primera vez no hay
 * cookie, así que manda claro. Esto lo corrige apenas carga y deja la cookie
 * puesta, de modo que pasa una sola vez y nunca más.
 *
 * No hace nada si ya coincide, que es el caso de siempre.
 */
export function SincronizarTema() {
  useEffect(() => {
    const yaHayCookie = document.cookie.includes(`${COOKIE_EFECTIVO}=`);
    const delSistema = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "oscuro"
      : "claro";
    if (!yaHayCookie || temaActual() !== delSistema) {
      const guardada = document.cookie.includes("tema=oscuro")
        ? "oscuro"
        : document.cookie.includes("tema=claro")
          ? "claro"
          : "sistema";
      if (guardada === "sistema") aplicarTema("sistema");
    }
  }, []);

  return null;
}
