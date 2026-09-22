"use client";

import { useSyncExternalStore } from "react";

import { COOKIE_EFECTIVO, COOKIE_PREFERENCIA } from "./tema.constantes";

/**
 * El tema de la pantalla: claro, oscuro o el que tenga el sistema operativo.
 *
 * **Va en una cookie, no en `localStorage`.** Así el servidor ya sabe con qué
 * tema armar el HTML y la página nace con el color correcto; con
 * `localStorage` el servidor no puede saberlo y quien usa oscuro vería un
 * destello blanco en cada carga. Es una comodidad de quien mira, no un dato de
 * la cuenta: no viaja a la base ni se comparte entre computadores.
 *
 * Son dos cookies y no una porque son dos cosas distintas:
 *
 *  - `tema` es lo que la persona eligió, incluido «el del sistema»;
 *  - `tema-efectivo` es el color que toca hoy, que es lo único que el servidor
 *    puede usar para pintar. Con «el del sistema», el navegador lo actualiza
 *    cuando el sistema operativo cambia de color.
 */
export type Preferencia = "claro" | "oscuro" | "sistema";
export type Tema = "claro" | "oscuro";

export { COOKIE_EFECTIVO, COOKIE_PREFERENCIA } from "./tema.constantes";

export const NOMBRE_PREFERENCIA: Record<Preferencia, string> = {
  claro: "Claro",
  oscuro: "Oscuro",
  sistema: "El del sistema",
};

/** El aviso de que el tema cambió, para que todos los botones se enteren. */
const EVENTO = "tema-cambiado";
const UN_ANIO = 60 * 60 * 24 * 365;

const leerCookie = (nombre: string): string | null => {
  if (typeof document === "undefined") return null;
  const par = document.cookie.split("; ").find((c) => c.startsWith(`${nombre}=`));
  return par ? decodeURIComponent(par.slice(nombre.length + 1)) : null;
};

const escribirCookie = (nombre: string, valor: string): void => {
  document.cookie = `${nombre}=${valor}; path=/; max-age=${UN_ANIO}; samesite=lax`;
};

const leerPreferencia = (): Preferencia => {
  const p = leerCookie(COOKIE_PREFERENCIA);
  return p === "claro" || p === "oscuro" ? p : "sistema";
};

const delSistema = (): Tema =>
  typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "oscuro"
    : "claro";

export const temaEfectivo = (p: Preferencia): Tema => (p === "sistema" ? delSistema() : p);

/**
 * Deja el `<html>` y las cookies como corresponde. Lo llama el botón, y
 * también `SincronizarTema` en la primera carga de quien sigue al sistema.
 */
export function aplicarTema(p: Preferencia): void {
  const tema = temaEfectivo(p);
  document.documentElement.dataset.theme = tema === "oscuro" ? "dark" : "light";
  escribirCookie(COOKIE_PREFERENCIA, p);
  escribirCookie(COOKIE_EFECTIVO, tema === "oscuro" ? "dark" : "light");
}

function suscribir(avisar: () => void): () => void {
  const medio = window.matchMedia("(prefers-color-scheme: dark)");
  const alCambiarElSistema = () => {
    // Con «el del sistema», seguirlo: incluye la cookie, para que el próximo
    // HTML ya venga del color nuevo.
    if (leerPreferencia() === "sistema") aplicarTema("sistema");
    avisar();
  };
  window.addEventListener(EVENTO, avisar);
  medio.addEventListener("change", alCambiarElSistema);
  return () => {
    window.removeEventListener(EVENTO, avisar);
    medio.removeEventListener("change", alCambiarElSistema);
  };
}

/**
 * La preferencia y cómo cambiarla. En el servidor devuelve «sistema»: el HTML
 * se arma con la cookie, no con este hook.
 */
export function useTema(): {
  preferencia: Preferencia;
  tema: Tema;
  cambiar: (p: Preferencia) => void;
} {
  const preferencia = useSyncExternalStore(suscribir, leerPreferencia, () => "sistema" as const);
  const tema = useSyncExternalStore(
    suscribir,
    () => temaActual(),
    () => "claro" as const,
  );

  const cambiar = (p: Preferencia) => {
    aplicarTema(p);
    window.dispatchEvent(new Event(EVENTO));
  };

  return { preferencia, tema, cambiar };
}

/** El tema de ahora mismo, para lo que no es React: los avisos, por ejemplo. */
export function temaActual(): Tema {
  if (typeof document === "undefined") return "claro";
  return document.documentElement.dataset.theme === "dark" ? "oscuro" : "claro";
}
