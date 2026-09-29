import { describe, expect, it } from "vitest";

import { lineaVacia, type LineaBorrador } from "../components/EditorLineas";
import type { CuentaEmpresa } from "@/modules/plan-cuentas/types/plan-cuentas.types";
import { aLineasNuevas, problemaDelAsiento } from "./asiento-nuevo";

const cuenta = (codigo: string, extra: Partial<CuentaEmpresa> = {}): CuentaEmpresa => ({
  id: `c-${codigo}`,
  codigo,
  nombre: codigo,
  codigo_puc: codigo,
  naturaleza: "DEBITO",
  codigo_padre: null,
  es_auxiliar: true,
  exige_tercero: false,
  exige_centro_costo: false,
  exige_base_gravable: false,
  activa: true,
  puc_nombre: codigo,
  puc_nivel: 6,
  puc_rango_libre: false,
  ...extra,
});

const linea = (c: CuentaEmpresa | null, debito: string, credito: string): LineaBorrador => ({
  ...lineaVacia(),
  cuenta: c,
  debito,
  credito,
});

const base = { comprobanteTipoId: "cd", glosa: "Depreciación de septiembre" };

describe("problemaDelAsiento", () => {
  it("un asiento que cuadra está listo", () => {
    const lineas = [linea(cuenta("516020"), "412500", ""), linea(cuenta("159220"), "", "412500")];
    expect(problemaDelAsiento({ ...base, lineas })).toBeNull();
  });

  it("dice qué falta, en orden", () => {
    expect(problemaDelAsiento({ ...base, comprobanteTipoId: "", lineas: [] })).toMatch(/tipo de comprobante/);
    expect(problemaDelAsiento({ ...base, glosa: "x", lineas: [] })).toMatch(/glosa/);
    const sinCuenta = [linea(null, "1", ""), linea(cuenta("1105"), "", "1")];
    expect(problemaDelAsiento({ ...base, lineas: sinCuenta })).toMatch(/Falta la cuenta en la línea 1/);
    const noCuadra = [linea(cuenta("5160"), "10", ""), linea(cuenta("1592"), "", "9")];
    expect(problemaDelAsiento({ ...base, lineas: noCuadra })).toMatch(/no cuadra/);
  });

  it("pide el tercero donde la cuenta lo exige", () => {
    const lineas = [linea(cuenta("130505", { exige_tercero: true }), "5", ""), linea(cuenta("4135"), "", "5")];
    expect(problemaDelAsiento({ ...base, lineas })).toMatch(/tercero/);
  });
});

describe("aLineasNuevas", () => {
  it("los vacíos viajan como ausentes", () => {
    const [l] = aLineasNuevas([linea(cuenta("516020"), "412500", "")]);
    expect(l).toEqual({
      cuentaId: "c-516020",
      terceroId: undefined,
      centroCostoId: undefined,
      baseGravable: undefined,
      detalle: undefined,
      debito: 412500,
      credito: 0,
    });
  });
});
