import { describe, expect, it } from "vitest";

import { periodosCertificado } from "./CertificadoTercero";

describe("periodosCertificado", () => {
  it("año pasado, este año hasta hoy y el último bimestre cerrado", () => {
    const p = periodosCertificado(new Date(2026, 8, 26)); // 26-sep-2026
    expect(p.map((x) => [x.desde, x.hasta])).toEqual([
      ["2025-01-01", "2025-12-31"],
      ["2026-01-01", "2026-09-26"],
      ["2026-07-01", "2026-08-31"],
    ]);
  });

  it("en enero, el bimestre cerrado es noviembre–diciembre del año anterior", () => {
    const [, , bimestre] = periodosCertificado(new Date(2027, 0, 10));
    expect([bimestre.desde, bimestre.hasta]).toEqual([
      "2026-11-01",
      "2026-12-31",
    ]);
  });
});
