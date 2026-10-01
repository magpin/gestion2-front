import { describe, expect, it } from "vitest";

import { agruparPorSemana, gmfDe, lunesDe, proyectarCuentas } from "./semanas";

describe("programados por semana", () => {
  it("la semana arranca el lunes (E24)", () => {
    // El lunes 28 de septiembre de 2026.
    expect(lunesDe("2026-09-28")).toBe("2026-09-28");
    expect(lunesDe("2026-10-04")).toBe("2026-09-28");
    expect(lunesDe("2026-10-05")).toBe("2026-10-05");
  });

  it("vencidos, esta semana, la próxima y lo demás por mes", () => {
    const g = agruparPorSemana(
      [
        { fecha: "2026-10-20", valor: 1_714_000 },
        { fecha: "2026-09-30", valor: 4_860_000 },
        { fecha: "2026-10-08", valor: 9_748_200 },
        { fecha: "2026-09-25", valor: 100_000 },
        { fecha: "2026-10-01", valor: 2_800_000 },
      ],
      "2026-09-29",
    );
    expect(g.map((x) => [x.titulo, x.rango, x.total])).toEqual([
      ["Ya pasó la fecha", "", 100_000],
      ["Esta semana", "28 sep al 4 oct", 7_660_000],
      ["Próxima semana", "5 oct al 11 oct", 9_748_200],
      ["Más adelante en octubre", "", 1_714_000],
    ]);
    expect(g[1].items.map((i) => i.fecha)).toEqual(["2026-09-30", "2026-10-01"]);
  });

  it("otro año lo dice", () => {
    const g = agruparPorSemana([{ fecha: "2027-01-20", valor: 1 }], "2026-12-01");
    expect(g[0].titulo).toBe("Más adelante en enero de 2027");
  });
});

describe("cómo quedan las cuentas", () => {
  it("resta los pagos de cada cuenta con su 4×1000 (E27)", () => {
    expect(gmfDe(1_000_000, false)).toBe(4_000);
    expect(gmfDe(1_000_000, true)).toBe(0);
    const p = proyectarCuentas(
      [
        { id: "bc", saldo: 32_480_000, exentaGmf: false },
        { id: "dv", saldo: 14_180_000, exentaGmf: true },
      ],
      [
        { fecha: "2026-09-30", valor: 4_860_000, cuentaId: "bc" },
        { fecha: "2026-10-01", valor: 2_800_000, cuentaId: "bc" },
        { fecha: "2026-10-06", valor: 615_400, cuentaId: "dv" },
        { fecha: "2026-10-06", valor: 50_000, cuentaId: null },
      ],
    );
    expect(p[0]).toEqual({ cuentaId: "bc", hoy: 32_480_000, queda: 32_480_000 - 7_660_000 - 30_640, hasta: "2026-10-01", gmf: 30_640 });
    expect(p[1].queda).toBe(14_180_000 - 615_400);
    expect(p[1].gmf).toBe(0);
  });
});
