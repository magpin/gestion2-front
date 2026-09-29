import { describe, expect, it } from "vitest";

import type { CajaResumen } from "../types/tesoreria.types";
import type { CuentaBancariaResumen } from "../types/bancos.types";
import {
  aFormaPago,
  formaPagoVacia,
  problemaFormaPago,
  type FormaPagoBorrador,
} from "./formaPago";

const caja = { id: "caja-1", nombre: "Principal" } as unknown as CajaResumen;
const cuenta = {
  id: "cb-1",
  nombre: "Bancolombia",
} as unknown as CuentaBancariaResumen;

const con = (cambio: Partial<FormaPagoBorrador>): FormaPagoBorrador => ({
  ...formaPagoVacia(),
  ...cambio,
});

describe("problemaFormaPago", () => {
  it("sin elegir no deja guardar: crédito no es el valor por defecto", () => {
    expect(problemaFormaPago(formaPagoVacia())).toMatch(/Elegí cómo se paga/);
  });

  it("crédito no pide nada más", () => {
    expect(problemaFormaPago(con({ modo: "CREDITO" }))).toBeNull();
  });

  it("efectivo pide la caja y transferencia la cuenta", () => {
    expect(problemaFormaPago(con({ modo: "EFECTIVO" }))).toMatch(/caja/);
    expect(problemaFormaPago(con({ modo: "EFECTIVO", caja }))).toBeNull();
    expect(problemaFormaPago(con({ modo: "TRANSFERENCIA" }))).toMatch(/cuenta/);
    expect(
      problemaFormaPago(con({ modo: "TRANSFERENCIA", cuenta })),
    ).toBeNull();
  });

  it("repartido admite un solo valor en blanco", () => {
    const b = formaPagoVacia();
    b.modo = "REPARTIDO";
    b.renglones[0] = { ...b.renglones[0], caja, valor: "" };
    b.renglones[1] = { ...b.renglones[1], cuenta, valor: "" };
    expect(problemaFormaPago(b)).toMatch(/un solo valor/);

    b.renglones[0].valor = "50000";
    expect(problemaFormaPago(b)).toBeNull();
  });
});

describe("aFormaPago", () => {
  it("efectivo es contado con un medio sin valor", () => {
    expect(aFormaPago(con({ modo: "EFECTIVO", caja }))).toEqual({
      formaPago: "CONTADO",
      pagos: [{ medio: "CAJA", cajaId: "caja-1" }],
    });
  });

  it("repartido manda el valor digitado y deja abierto el que quedó en blanco", () => {
    const b = formaPagoVacia();
    b.modo = "REPARTIDO";
    b.renglones[0] = { ...b.renglones[0], caja, valor: "50000" };
    b.renglones[1] = { ...b.renglones[1], cuenta, valor: "" };

    expect(aFormaPago(b)).toEqual({
      formaPago: "CONTADO",
      pagos: [
        { medio: "CAJA", cajaId: "caja-1", valor: 50000 },
        { medio: "BANCO", cuentaBancariaId: "cb-1", valor: undefined },
      ],
    });
  });

  it("crédito no lleva pagos", () => {
    expect(aFormaPago(con({ modo: "CREDITO" }))).toEqual({
      formaPago: "CREDITO",
    });
  });

  it("crédito con vencimiento lo manda; sin él, no manda nada", () => {
    expect(aFormaPago(con({ modo: "CREDITO", vence: "2026-10-31" }))).toEqual({
      formaPago: "CREDITO",
      vence: "2026-10-31",
    });
    expect(aFormaPago(con({ modo: "CREDITO", vence: "" }))).toEqual({
      formaPago: "CREDITO",
    });
  });
});
