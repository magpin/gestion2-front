/**
 * El anillo de ondas de María.
 *
 * No es un dibujo que se copió: es un círculo al que se le modula el radio con
 * un seno. Cada aro es
 *
 *     r(θ) = S · (base + amp · sen(k·θ + φ))
 *
 * y con esos números las coordenadas salen idénticas a las de las láminas de
 * `mocks/maria-identidad/` al centésimo de píxel. El plan que lo explica es
 * `docs/planes/maria.md`.
 *
 * Los tres aros usan **distinto número de lóbulos y distinta fase**, y giran
 * en sentidos alternos. Eso es lo que hace que la onda no se repita nunca:
 * ponerlos iguales o girando para el mismo lado la convierte en un aro que da
 * vueltas, que es lo que había antes.
 */

/** Cuántos lóbulos tiene el seno de cada aro. */
const LOBULOS = [6, 8, 5];
/** El desfase de cada aro, en radianes. */
const FASES = [0, 1.1, 2.2];
/** Cuánto se atenúa la amplitud del segundo y el tercer aro. */
const ATENUACION = [1, 0.8, 0.6];
/** 140 segmentos: menos se nota poligonal, más no se distingue. */
const PASOS = 140;

export type Intensidad = "calma" | "suave" | "media" | "alta";

interface Aro {
  /** Grosor de la línea, en px del `viewBox`. */
  grosor: number;
  opacidad: number;
  /** Cuánto tarda una vuelta entera, en segundos. */
  vuelta: number;
}

interface Receta {
  /** Radio del primer aro, en proporción del tamaño. */
  base: number;
  /** Cuánto ondula, en proporción del tamaño. */
  amplitud: number;
  aros: Aro[];
  /** Si el anillo entero se ensancha y se encoge, y cada cuánto. */
  respira?: "lento" | "rapido";
}

/**
 * Las cuatro intensidades. Lo que cambia entre una y otra no es solo la
 * velocidad: es cuánto ondula, cuántos aros hay y cuánto se ven. Por eso
 * «alta» se lee como esfuerzo y «calma» como estar esperando.
 */
export const RECETAS: Record<Intensidad, Receta> = {
  // Quieta, esperando, lista.
  calma: {
    base: 0.58,
    amplitud: 0.022,
    aros: [
      { grosor: 1.4, opacidad: 0.4, vuelta: 26 },
      { grosor: 1.1, opacidad: 0.28, vuelta: 34 },
      // El tercero está pero no se ve. Las intensidades bajas del paquete
      // llevan dos aros; acá van los tres siempre, con el sobrante en cero,
      // para que subir de intensidad sea un fundido y no una aparición.
      { grosor: 1.1, opacidad: 0, vuelta: 20 },
    ],
  },
  // Responder una pregunta.
  suave: {
    base: 0.6,
    amplitud: 0.038,
    aros: [
      { grosor: 1.5, opacidad: 0.75, vuelta: 16 },
      { grosor: 1.2, opacidad: 0.4, vuelta: 22 },
      { grosor: 1.1, opacidad: 0, vuelta: 20 },
    ],
  },
  // Hacer una tarea del sistema.
  media: {
    base: 0.62,
    amplitud: 0.06,
    aros: [
      { grosor: 1.7, opacidad: 0.95, vuelta: 10 },
      { grosor: 1.3, opacidad: 0.55, vuelta: 14 },
      { grosor: 1.1, opacidad: 0.3, vuelta: 20 },
    ],
    respira: "lento",
  },
  // Leer un documento: lo más caro que hace, y se nota.
  alta: {
    base: 0.64,
    amplitud: 0.092,
    aros: [
      { grosor: 2.1, opacidad: 1, vuelta: 6 },
      { grosor: 1.5, opacidad: 0.7, vuelta: 9 },
      { grosor: 1.2, opacidad: 0.45, vuelta: 13 },
    ],
    respira: "rapido",
  },
};

