import { describe, expect, it } from "vitest";

import {
  ladoDelAnillo,
  ladoDelArco,
  MINIMO_ARCO,
  radioDelArco,
  RECETAS,
  trazoDeAro,
  trazoDelArco,
  type Intensidad,
} from "./ondas";

/**
 * La onda no se dibujó a ojo: se calcula. Estas pruebas la anclan a las
 * láminas de `mocks/maria-identidad/`, que es de donde salieron los números.
 *
 * El primer trazo se comparó carácter por carácter contra el archivo original
 * —1 693 caracteres, los mismos 141 puntos— y coincide. Acá quedan fijados
 * sus extremos: si alguien toca la fórmula, la prueba lo dice antes de que la
 * cara se vea distinta.
 */
describe("las ondas de María", () => {
  it("reproduce el trazo de la lámina, punto por punto", () => {
    const trazo = trazoDeAro(64, 0, RECETAS.calma);

    expect(trazo.startsWith("M97.92 60.80L98.26 62.48L98.49 64.19")).toBe(true);
    // Cierra donde empezó: el último punto repite el primero.
    expect(trazo.endsWith("L97.92 60.80Z")).toBe(true);
    expect(trazo).toHaveLength(1693);
  });

  it("escala con el tamaño, sin números sueltos", () => {
    // El anillo mide 1,9 veces la cara.
    expect(ladoDelAnillo(64)).toBe(122);
    expect(ladoDelAnillo(96)).toBe(182);

    const chico = trazoDeAro(32, 0, RECETAS.calma);
    const grande = trazoDeAro(64, 0, RECETAS.calma);
    // El mismo dibujo al doble: misma cantidad de puntos, distinto radio.
    expect(chico.split("L")).toHaveLength(grande.split("L").length);
    expect(chico).not.toBe(grande);
  });

  it("cada aro ondula distinto: es lo que impide que se repita", () => {
    const uno = trazoDeAro(64, 0, RECETAS.alta);
    const dos = trazoDeAro(64, 1, RECETAS.alta);
    const tres = trazoDeAro(64, 2, RECETAS.alta);

    expect(new Set([uno, dos, tres]).size).toBe(3);
  });

  it("sube de intensidad de verdad, no solo de velocidad", () => {
    const orden: Intensidad[] = ["calma", "suave", "media", "alta"];

    for (let i = 1; i < orden.length; i += 1) {
      const antes = RECETAS[orden[i - 1]!]!;
      const ahora = RECETAS[orden[i]!]!;

      expect(ahora.amplitud, `${orden[i]} ondula menos que ${orden[i - 1]}`).toBeGreaterThan(
        antes.amplitud,
      );
      expect(ahora.aros.length).toBeGreaterThanOrEqual(antes.aros.length);
      // Más intensa es más rápida: la vuelta del primer aro dura menos.
      expect(ahora.aros[0]!.vuelta).toBeLessThan(antes.aros[0]!.vuelta);
    }

    // Y solo las dos de arriba respiran: quieta no respira nada.
    expect(RECETAS.calma.respira).toBeUndefined();
    expect(RECETAS.suave.respira).toBeUndefined();
    expect(RECETAS.media.respira).toBe("lento");
    expect(RECETAS.alta.respira).toBe("rapido");
  });
});

describe("el arco de avance", () => {
  const radio = radioDelArco(ladoDelArco(56));

  /** Lo pintado, en proporción de la vuelta entera. */
  const pintado = (avance: number) => {
    const [hecho, falta] = trazoDelArco(avance, radio).split(" ").map(Number);
    return hecho! / (hecho! + falta!);
  };

  it("es más ceñido que el anillo de ondas: esto mide, no acompaña", () => {
    expect(ladoDelArco(56)).toBe(78);
    expect(ladoDelArco(56)).toBeLessThan(ladoDelAnillo(56));
  });

  it("nunca se dibuja en cero, porque un anillo vacío se lee como roto", () => {
    // Con cuatro decimales: el trazo se escribe redondeado a centésimas de
    // píxel, así que exigir más que eso es exigirle al redondeo, no al código.
    expect(pintado(0)).toBeCloseTo(MINIMO_ARCO, 4);
    // Y el mínimo se nota, pero no miente: sigue siendo menos de un décimo.
    expect(pintado(0)).toBeLessThan(0.1);
  });

  it("dice la verdad en el medio y cierra del todo al final", () => {
    expect(pintado(9 / 12)).toBeCloseTo(0.75, 4);
    expect(pintado(1)).toBe(1);
  });

  it("no se pasa de la vuelta si el backend manda de más", () => {
    expect(pintado(1.4)).toBe(1);
  });
});
