import { describe, expect, it } from "vitest";

import { aEnvioProntoPago, problemaProntoPago } from "./prontoPago";

describe("pronto pago de la compra", () => {
  it("van juntos o ninguno", () => {
    expect(problemaProntoPago("", "", "2026-09-01")).toBeNull();
    expect(problemaProntoPago("2", "", "2026-09-01")).toMatch(/ninguno/);
    expect(aEnvioProntoPago("2", "")).toEqual({});
  });

  it("el porcentaje es razonable y el plazo no es anterior a la factura", () => {
    expect(problemaProntoPago("100", "2026-09-30", "2026-09-01")).toMatch(/entre 0 y 100/);
    expect(problemaProntoPago("2", "2026-08-30", "2026-09-01")).toMatch(/anterior/);
    expect(problemaProntoPago("2", "2026-09-30", "2026-09-01")).toBeNull();
    expect(aEnvioProntoPago("2", "2026-09-30")).toEqual({
      descuentoProntoPagoPct: 2,
      descuentoProntoPagoHasta: "2026-09-30",
    });
  });
});
