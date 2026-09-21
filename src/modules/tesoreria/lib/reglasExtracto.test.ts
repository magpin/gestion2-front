import { describe, expect, it } from "vitest";

import {
  REGLAS_SUGERIDAS,
  leerPalabras,
  problemaRegla,
  type BorradorRegla,
} from "./reglasExtracto";

const BUENA: BorradorRegla = {
  nombre: "4×1000",
  palabras: "GMF, 4X1000",
  tipoLinea: "DEBITO",
  concepto: "Gravamen a los movimientos financieros",
};

describe("leerPalabras", () => {
  it("separa por coma, limpia espacios y descarta vacías", () => {
    expect(leerPalabras(" GMF ,, 4X1000 ,")).toEqual(["GMF", "4X1000"]);
  });

  it("no repite la misma palabra escrita distinto", () => {
    expect(leerPalabras("gmf, GMF, Gmf")).toEqual(["gmf"]);
  });

  it("junta los espacios de una frase", () => {
    expect(leerPalabras("CUOTA   DE  MANEJO")).toEqual(["CUOTA DE MANEJO"]);
  });
});

describe("problemaRegla", () => {
  it("una regla completa no tiene problema", () => {
    expect(problemaRegla(BUENA)).toBeNull();
  });

  it("sin palabras no reconoce nada", () => {
    expect(problemaRegla({ ...BUENA, palabras: " , " })).toMatch(/al menos una/);
  });

  it("más de 10 palabras las rechazaría el backend", () => {
    const once = Array.from({ length: 11 }, (_, i) => `P${i}X`).join(",");
    expect(problemaRegla({ ...BUENA, palabras: once })).toMatch(/10/);
  });

  it("señala la palabra de una sola letra", () => {
    expect(problemaRegla({ ...BUENA, palabras: "GMF, X" })).toMatch(/«X»/);
  });

  it("pide concepto", () => {
    expect(problemaRegla({ ...BUENA, concepto: "  " })).toMatch(/concepto/);
  });

  it("las sugeridas pasan la validación: solo les falta la cuenta", () => {
    for (const s of REGLAS_SUGERIDAS) expect(problemaRegla(s)).toBeNull();
  });
});
