import { describe, expect, it } from "vitest";

import type { CajaResumen } from "../types/tesoreria.types";
import type { CuentaBancariaResumen } from "../types/bancos.types";
import {
  aFormaPago,
  formaPagoVacia,
  problemaFormaPago,
  renglonRepartoVacio,
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

describe("pagar con anticipo", () => {
  const anticipo = { tipo: "ANTICIPO" as const, origenId: "ant-1", etiqueta: "Anticipo del 28 sep", disponible: 300000 };

  it("pide marcar un anticipo y no deja pasar de lo que le queda", () => {
    expect(problemaFormaPago(con({ modo: "ANTICIPO" }))).toMatch(/marcar el anticipo/);
    expect(problemaFormaPago(con({ modo: "ANTICIPO", aplicados: [{ ...anticipo, valor: "300001" }] }))).toMatch(
      /solo le quedan/,
    );
  });

  it("si el anticipo cubre la factura, no pide cómo se paga el resto", () => {
    const b = con({ modo: "ANTICIPO", aplicados: [{ ...anticipo, valor: "300000" }] });
    expect(problemaFormaPago(b, 300000)).toBeNull();
    expect(problemaFormaPago(b, 500000)).toMatch(/caja donde entra el resto/);
  });

  it("aplica el anticipo y el resto va por el medio elegido, sin valor", () => {
    expect(aFormaPago(con({ modo: "ANTICIPO", caja, aplicados: [{ ...anticipo, valor: "100000" }] }))).toEqual({
      formaPago: "CONTADO",
      pagos: [{ medio: "CAJA", cajaId: "caja-1" }],
      aplicar: [{ tipo: "ANTICIPO", origenId: "ant-1", valor: 100000 }],
    });
    expect(
      aFormaPago(con({ modo: "ANTICIPO", resto: "CREDITO", aplicados: [{ ...anticipo, valor: "100000" }] })),
    ).toEqual({ formaPago: "CREDITO", aplicar: [{ tipo: "ANTICIPO", origenId: "ant-1", valor: 100000 }] });
  });

  it("en el repartido, el renglón de anticipo va a `aplicar` y los demás a `pagos`", () => {
    const b = con({
      modo: "REPARTIDO",
      renglones: [
        { ...renglonRepartoVacio("ANTICIPO"), anticipo, valor: "300000" },
        { ...renglonRepartoVacio("CAJA"), caja, valor: "" },
      ],
    });
    expect(problemaFormaPago(b)).toBeNull();
    expect(aFormaPago(b)).toEqual({
      formaPago: "CONTADO",
      pagos: [{ medio: "CAJA", cajaId: "caja-1", valor: undefined }],
      aplicar: [{ tipo: "ANTICIPO", origenId: "ant-1", valor: 300000 }],
    });
  });
});