/**
 * El trazo de un aro.
 *
 * `tamano` es el de la cara, no el del anillo: el anillo mide 1,9 veces eso y
 * el centro cae en 0,95 —sin redondear, que es lo que hace que cierre—.
 */
export function trazoDeAro(
  tamano: number,
  indice: number,
  { base, amplitud }: Pick<Receta, "base" | "amplitud">,
): string {
  const centro = tamano * 0.95;
  const radio = base + 0.08 * indice;
  const amp = amplitud * (ATENUACION[indice] ?? 0.6);
  const lobulos = LOBULOS[indice] ?? 5;
  const fase = FASES[indice] ?? 0;

  let d = "";
  for (let i = 0; i <= PASOS; i += 1) {
    const t = (i / PASOS) * Math.PI * 2;
    const r = tamano * (radio + amp * Math.sin(lobulos * t + fase));
    const x = (centro + r * Math.cos(t)).toFixed(2);
    const y = (centro + r * Math.sin(t)).toFixed(2);
    d += `${i === 0 ? "M" : "L"}${x} ${y}`;
  }
  return `${d}Z`;
}

/** El lado del `viewBox` del anillo. */
export const ladoDelAnillo = (tamano: number): number => Math.round(tamano * 1.9);

/**
 * Debajo de esto el aura ya no se distingue: quedan dos hilos pegados al
 * borde de la cara. El paquete la corta en 40 px porque su grosor es fijo;
 * acá el grosor se escala, así que baja hasta 24 sin verse como un borrón.
 */
export const MINIMO_ONDAS = 24;

/**
 * El tamaño sobre el que se midieron los grosores del paquete.
 *
 * El grosor va en unidades del `viewBox`, y el `viewBox` escala con la cara:
 * un trazo de 1,4 sobre un anillo de 122 px es fino, y el mismo 1,4 sobre uno
 * de 53 px es el doble de grueso en proporción. Por eso el paquete corta el
 * aura en 40 px. Escalando el grosor se puede bajar más: a 28 px el aura se ve
 * igual de fina que a 64, solo que más chica.
 */
const TAMANO_DE_REFERENCIA = 64;

/** El grosor de un aro a un tamaño dado, manteniendo la proporción. */
export const grosorDelAro = (grosor: number, tamano: number): number =>
  Math.max(0.35, Number((grosor * (tamano / TAMANO_DE_REFERENCIA)).toFixed(2)));

/**
 * El arco de avance, que reemplaza a las ondas cuando hay una cuenta de por
 * medio.
 *
 * Es más ceñido que el anillo de ondas —1,39 veces la cara, contra 1,9— para
 * que se lea como un borde y no como un halo: esto **mide** algo, no acompaña.
 */
export const ladoDelArco = (tamano: number): number => Math.round(tamano * 1.393);

/** El radio de la pista, dentro de ese lado. */
export const radioDelArco = (lado: number): number => lado * 0.397;

/**
 * El arco sí cabe en tamaños donde las ondas no: es más ceñido y no ondula, así
 * que a 28 px se sigue leyendo como un borde. Ahí va el avatar del encabezado
 * del chat, que es justo donde hace falta mientras María lee.
 */
export const MINIMO_ARCO_TAMANO = 28;

/**
 * Cuánto se dibuja como mínimo, aunque el avance sea cero.
 *
 * Un anillo completamente vacío se lee como roto, no como "todavía no
 * empieza". El paquete dibuja un 8 % ya en «0 de 12», y con la punta
 * redondeada eso queda como una marca en las doce en punto.
 */
export const MINIMO_ARCO = 0.08;

/**
 * El `stroke-dasharray` para un avance entre 0 y 1: lo pintado y lo que falta.
 */
export function trazoDelArco(avance: number, radio: number): string {
  const circunferencia = 2 * Math.PI * radio;
  const parte = Math.min(1, Math.max(MINIMO_ARCO, avance));
  return `${(circunferencia * parte).toFixed(2)} ${(circunferencia * (1 - parte)).toFixed(2)}`;
}
