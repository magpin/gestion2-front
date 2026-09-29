import { describe, expect, it } from "vitest";

import type { FacturaPorCobrar } from "../types/cobros.types";
import {
  abonosIniciales,
  alternar,
  cambiarDescuento,
  cambiarValor,
  problemaDelRecibo,
  totalDescuentos,
  totalRecibo,
} from "./recibo";

const factura = (id: string, pendiente: number): FacturaPorCobrar => ({
  id,
  numero: `FEV-${id}`,
  fecha: "2026-07-01",
  vence: null,
  venceEfectivo: "2026-07-31",
  diasVencidos: 59,
  edad: "D31_60",
  pendiente,
});

const facturas = [factura("1", 1_980_000), factura("2", 820_000)];

describe("recibo de caja", () => {
  it("desde el atajo de una factura, arranca con esa marcada por su saldo", () => {
    const abonos = abonosIniciales(facturas, "2");
    expect(abonos.map((a) => [a.marcada, a.valor])).toEqual([
      [false, ""],
      [true, "820000"],
    ]);
  });

  it("marcar propone el saldo; desmarcar lo borra", () => {
    let abonos = abonosIniciales(facturas);
    abonos = alternar(abonos, "1");
    expect(totalRecibo(abonos)).toBe(1_980_000);
    abonos = alternar(abonos, "1");
    expect(totalRecibo(abonos)).toBe(0);
  });

  it("escribir un valor marca la factura: no hay casilla vacía con plata al lado", () => {
    const abonos = cambiarValor(abonosIniciales(facturas), "2", "500000");
    expect(abonos[1].marcada).toBe(true);
    expect(totalRecibo(abonos)).toBe(500_000);
  });

  it("no deja abonar más que el saldo, ni un recibo vacío", () => {
    expect(problemaDelRecibo(abonosIniciales(facturas))).toMatch(/al menos una/);
    expect(problemaDelRecibo(cambiarValor(abonosIniciales(facturas), "2", "900000"))).toMatch(/FEV-2/);
    expect(problemaDelRecibo(cambiarValor(abonosIniciales(facturas), "2", "820000"))).toBeNull();
  });
});

describe("recibo de caja: descuento, anticipo y comisión", () => {
  it("el descuento baja el abono cuando se pagaba el saldo entero", () => {
    let abonos = abonosIniciales(facturas, "1");
    abonos = cambiarDescuento(abonos, "1", "39600");
    expect(abonos[0].valor).toBe("1940400");
    expect(totalRecibo(abonos)).toBe(1_940_400);
    expect(totalDescuentos(abonos)).toBe(39_600);
    expect(problemaDelRecibo(abonos)).toBeNull();
  });

  it("abono y descuento no pueden pasar del saldo", () => {
    let abonos = cambiarValor(abonosIniciales(facturas), "2", "820000");
    abonos = abonos.map((a) => (a.factura.id === "2" ? { ...a, descuento: "10" } : a));
    expect(problemaDelRecibo(abonos)).toMatch(/FEV-2/);
  });

  it("un anticipo solo es un recibo; la comisión no puede llevarse todo", () => {
    expect(problemaDelRecibo(abonosIniciales(facturas), "500000")).toBeNull();
    expect(problemaDelRecibo(abonosIniciales(facturas), "500000", "500000")).toMatch(/comisión/);
  });
});

describe("comprobante de egreso: el descuento sugerido del proveedor", () => {
  it("marcar una compra en plazo propone el descuento y baja el pago", () => {
    const compra = { id: "c", numero: "FC-9", pendiente: 1_000_000, descuentoSugerido: 20_000 };
    const [a] = alternar(abonosIniciales([compra]), "c");
    expect([a.valor, a.descuento]).toEqual(["980000", "20000"]);
    expect(problemaDelRecibo([a], "", "", "compra")).toBeNull();
  });
});
