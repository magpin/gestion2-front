import { describe, expect, it } from "vitest";

import { sumarTotales, totalesDeLinea } from "./totales";

describe("totalesDeLinea", () => {
  it("la tinta Epson 664: el precio sin IVA vuelve a dar los $30.000 de la lista", () => {
    expect(totalesDeLinea(1, 25210.08, 19)).toEqual({
      subtotal: 25210.08,
      iva: 4789.92,
      total: 30000,
    });
  });

  it("con cantidad, el IVA se calcula sobre el subtotal y no por unidad", () => {
    expect(totalesDeLinea(3, 37815.13, 19)).toEqual({
      subtotal: 113445.39,
      iva: 21554.62,
      total: 135000.01,
    });
  });

  it("sin IVA, el total es el subtotal", () => {
    expect(totalesDeLinea(2, 35000, 0)).toEqual({
      subtotal: 70000,
      iva: 0,
      total: 70000,
    });
  });

  it("una cantidad en kilos", () => {
    expect(totalesDeLinea(0.72, 100000, 19).total).toBe(85680);
  });
});

describe("sumarTotales", () => {
  it("suma en centavos, sin arrastrar decimales de coma flotante", () => {
    const suma = sumarTotales([
      totalesDeLinea(1, 25210.08, 19),
      totalesDeLinea(1, 54621.85, 19),
      totalesDeLinea(1, 0.1, 0),
      totalesDeLinea(1, 0.2, 0),
    ]);
    expect(suma).toEqual({ subtotal: 79832.23, iva: 15168.07, total: 95000.3 });
  });
});
