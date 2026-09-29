import { describe, expect, it } from "vitest";

import {
  fechaCorta,
  formatoPorcentaje,
  mesCorto,
  opcionesComparar,
  valoresBalance,
  valoresResultados,
  variacion,
} from "./estados";
import type { BalanceGeneral, EstadoResultados } from "../types/estados.types";

describe("estados financieros en pantalla", () => {
  it("la variación, como la cuenta el backend", () => {
    expect(variacion(41_850_000, 38_900_000)).toBe(7.6);
    expect(variacion(-100, -200)).toBe(50);
    expect(variacion(5, 0)).toBeNull();
    expect(formatoPorcentaje(7.6)).toBe("+7,6 %");
    expect(formatoPorcentaje(-3)).toBe("-3 %");
    expect(formatoPorcentaje(15.7, false)).toBe("15,7 %");
    expect(formatoPorcentaje(null)).toBe("—");
  });

  it("los meses y las fechas", () => {
    expect(mesCorto("2026-09")).toBe("Sep 2026");
    expect(fechaCorta("2026-09-30")).toBe("30 sep 2026");
    const opciones = opcionesComparar("2026-01");
    expect(opciones[0]).toEqual({ value: "", label: "Sin comparar" });
    expect(opciones[1].value).toBe("2025-12");
    expect(opciones[2].value).toBe("2025-01");
    expect(opciones.map((o) => o.value)).not.toContain("2026-01");
    expect(new Set(opciones.map((o) => o.value)).size).toBe(opciones.length);
  });

  it("los valores comparados, por clave y por cuenta", () => {
    const estado: EstadoResultados = {
      renglones: [
        {
          clave: "ingresos_op",
          etiqueta: "Ingresos operacionales",
          valor: 100,
          tipo: "grupo",
          cuentas: [{ codigo: "413505", nombre: "Venta", valor: 100 }],
        },
        { clave: "bruta", etiqueta: "Utilidad bruta", valor: 60, tipo: "subtotal" },
      ],
      ingresosOperacionales: 100,
      utilidadBruta: 60,
      utilidadOperacional: 60,
      utilidadAntesDeImpuestos: 60,
      utilidadNeta: 60,
    };
    const r = valoresResultados(estado);
    expect(r.get("bruta")).toBe(60);
    expect(r.get("ingresos_op:413505")).toBe(100);
    expect(valoresResultados(undefined).size).toBe(0);

    const balance: BalanceGeneral = {
      activo: {
        total: 50,
        secciones: [
          {
            etiqueta: "Activo corriente",
            total: 50,
            renglones: [{ grupo: "11", etiqueta: "Disponible", valor: 50, cuentas: [{ codigo: "110505", nombre: "Caja", valor: 50 }] }],
          },
        ],
      },
      pasivo: { total: 20, secciones: [] },
      patrimonio: { total: 30, secciones: [] },
      diferencia: 0,
    };
    const b = valoresBalance(balance);
    expect(b.get("11")).toBe(50);
    expect(b.get("cuenta:110505")).toBe(50);
    expect(b.get("seccion:Activo corriente")).toBe(50);
    expect(b.get("total:pasivoPatrimonio")).toBe(50);
  });
});
