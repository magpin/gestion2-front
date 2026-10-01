import { describe, expect, it } from "vitest";

import { alMil, estadoEnPalabras, fechaCorta } from "./impuestos";
import type { FilaCalendario } from "../types/impuestos.types";

const fila = (situacion: FilaCalendario["situacion"], extra: Partial<FilaCalendario> = {}): FilaCalendario => ({
  obligacion: "RETENCION",
  periodo: "2026-09",
  municipio: null,
  etiqueta: "Retención en la fuente · septiembre",
  formulario: "350",
  vence: "2026-10-21",
  situacion,
  valor: 850_700,
  declaracion: null,
  ...extra,
});

describe("impuestos en pantalla", () => {
  it("las fechas y el mil", () => {
    expect(fechaCorta("2026-10-21")).toBe("Mié 21 oct");
    expect(alMil(850_650)).toBe(851_000);
    expect(alMil(850_400)).toBe(850_000);
  });

  it("en qué va, en palabras, y de qué color", () => {
    expect(estadoEnPalabras(fila({ estado: "CAUSANDOSE", dias: null, vencida: false }))).toEqual({
      texto: "Causándose",
      tono: "neutro",
    });
    expect(estadoEnPalabras(fila({ estado: "PRESENTADA", dias: 7, vencida: false }))).toEqual({
      texto: "Presentada · por pagar · 7 días",
      tono: "aviso",
    });
    expect(estadoEnPalabras(fila({ estado: "POR_PRESENTAR", dias: 0, vencida: false })).texto).toBe(
      "Por presentar · vence hoy",
    );
    expect(estadoEnPalabras(fila({ estado: "PRESENTADA", dias: -2, vencida: true }))).toEqual({
      texto: "Vencida hace 2 días",
      tono: "error",
    });
  });
});

describe("períodos del IVA", () => {
  it("se mueven y se dicen en palabras", async () => {
    const { moverPeriodo, periodoEnPalabras } = await import("./impuestos");
    expect(moverPeriodo("2026-C3", 1)).toBe("2027-C1");
    expect(moverPeriodo("2026-C1", -1)).toBe("2025-C3");
    expect(moverPeriodo("2026-B6", 1)).toBe("2027-B1");
    expect(periodoEnPalabras("2026-C3")).toBe("septiembre a diciembre de 2026");
    expect(periodoEnPalabras("2026-B5")).toBe("septiembre a octubre de 2026");
    // El ReteICA de algunos municipios es mensual o anual.
    expect(moverPeriodo("2026-01", -1)).toBe("2025-12");
    expect(moverPeriodo("2026-12", 1)).toBe("2027-01");
    expect(moverPeriodo("2025", 1)).toBe("2026");
    expect(periodoEnPalabras("2026-09")).toBe("septiembre de 2026");
    expect(periodoEnPalabras("2025")).toBe("2025");
  });
});
