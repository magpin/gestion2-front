import { describe, expect, it } from "vitest";

import { venceConPlazo } from "./plazo";

describe("venceConPlazo", () => {
  it("suma los días, cruzando el mes y el año", () => {
    expect(venceConPlazo("2026-09-29", 45)).toBe("2026-11-13");
    expect(venceConPlazo("2026-12-20", 30)).toBe("2027-01-19");
  });

  it("cero días es de contado: vence el mismo día", () => {
    expect(venceConPlazo("2026-09-29", 0)).toBe("2026-09-29");
  });

  it("sin plazo o sin fecha no propone nada", () => {
    expect(venceConPlazo("2026-09-29", null)).toBeNull();
    expect(venceConPlazo("", 30)).toBeNull();
  });
});
