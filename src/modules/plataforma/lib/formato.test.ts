import { describe, expect, it } from "vitest";

import { fecha, hora } from "./formato";

describe("fecha", () => {
  it("una fecha sin hora (columna date) no se corre al día anterior", () => {
    expect(fecha("2026-09-28")).toBe("28/09/2026");
    expect(fecha("2026-01-01")).toBe("01/01/2026");
  });

  it("un instante se escribe en la hora de Colombia", () => {
    // Las 2 a. m. UTC del 28 son las 9 p. m. del 27 en Bogotá.
    expect(fecha("2026-09-28T02:00:00.000Z")).toBe("27/09/2026");
    expect(hora("2026-09-28T02:00:00.000Z")).toBe("21:00");
  });
});
