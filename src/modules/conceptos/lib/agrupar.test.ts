import { describe, expect, it } from "vitest";

import type { Concepto } from "../types/conceptos.types";
import { agruparConceptos } from "./agrupar";

const concepto = (nombre: string, grupo: string, codigo: string, pistas: string[] = []): Concepto => ({
  id: nombre,
  codigo: nombre,
  nombre,
  grupo,
  tipo: "GASTO",
  tipoFlujo: "OPERACION",
  cuenta: { id: codigo, codigo, nombre: "cuenta" },
  operacional: true,
  afectaResultado: true,
  automatico: false,
  esSistema: true,
  pistas,
  activo: true,
  usos: 0,
});

const lista = [
  concepto("Sueldos", "Personal", "510506", ["nómina"]),
  concepto("Energía eléctrica", "Arriendos y servicios", "513530", ["luz"]),
  concepto("Teléfono e internet", "Arriendos y servicios", "513535"),
];

describe("agruparConceptos", () => {
  it("agrupa en el orden en que llegan", () => {
    expect(agruparConceptos(lista, "").map((g) => [g.grupo, g.conceptos.length])).toEqual([
      ["Personal", 1],
      ["Arriendos y servicios", 2],
    ]);
  });

  it("busca por pista, sin tildes", () => {
    expect(agruparConceptos(lista, "nomina")[0].conceptos[0].nombre).toBe("Sueldos");
    expect(agruparConceptos(lista, "luz")[0].conceptos[0].nombre).toBe("Energía eléctrica");
  });

  it("busca por código de cuenta", () => {
    expect(agruparConceptos(lista, "5135").flatMap((g) => g.conceptos)).toHaveLength(2);
  });
});
