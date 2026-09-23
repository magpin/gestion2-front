import { describe, expect, it } from "vitest";

import { LIMITES, limiteDelTurno } from "./limites";
import type { EstadoTurno } from "../types/conversacion.types";

/**
 * Los cuatro casos de «no se puede» se veían todos iguales. Lo que se prueba
 * acá es que cada uno tenga su cara y que ninguno se quede en decir qué falló.
 */
describe("los límites de María", () => {
  it("le da una cara distinta a no entender y a no poder", () => {
    expect(limiteDelTurno("FALLO")?.cara).toBe("noPude");
    expect(limiteDelTurno("RECHAZADO")?.cara).toBe("noEntendi");
  });

  it("distingue «no está» de «no pude»", () => {
    // Que el proveedor no conteste no es haberlo intentado y fallado: es que
    // el asistente no está. Sin saldo o sin clave, duerme.
    expect(limiteDelTurno("FALLO", "SIN_SALDO")?.cara).toBe("dormida");
    expect(limiteDelTurno("FALLO", "SIN_CLAVE")?.cara).toBe("dormida");
    expect(limiteDelTurno("FALLO", "NO_DISPONIBLE")?.cara).toBe("dormida");
    // Una petición mal armada sí es un intento que salió mal.
    expect(limiteDelTurno("FALLO", "PETICION")?.cara).toBe("noPude");
    expect(limiteDelTurno("FALLO", "FALLA")?.cara).toBe("noPude");
  });

  it("no dramatiza lo que sí se contestó", () => {
    // Una respuesta cortada alcanzó a decir algo, y eso vale.
    expect(limiteDelTurno("CORTADO")).toBeNull();
    expect(limiteDelTurno("COMPLETO")).toBeNull();
  });

  it("cubre todos los estados de turno que existen", () => {
    const estados: EstadoTurno[] = ["COMPLETO", "CORTADO", "RECHAZADO", "FALLO"];
    // Si mañana aparece un estado nuevo, el `switch` deja de compilar; esto
    // solo confirma que ninguno de los de hoy revienta.
    for (const estado of estados) {
      expect(() => limiteDelTurno(estado)).not.toThrow();
    }
  });

  it("cada límite dice qué sigue, no solo qué pasó", () => {
    for (const [clave, limite] of Object.entries(LIMITES)) {
      expect(limite.titulo.length, `${clave} sin título`).toBeGreaterThan(0);
      // La salida es la parte que deja a la persona en otro lugar del que
      // estaba: un aviso que solo informa del problema no sirve de nada.
      expect(limite.salida.length, `${clave} no dice qué hacer`).toBeGreaterThan(10);
    }
  });

  it("ninguno se anuncia como error de quien pregunta", () => {
    for (const [clave, limite] of Object.entries(LIMITES)) {
      expect(limite.titulo.toLowerCase(), `${clave} suena a error`).not.toContain("error");
    }
  });
});
