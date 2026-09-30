import { describe, expect, it } from "vitest";

import type { OrigenArmador } from "../types/armador.types";
import { celda, definicionInicial, resumenEnPalabras } from "./definicion";

const VENTAS: OrigenArmador = {
  clave: "VENTAS",
  etiqueta: "Ventas",
  pregunta: "",
  columnas: [
    { clave: "fecha", etiqueta: "Fecha", tipo: "FECHA", filtro: null, valores: null, conCatalogo: false, agrupable: true, inicial: true, suma: false },
    { clave: "cliente", etiqueta: "Cliente", tipo: "TEXTO", filtro: "LISTA", valores: null, conCatalogo: true, agrupable: true, inicial: true, suma: false },
    { clave: "estado", etiqueta: "Estado", tipo: "TEXTO", filtro: "LISTA", valores: ["EMITIDA", "ANULADA"], conCatalogo: false, agrupable: true, inicial: false, suma: false },
    { clave: "total", etiqueta: "Total", tipo: "DINERO", filtro: "RANGO", valores: null, conCatalogo: false, agrupable: false, inicial: true, suma: true },
  ],
};

describe("el armador en la pantalla", () => {
  it("se parte de las columnas iniciales y el mes pasado, nunca de cero", () => {
    expect(definicionInicial(VENTAS)).toEqual({
      origen: "VENTAS",
      columnas: ["fecha", "cliente", "total"],
      fechas: { atajo: "MES_PASADO" },
      filtros: [],
      agrupar: [],
      orden: null,
    });
  });

  it("la plata va en pesos enteros; las cantidades, con decimales si los hay", () => {
    expect(celda("1284500", "DINERO")).toBe("$ 1.284.500");
    expect(celda("1284500.5", "DINERO")).toBe("$ 1.284.501");
    expect(celda("2.5", "CANTIDAD")).toBe("2,50");
    expect(celda("12", "CANTIDAD")).toBe("12");
    expect(celda(null, "DINERO")).toBe("—");
    expect(celda("2026-08-04", "FECHA")).toBe("4 ago 2026");
  });

  it("el resumen dice los filtros en palabras", () => {
    const texto = resumenEnPalabras(
      {
        ...definicionInicial(VENTAS),
        filtros: [
          { columna: "cliente", forma: "LISTA", valores: ["A", "B", "C"] },
          { columna: "estado", forma: "LISTA", valores: ["EMITIDA"] },
          { columna: "total", forma: "RANGO", minimo: 1000000, maximo: null },
        ],
        agrupar: ["cliente", "estado"],
      },
      VENTAS,
      { desde: "2026-08-01", hasta: "2026-08-31" },
    );
    expect(texto).toBe(
      "Ventas del 1 al 31 de agosto de 2026, cliente: 3 elegidos, estado: EMITIDA, total desde $ 1.000.000, agrupado por cliente y estado",
    );
  });
});
