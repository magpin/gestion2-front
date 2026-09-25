import { describe, expect, it } from "vitest";

import {
  admiteDecimales,
  esEntero,
  leerNumero,
  mostrarNumero,
} from "./numeros";

describe("mostrarNumero", () => {
  it("pone el punto de mil y deja el valor igual", () => {
    expect(mostrarNumero("30000")).toBe("30.000");
    expect(mostrarNumero("1234567")).toBe("1.234.567");
    expect(mostrarNumero("999")).toBe("999");
    expect(mostrarNumero("-2000")).toBe("-2.000");
  });

  it("los decimales van con coma, y un valor viejo con centavos se ve entero", () => {
    expect(mostrarNumero("1.5")).toBe("1,5");
    expect(mostrarNumero("54621.85")).toBe("54.621,85");
  });

  it("vacío y el signo solo quedan como están", () => {
    expect(mostrarNumero("")).toBe("");
    expect(mostrarNumero("-")).toBe("-");
  });
});

describe("leerNumero · pesos enteros", () => {
  it("el punto es de miles: «30.000» son treinta mil", () => {
    expect(leerNumero("30.000")).toBe("30000");
    expect(leerNumero("1.234.567")).toBe("1234567");
  });

  it("la coma no se adivina: «30,5» se rechaza en vez de volverse 305", () => {
    expect(leerNumero("30,5")).toBeNull();
  });

  it("rechaza letras y el signo si no se admite negativo", () => {
    expect(leerNumero("30a")).toBeNull();
    expect(leerNumero("-500")).toBeNull();
  });

  it("admite negativo donde se pide", () => {
    expect(leerNumero("-2.000", { negativo: true })).toBe("-2000");
    expect(leerNumero("-", { negativo: true })).toBe("-");
  });

  it("quita los ceros a la izquierda y deja vacío lo vacío", () => {
    expect(leerNumero("007")).toBe("7");
    expect(leerNumero("0")).toBe("0");
    expect(leerNumero("")).toBe("");
  });

  it("ida y vuelta: lo que se ve se lee como el mismo valor", () => {
    for (const valor of ["0", "7", "30000", "1234567", "999999999"]) {
      expect(leerNumero(mostrarNumero(valor))).toBe(valor);
    }
  });
});

describe("leerNumero · cantidades con decimales", () => {
  const kg = { decimales: 6 };

  it("la coma es decimal y el punto de mil se quita", () => {
    expect(leerNumero("1,5", kg)).toBe("1.5");
    expect(leerNumero("1.250,75", kg)).toBe("1250.75");
    expect(leerNumero(",5", kg)).toBe("0.5");
  });

  it("deja escribir la coma sola al final, mientras se digita", () => {
    expect(leerNumero("2,", kg)).toBe("2.");
    expect(mostrarNumero("2.")).toBe("2,");
  });

  it("no más de los decimales que guarda la base, ni dos comas", () => {
    expect(leerNumero("1,1234567", kg)).toBeNull();
    expect(leerNumero("1,2,3", kg)).toBeNull();
  });

  it("ida y vuelta con decimales", () => {
    for (const valor of ["1.5", "0.25", "1250.75", "3"]) {
      expect(leerNumero(mostrarNumero(valor), kg)).toBe(valor);
    }
  });
});

describe("admiteDecimales y esEntero", () => {
  it("se fracciona el peso, el volumen y la longitud; no la unidad ni la caja", () => {
    expect(admiteDecimales("KG")).toBe(true);
    expect(admiteDecimales("MT")).toBe(true);
    expect(admiteDecimales("UND")).toBe(false);
    expect(admiteDecimales("CAJA")).toBe(false);
    expect(admiteDecimales(undefined)).toBe(false);
  });

  it("esEntero", () => {
    expect(esEntero("3")).toBe(true);
    expect(esEntero("")).toBe(true);
    expect(esEntero("1.5")).toBe(false);
  });
});
