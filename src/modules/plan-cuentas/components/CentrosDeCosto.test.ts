import { describe, expect, it } from "vitest";

import type { CentroCosto } from "../types/plan-cuentas.types";
import { enArbol } from "./CentrosDeCosto";
import { sumaPorcentajes } from "./RepartosCentros";

const centro = (id: string, padreId: string | null = null): CentroCosto => ({
  id,
  codigo: id.toUpperCase(),
  nombre: id,
  activo: true,
  padreId,
  sedeId: null,
  sedeNombre: null,
  tipo: "PRODUCTIVO",
  esPorDefecto: false,
  agrupa: false,
});

describe("enArbol", () => {
  it("pone cada hijo debajo de su padre, aunque venga antes en la lista", () => {
    const filas = enArbol([centro("adm"), centro("n-v", "norte"), centro("norte"), centro("n-b", "norte")]);
    expect(filas.map((f) => [f.centro.id, f.nivel])).toEqual([
      ["adm", 0],
      ["norte", 0],
      ["n-v", 1],
      ["n-b", 1],
    ]);
  });

  it("un hijo cuyo padre no está a la vista va suelto, con sangría", () => {
    const filas = enArbol([centro("n-v", "norte")]);
    expect(filas).toEqual([{ centro: centro("n-v", "norte"), nivel: 1 }]);
  });
});

describe("sumaPorcentajes", () => {
  it("suma con cuatro decimales y trata lo vacío como cero", () => {
    expect(sumaPorcentajes([{ porcentaje: "33.3333" }, { porcentaje: "33.3333" }, { porcentaje: "33.3334" }])).toBe(100);
    expect(sumaPorcentajes([{ porcentaje: "60" }, { porcentaje: "" }])).toBe(60);
  });
});
