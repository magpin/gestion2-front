"use client";

import { useState } from "react";

const LLAVE = "plataforma-tasa";
const POR_DEFECTO = 4000;

const leer = (): number => {
  try {
    const n = Number(localStorage.getItem(LLAVE));
    return Number.isFinite(n) && n > 0 ? n : POR_DEFECTO;
  } catch {
    return POR_DEFECTO;
  }
};

/**
 * Los pesos por dólar con que se leen los costos de la IA. **Se escribe, no
 * se inventa**: arranca en 4.000 y quien administra la cambia en Consumo de
 * IA. Se recuerda en este navegador; es una comodidad, no un dato del sistema.
 */
export function useTasa(): [number, (n: number) => void] {
  const [tasa, setTasa] = useState<number>(() =>
    typeof window === "undefined" ? POR_DEFECTO : leer(),
  );
  const guardar = (n: number) => {
    setTasa(n);
    try {
      localStorage.setItem(LLAVE, String(n));
    } catch {
      // Sin localStorage la tasa vive solo en esta pantalla.
    }
  };
  return [tasa, guardar];
}
