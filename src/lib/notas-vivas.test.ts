import { describe, expect, it } from "vitest";

import { avisoNotasVivas } from "./notas-vivas";

describe("avisoNotasVivas", () => {
  it("no avisa nada sin notas, o con todas anuladas", () => {
    expect(avisoNotasVivas("factura", undefined)).toBeNull();
    expect(avisoNotasVivas("factura", [])).toBeNull();
    expect(
      avisoNotasVivas("factura", [
        { tipo: "NOTA_CREDITO", estado: "ANULADA", numero: "NC-5" },
      ]),
    ).toBeNull();
  });

  it("nombra la única nota viva, con el mismo texto que el backend", () => {
    expect(
      avisoNotasVivas("factura", [
        { tipo: "NOTA_CREDITO", estado: "ANULADA", numero: "NC-4" },
        { tipo: "NOTA_CREDITO", estado: "EMITIDA", numero: "NC-5" },
      ]),
    ).toBe("Esta factura tiene la nota crédito NC-5 viva: anulala primero.");
  });

  it("nombra todas cuando son varias, crédito y débito", () => {
    expect(
      avisoNotasVivas("compra", [
        { tipo: "NOTA_CREDITO", estado: "EMITIDA", numero: "NC-77" },
        { tipo: "NOTA_DEBITO", estado: "EMITIDA", numero: "ND-3" },
      ]),
    ).toBe(
      "Esta compra tiene vivas la nota crédito NC-77 y la nota débito ND-3: anulalas primero.",
    );
  });
});
