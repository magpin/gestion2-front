import { describe, expect, it } from "vitest";

import {
  sumarTotales,
  totalesDeLinea,
  totalesDelBorrador,
  type LineaParaTotales,
} from "./totales";

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

describe("totalesDelBorrador", () => {
  const producto = (iva: number) => ({ iva_tarifa: String(iva) });
  const linea = (o: Partial<LineaParaTotales>): LineaParaTotales => ({
    producto: producto(19),
    cantidad: "1",
    precioUnitario: "",
    ...o,
  });

  it("toma el precio de lista y deja pendientes las líneas incompletas", () => {
    const r = totalesDelBorrador(
      [linea({}), linea({ producto: null }), linea({ cantidad: "" })],
      () => 25210.08,
      true,
    );
    expect(r.porLinea[0]).toEqual({ subtotal: 25210.08, iva: 4789.92, total: 30000, tarifa: 19 });
    expect(r.porLinea[1]).toBeNull();
    expect(r.porLinea[2]).toBeNull();
    expect(r.pendientes).toBe(2);
    expect(r.totales).toEqual({ subtotal: 25210.08, iva: 4789.92, total: 30000 });
  });

  it("una empresa que no es responsable no liquida IVA", () => {
    const r = totalesDelBorrador([linea({ cantidad: "2" })], () => 1000, false);
    expect(r.totales).toEqual({ subtotal: 2000, iva: 0, total: 2000 });
    expect(r.porLinea[0]?.tarifa).toBe(0);
  });

  it("la línea de concepto lleva su precio y su tarifa", () => {
    const r = totalesDelBorrador(
      [linea({ tipo: "CONCEPTO", producto: null, precioUnitario: "100000", ivaTarifa: "5" })],
      () => null,
      true,
    );
    expect(r.totales).toEqual({ subtotal: 100000, iva: 5000, total: 105000 });
  });

  it("el precio digitado manda sobre el de lista", () => {
    const r = totalesDelBorrador([linea({ precioUnitario: "20000" })], () => 25210.08, true);
    expect(r.totales.subtotal).toBe(20000);
  });

  it("sin lista y sin digitar, la línea queda pendiente", () => {
    const r = totalesDelBorrador([linea({})], () => null, true);
    expect(r.pendientes).toBe(1);
  });

  it("la nota débito solo cuenta el digitado", () => {
    const r = totalesDelBorrador([linea({})], () => 25210.08, true, { siempreDigitado: true });
    expect(r.porLinea[0]).toBeNull();
  });
});
