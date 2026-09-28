import { afterEach, describe, expect, it } from "vitest";

import { formatFecha } from "./utils";

const zonaOriginal = process.env.TZ;

afterEach(() => {
  process.env.TZ = zonaOriginal;
});

describe("formatFecha", () => {
  it("sin fecha pone la raya", () => {
    expect(formatFecha(null)).toBe("—");
    expect(formatFecha(undefined)).toBe("—");
    expect(formatFecha("")).toBe("—");
  });

  it("una fecha sin hora (columna date) sale el mismo día en Colombia", () => {
    process.env.TZ = "America/Bogota";
    expect(formatFecha("2026-09-28")).toBe("28 sep 2026");
    expect(formatFecha("2026-01-01")).toBe("01 ene 2026");
  });

  it("una fecha sin hora no se corre en ninguna zona", () => {
    for (const zona of ["UTC", "America/Bogota", "Asia/Tokyo", "Pacific/Honolulu"]) {
      process.env.TZ = zona;
      expect(formatFecha("2026-09-28")).toBe("28 sep 2026");
    }
  });

  it("un instante (timestamp) sí se pasa a la hora local", () => {
    process.env.TZ = "America/Bogota";
    // Las 2 a. m. UTC del 28 son las 9 p. m. del 27 en Bogotá.
    expect(formatFecha("2026-09-28T02:00:00.000Z")).toBe("27 sep 2026");
    expect(formatFecha("2026-09-28T15:00:00.000Z")).toBe("28 sep 2026");
  });
});
