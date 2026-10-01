import { describe, expect, it } from "vitest";

import type { PropuestaRenta } from "@/modules/retenciones/types/retenciones.types";
import { problemaDelAnticipo, retencionDelAnticipo, salePlata } from "./comprobante";

const propuesta = (cambios: Partial<PropuestaRenta> = {}): PropuestaRenta => ({
  decision: "CALCULADA",
  motivo: "",
  renglones: [],
  retenciones: [],
  sinRetener: [],
  pendientes: 0,
  conceptos: [],
  ...cambios,
});

const retencion = (impuesto: "RENTA" | "IVA", valor: number, asumida = false) =>
  ({ impuesto, valor, asumida }) as PropuestaRenta["retenciones"][number];

describe("comprobante de egreso: el anticipo", () => {
  it("retiene solo la renta que baja lo que se le paga", () => {
    const p = propuesta({
      retenciones: [retencion("RENTA", 50_000), retencion("IVA", 9_500), retencion("RENTA", 1_000, true)],
    });
    expect(retencionDelAnticipo(p)).toBe(50_000);
    expect(salePlata(1_000_000, 2_000_000, 50_000)).toBe(2_950_000);
  });

  it("no deja entregarlo mientras el motor pide algo", () => {
    expect(problemaDelAnticipo(undefined, true)).toMatch(/Calculando/);
    expect(problemaDelAnticipo(propuesta({ decision: "REVISION", motivo: "Falta el perfil." }), false)).toMatch(
      /Falta el perfil/,
    );
    expect(problemaDelAnticipo(propuesta({ pendientes: 1 }), false)).toMatch(/concepto/);
    expect(problemaDelAnticipo(propuesta(), false)).toBeNull();
  });
});
