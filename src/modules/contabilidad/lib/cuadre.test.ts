import { describe, expect, it } from "vitest";

import {
  calcularCuadre,
  contrapartida,
  nombrarRenglones,
  renglonesSinUnaPata,
  type LineaEditable,
} from "./cuadre";

const debe = (v: string): LineaEditable => ({ debito: v, credito: "" });
const acredita = (v: string): LineaEditable => ({ debito: "", credito: v });

describe("calcularCuadre", () => {
  it("cuadra cuando las dos columnas suman igual", () => {
    const r = calcularCuadre([debe("500000"), acredita("500000")]);

    expect(r.cuadra).toBe(true);
    expect(r.diferencia).toBe(0);
    expect(r.falta).toBeNull();
  });

  it("cuadra con varias líneas por lado", () => {
    // Una compra con IVA: el gasto y su IVA contra la cuenta por pagar.
    const r = calcularCuadre([
      debe("1000000"),
      debe("190000"),
      acredita("1190000"),
    ]);

    expect(r.cuadra).toBe(true);
    expect(r.totalDebito).toBe(1190000);
  });

  it("dice de qué lado falta, no solo que no cuadra", () => {
    // Sin esto hay que sumar a mano las dos columnas para saber para dónde ir.
    expect(calcularCuadre([debe("500000"), acredita("488000")]).falta).toBe(
      "CREDITO",
    );
    expect(calcularCuadre([debe("488000"), acredita("500000")]).falta).toBe(
      "DEBITO",
    );
  });

  it("la diferencia siempre es positiva", () => {
    expect(calcularCuadre([debe("100"), acredita("300")]).diferencia).toBe(200);
    expect(calcularCuadre([debe("300"), acredita("100")]).diferencia).toBe(200);
  });

  it("un campo vacío vale cero y no rompe la suma", () => {
    // Es el estado de toda línea recién agregada.
    const r = calcularCuadre([debe("100"), { debito: "", credito: "" }]);

    expect(r.totalDebito).toBe(100);
    expect(r.totalCredito).toBe(0);
  });

  it("un texto que no es número vale cero", () => {
    expect(calcularCuadre([{ debito: "abc", credito: "" }]).totalDebito).toBe(0);
  });

  it("no se descuadra por el error de punto flotante", () => {
    // 0.1 + 0.2 !== 0.3 sumando en pesos: el asiento quedaría descuadrado por
    // una diferencia que no existe.
    const r = calcularCuadre([debe("0.1"), debe("0.2"), acredita("0.3")]);

    expect(r.cuadra).toBe(true);
  });

  it("una lista vacía cuadra en cero", () => {
    expect(calcularCuadre([]).cuadra).toBe(true);
  });
});

describe("contrapartida", () => {
  it("propone lo que falta y de qué lado", () => {
    expect(contrapartida([debe("500000")])).toEqual({
      lado: "CREDITO",
      valor: 500000,
    });
    expect(contrapartida([acredita("300000")])).toEqual({
      lado: "DEBITO",
      valor: 300000,
    });
  });

  it("propone solo la diferencia, no el total", () => {
    const r = contrapartida([debe("500000"), acredita("200000")]);

    expect(r).toEqual({ lado: "CREDITO", valor: 300000 });
  });

  it("no propone nada si ya cuadra", () => {
    // Agregar una tercera línea a un asiento cuadrado es un caso real —un
    // descuento, un impuesto— y ahí no hay nada que adivinar.
    expect(contrapartida([debe("100"), acredita("100")])).toBeNull();
  });
});

describe("renglonesSinUnaPata", () => {
  it("acepta las líneas con exactamente una pata", () => {
    expect(renglonesSinUnaPata([debe("100"), acredita("100")])).toEqual([]);
  });

  it("señala la línea con las dos patas", () => {
    const lineas = [debe("100"), { debito: "50", credito: "50" }];

    expect(renglonesSinUnaPata(lineas)).toEqual([2]);
  });

  it("señala la línea vacía", () => {
    expect(renglonesSinUnaPata([debe("100"), { debito: "", credito: "" }]))
      .toEqual([2]);
  });

  it("numera desde 1, como los ve quien digita", () => {
    expect(renglonesSinUnaPata([{ debito: "", credito: "" }])).toEqual([1]);
  });
});

describe("nombrarRenglones", () => {
  it("usa singular con una sola", () => {
    expect(nombrarRenglones([3])).toBe("la línea 3");
  });

  it("usa plural y coordina la última con «y»", () => {
    expect(nombrarRenglones([3, 7])).toBe("las líneas 3 y 7");
    expect(nombrarRenglones([1, 3, 7])).toBe("las líneas 1, 3 y 7");
  });

  it("con ninguna devuelve vacío", () => {
    expect(nombrarRenglones([])).toBe("");
  });
});
