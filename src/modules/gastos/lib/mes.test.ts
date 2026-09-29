import { describe, expect, it } from "vitest";

import { mesDeHoy, moverMes, nombreMes } from "./mes";

describe("mes de Gastos", () => {
  it("de hoy, su nombre y sus vecinos", () => {
    expect(mesDeHoy(new Date(2026, 8, 28))).toBe("2026-09");
    expect(nombreMes("2026-09")).toBe("Septiembre 2026");
    expect(moverMes("2026-01", -1)).toBe("2025-12");
    expect(moverMes("2026-12", 1)).toBe("2027-01");
  });
});
