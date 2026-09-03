import { describe, expect, it } from "vitest";

import { proximoCodigo, raices } from "./arbol";

const c = (codigo: string, codigo_padre: string | null = null) => ({ codigo, codigo_padre });

describe("raices · qué va al primer nivel del árbol", () => {
  it("la cuenta sin madre es raíz", () => {
    expect(raices([c("110505"), c("11050501", "110505")]).map((x) => x.codigo)).toEqual(["110505"]);
  });

  it("buscando, el auxiliar sin su madre también es raíz", () => {
    // Al filtrar por texto puede coincidir el auxiliar y no su cuenta madre.
    // Sin esto el resultado no se mostraría nunca.
    expect(raices([c("11050501", "110505")]).map((x) => x.codigo)).toEqual(["11050501"]);
  });

  it("con la madre presente, el auxiliar no se duplica arriba", () => {
    const r = raices([c("110505"), c("11050501", "110505"), c("111005")]);
    expect(r.map((x) => x.codigo)).toEqual(["110505", "111005"]);
  });
});

describe("proximoCodigo · el consecutivo del auxiliar", () => {
  it("el primero de una cuenta sin auxiliares", () => {
    expect(proximoCodigo("110505", [])).toBe("11050501");
  });

  it("sigue al mayor existente", () => {
    expect(proximoCodigo("110505", [c("11050501"), c("11050502")])).toBe("11050503");
  });

  it("no reusa el hueco de uno desactivado en el medio", () => {
    // Reusar el 02 dejaría dos cuentas distintas con el mismo código en la
    // historia del libro.
    expect(proximoCodigo("110505", [c("11050501"), c("11050503")])).toBe("11050504");
  });

  it("se ensancha al pasar de 99 en vez de repetir el último", () => {
    expect(proximoCodigo("110505", [c("11050599")])).toBe("110505100");
  });

  it("funciona sobre una cuenta de cuatro dígitos, donde el decreto deja el rango libre", () => {
    expect(proximoCodigo("2205", [c("220505")])).toBe("220506");
  });

  it("ignora hermanos que no cuelgan de esta madre", () => {
    expect(proximoCodigo("110505", [c("11100501"), c("11050501")])).toBe("11050502");
  });
});
